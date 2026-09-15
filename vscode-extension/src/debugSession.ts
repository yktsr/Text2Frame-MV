import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { LiveService, LiveSession } from './live';
import { RunTracker } from './runHighlight';
import { parseFrontMatter, mapPathFor, commonEventsPathFor } from './compiler';
import { placeFromKey, placeLabel } from './placeLabel';
import { formatLiveValue, parseVariableInput, selfSwitchKey, RunFrame } from './liveState';
import { alignCommands, commandLines, commandMark, locateCommand, CommandMark } from './db/runLines';
import { breakpointAt, readWatch } from './db/breakpoints';
import { pageList } from './dryRun';
import { DbKind, padId } from './db/database';

/**
 * VS Code の「実行とデバッグ」で、テストプレイを調べる。
 * テキストの行に付けたブレークポイントで止まり、呼び出し元の一覧・変数の欄・1行ずつ進めるが使える。
 * 赤い停止ボタンは、テストプレイを止める(「テストプレイを止める」と同じ)。
 */

export const DEBUG_TYPE = 'text2frame';
const DEFAULT_CONFIG: vscode.DebugConfiguration = { type: DEBUG_TYPE, request: 'launch', name: 'Text2Frame テストプレイ' };
const CONNECT_WAIT = 40000;
const REFS = { switches: 1, variables: 2, self: 3, party: 4 };

interface Request {
    seq: number;
    command: string;
    arguments?: any;
}

interface FileBreakpoints {
    key?: string;
    indices: number[];
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function keyOf(text: string): string | undefined {
    const meta = parseFrontMatter(text).meta;
    if (meta.kind === 'common') return meta.commonEventId ? `c:${Number(meta.commonEventId)}` : undefined;
    return meta.mapId && meta.eventId ? `e:${Number(meta.mapId)}:${Number(meta.eventId)}:${Number(meta.pageId || '1')}` : undefined;
}

function readText(file: string): string | undefined {
    const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === file);
    if (open) return open.getText();
    try {
        return fs.readFileSync(file, 'utf8');
    } catch (e) {
        return undefined;
    }
}

function dataMarks(ctx: DbContext, key: string): CommandMark[] | undefined {
    const place = placeFromKey(key);
    if (!place) return undefined;
    const file = place.kind === 'common' ? commonEventsPathFor(ctx.root) : mapPathFor(ctx.root, place.mapId);
    let json: unknown;
    try {
        json = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, path.basename(file)), 'utf8'));
    } catch (e) {
        return undefined;
    }
    const list = place.kind === 'common'
        ? pageList(json, { kind: 'common', commonEventId: String(place.commonEventId) })
        : pageList(json, { kind: 'event', eventId: String(place.eventId), pageId: String(place.pageId || 1) });
    return list ? (list as Parameters<typeof commandMark>[0][]).map(commandMark) : undefined;
}

class Text2FrameDebugAdapter implements vscode.DebugAdapter {
    private readonly emitter = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
    readonly onDidSendMessage = this.emitter.event;
    private seq = 1;
    private base = 1;
    private readonly files = new Map<string, FileBreakpoints>();
    private pushedResets = -1;
    private stoppedAt = 0;
    private stopped = false;
    private ended = false;
    private readonly partyKeys = new Map<string, string>();
    private readonly disposables: vscode.Disposable[] = [];

    constructor(private readonly service: DatabaseService, private readonly live: LiveService, private readonly tracker: RunTracker) {
        this.disposables.push(
            live.onDidChangeDebug(() => this.debugChanged()),
            live.onDidChange(() => this.sessionChanged())
        );
    }

    private session(): LiveSession | undefined {
        const s = this.live.current();
        return s && s.state.received() && s.state.connected(Date.now()) ? s : undefined;
    }

    private context(): DbContext | undefined {
        const s = this.live.current();
        return s ? this.service.forRoot(s.projectRoot) : undefined;
    }

    private send(message: Record<string, unknown>): void {
        this.emitter.fire({ ...message, seq: this.seq++ } as vscode.DebugProtocolMessage);
    }

    private respond(request: Request, body?: unknown, error?: string): void {
        this.send({ type: 'response', request_seq: request.seq, command: request.command, success: !error, message: error, body: body || {} });
    }

    private event(event: string, body?: unknown): void {
        this.send({ type: 'event', event, body: body || {} });
    }

    handleMessage(message: vscode.DebugProtocolMessage): void {
        const request = message as unknown as Request;
        this.dispatch(request).catch((e) => this.respond(request, undefined, e instanceof Error ? e.message : String(e)));
    }

    dispose(): void {
        this.disposables.forEach((d) => d.dispose());
        this.emitter.dispose();
    }

    private async dispatch(request: Request): Promise<void> {
        const args = request.arguments || {};
        switch (request.command) {
            case 'initialize':
                this.base = args.linesStartAt1 === false ? 0 : 1;
                this.respond(request, {
                    supportsConfigurationDoneRequest: true,
                    supportsSetVariable: true,
                    supportsTerminateRequest: true,
                    supportsEvaluateForHovers: false
                });
                this.event('initialized');
                return;
            case 'launch':
            case 'attach':
                await this.connect();
                this.respond(request);
                return;
            case 'setBreakpoints':
                this.respond(request, { breakpoints: this.setBreakpoints(String(args.source && args.source.path || ''), (args.breakpoints || []).map((b: { line: number }) => b.line - this.base)) });
                this.push();
                return;
            case 'configurationDone':
                this.respond(request);
                return;
            case 'threads':
                this.respond(request, { threads: [{ id: 1, name: 'イベント' }] });
                return;
            case 'stackTrace': {
                const frames = await this.stack();
                this.respond(request, { stackFrames: frames, totalFrames: frames.length });
                return;
            }
            case 'scopes':
                this.respond(request, {
                    scopes: [
                        { name: 'スイッチ', variablesReference: REFS.switches, expensive: false },
                        { name: '変数', variablesReference: REFS.variables, expensive: false },
                        { name: 'セルフスイッチ(このイベント)', variablesReference: REFS.self, expensive: false },
                        { name: '所持金とアイテム', variablesReference: REFS.party, expensive: false }
                    ]
                });
                return;
            case 'variables':
                this.respond(request, { variables: this.variables(Number(args.variablesReference)) });
                return;
            case 'setVariable':
                this.respond(request, { value: this.setVariable(Number(args.variablesReference), String(args.name), String(args.value)) });
                return;
            case 'evaluate':
                this.respond(request, ...this.evaluate(String(args.expression || '')));
                return;
            case 'continue':
            case 'next':
            case 'stepIn':
            case 'stepOut': {
                const s = this.session();
                if (s) s.send({ debug: request.command as 'continue' | 'next' | 'stepIn' | 'stepOut' });
                this.respond(request, { allThreadsContinued: true });
                this.stopped = false;
                this.event('continued', { threadId: 1, allThreadsContinued: true });
                return;
            }
            case 'pause': {
                const s = this.session();
                if (s) s.send({ debug: 'pause' });
                this.respond(request);
                return;
            }
            case 'disconnect':
            case 'terminate':
                await this.finish(request.command === 'terminate' || args.terminateDebuggee !== false);
                this.respond(request);
                if (request.command === 'terminate') this.event('terminated');
                return;
            default:
                this.respond(request);
        }
    }

    private async connect(): Promise<void> {
        if (this.session()) return;
        await vscode.commands.executeCommand('text2frame.testPlay');
        const end = Date.now() + CONNECT_WAIT;
        while (Date.now() < end && !this.session()) await wait(200);
        if (!this.session()) throw new Error('テストプレイのゲームとつながりませんでした。');
    }

    private setBreakpoints(file: string, lines: number[]): Array<{ verified: boolean; line: number; message?: string }> {
        const text = readText(file);
        const ctx = this.context() || (text !== undefined ? this.service.forDocument(vscode.workspace.textDocuments.find((d) => d.uri.fsPath === file)) : undefined);
        const key = text !== undefined ? keyOf(text) : undefined;
        const unverified = (line: number, message: string) => ({ verified: false, line: line + this.base, message });
        if (!ctx || !key) {
            this.files.set(file, { indices: [] });
            return lines.map((l) => unverified(l, 'このテキストの宛先(先頭の --- の中)が分かりません。'));
        }
        const source = this.tracker.sourceFor(ctx, file);
        if ('error' in source) {
            this.files.set(file, { key, indices: [] });
            return lines.map((l) => unverified(l, source.error));
        }
        const s = this.live.current();
        const game = (s && s.state.listMarks(key)) || dataMarks(ctx, key);
        if (!game) {
            this.files.set(file, { key, indices: [] });
            return lines.map((l) => unverified(l, 'ゲームのデータに、この場所がありません。反映してください。'));
        }
        const alignment = alignCommands(game, source.marks);
        const indices: number[] = [];
        const results = lines.map((l) => {
            const at = breakpointAt(source.commands, source.lines, alignment, l);
            if ('problem' in at) {
                return unverified(l, at.problem === 'noCommand' ? 'この行から後ろに、コマンドがありません。' : 'ゲームのデータと合いません。反映して、ゲームを読み直してください。');
            }
            indices.push(at.game);
            return { verified: true, line: at.line + this.base };
        });
        this.files.set(file, { key, indices });
        return results;
    }

    private push(force = true): void {
        const s = this.session();
        if (!s) return;
        if (!force && this.pushedResets === s.state.resets) return;
        const table: Record<string, number[]> = {};
        for (const { key, indices } of this.files.values()) {
            if (!key || !indices.length) continue;
            table[key] = (table[key] || []).concat(indices);
        }
        s.send({ breakpoints: table });
        this.pushedResets = s.state.resets;
    }

    private sessionChanged(): void {
        if (this.ended) return;
        if (!this.live.current()) {
            this.ended = true;
            this.event('terminated');
            return;
        }
        this.push(false);
    }

    private debugChanged(): void {
        const s = this.live.current();
        const paused = s && s.state.paused;
        if (paused && paused.at !== this.stoppedAt) {
            this.stoppedAt = paused.at;
            this.stopped = true;
            this.event('stopped', { reason: paused.reason === 'breakpoint' ? 'breakpoint' : paused.reason === 'pause' ? 'pause' : 'step', threadId: 1, allThreadsStopped: true });
        } else if (!paused && this.stopped) {
            this.stopped = false;
            this.event('continued', { threadId: 1, allThreadsContinued: true });
        }
    }

    private async stack(): Promise<unknown[]> {
        const s = this.live.current();
        const ctx = this.context();
        const paused = s && s.state.paused;
        if (!s || !ctx || !paused) return [];
        const frames: RunFrame[] = paused.frames.slice().reverse();
        const out: unknown[] = [];
        for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            const label = placeLabel(this.service, ctx, placeFromKey(f.key));
            const file = await this.tracker.textFor(ctx, f.key);
            const frame: Record<string, unknown> = { id: i + 1, name: label || f.key, line: 0, column: 0 };
            if (file) {
                const source = this.tracker.sourceFor(ctx, file);
                const marks = s.state.listMarks(f.key) || dataMarks(ctx, f.key);
                if (!('error' in source) && marks) {
                    const target = locateCommand(alignCommands(marks, source.marks), f.index);
                    const lines = target ? commandLines(source.commands, source.lines, target.index) : undefined;
                    if (lines) {
                        Object.assign(frame, { line: lines.from + this.base, column: 1, source: { name: path.basename(file), path: file } });
                        if (target && !target.exact) frame.name = `${frame.name}(近い行)`;
                    }
                }
            }
            out.push(frame);
        }
        return out;
    }

    private innermostEvent(): { mapId: number; eventId: number } | undefined {
        const paused = this.live.current()?.state.paused;
        const frames = paused ? paused.frames.slice().reverse() : [];
        for (const f of frames) {
            const m = /^e:(\d+):(\d+):/.exec(f.key);
            if (m) return { mapId: Number(m[1]), eventId: Number(m[2]) };
        }
        return undefined;
    }

    private variables(ref: number): unknown[] {
        const s = this.live.current();
        const ctx = this.context();
        if (!s || !ctx) return [];
        const state = s.state;
        const named = (kind: DbKind, shown: (id: number) => boolean, value: (id: number) => string) =>
            ctx.db.entries(kind).filter((e) => e.name || shown(e.id)).map((e) => ({ name: `${padId(e.id)} ${e.name || '(名前なし)'}`, value: value(e.id), variablesReference: 0 }));
        if (ref === REFS.switches) return named('switch', (id) => state.switchValue(id), (id) => formatLiveValue('switch', state.switchValue(id)));
        if (ref === REFS.variables) return named('variable', (id) => state.variableValue(id) !== 0, (id) => formatLiveValue('variable', state.variableValue(id)));
        if (ref === REFS.self) {
            const ev = this.innermostEvent();
            if (!ev) return [];
            return ['A', 'B', 'C', 'D'].map((letter) => ({ name: letter, value: state.selfSwitchValue(ev.mapId, ev.eventId, letter) ? 'ON' : 'OFF', variablesReference: 0 }));
        }
        if (ref === REFS.party) {
            this.partyKeys.clear();
            const out = [{ name: '所持金', value: String(state.goldValue()), variablesReference: 0 }];
            const kinds: Record<string, DbKind> = { i: 'item', w: 'weapon', a: 'armor' };
            for (const [key, count] of state.snapshot().items) {
                const [k, id] = key.split(':');
                const r = ctx.db.lookup(kinds[k], Number(id));
                const name = `${k === 'i' ? 'アイテム' : k === 'w' ? '武器' : '防具'} ${padId(Number(id))} ${r.status === 'named' ? r.name : ''}`.trim();
                this.partyKeys.set(name, key);
                out.push({ name, value: String(count), variablesReference: 0 });
            }
            return out;
        }
        return [];
    }

    private setVariable(ref: number, name: string, value: string): string {
        const s = this.session();
        if (!s) throw new Error('テストプレイ中だけ書き換えられます。');
        const onOff = (v: string): boolean => {
            if (/^(on|true|1)$/i.test(v.trim())) return true;
            if (/^(off|false|0)$/i.test(v.trim())) return false;
            throw new Error('ON か OFF を入れてください。');
        };
        const id = Number((name.match(/^(\d+)/) || [])[1]);
        if (ref === REFS.switches && id > 0) {
            const on = onOff(value);
            s.send({ switches: { [id]: on } });
            return on ? 'ON' : 'OFF';
        }
        if (ref === REFS.variables && id > 0) {
            const input = parseVariableInput(value);
            if ('error' in input) throw new Error(input.error);
            s.send({ variables: { [id]: input.value } });
            return formatLiveValue('variable', input.value);
        }
        if (ref === REFS.self) {
            const ev = this.innermostEvent();
            if (!ev) throw new Error('イベントが分かりません。');
            const on = onOff(value);
            s.send({ selfSwitches: { [selfSwitchKey(ev.mapId, ev.eventId, name)]: on } });
            return on ? 'ON' : 'OFF';
        }
        if (ref === REFS.party) {
            const n = Number(value.trim());
            if (!Number.isInteger(n) || n < 0) throw new Error('0 以上の整数を入れてください。');
            if (name === '所持金') s.send({ gold: n });
            else if (this.partyKeys.has(name)) s.send({ items: { [this.partyKeys.get(name) as string]: n } });
            return String(n);
        }
        throw new Error('書き換えられません。');
    }

    private evaluate(expression: string): [unknown, string?] {
        const s = this.live.current();
        const target = readWatch(expression);
        if (!s || !target) return [undefined, 'S12(スイッチ12)や V5(変数5)の形で書いてください。'];
        const ctx = this.context();
        const r = ctx ? ctx.db.lookup(target.kind, target.id) : undefined;
        const value = target.kind === 'switch'
            ? formatLiveValue('switch', s.state.switchValue(target.id))
            : formatLiveValue('variable', s.state.variableValue(target.id));
        return [{ result: value + (r && r.status === 'named' ? `  (${r.name})` : ''), variablesReference: 0 }];
    }

    private async finish(stopGame: boolean): Promise<void> {
        const s = this.session();
        if (s) {
            s.send({ breakpoints: {} });
            s.send({ debug: 'continue' });
        }
        this.ended = true;
        if (stopGame) await vscode.commands.executeCommand('text2frame.stopTestPlay');
    }
}

export function registerDebugger(context: vscode.ExtensionContext, service: DatabaseService, live: LiveService, tracker: RunTracker): void {
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory(DEBUG_TYPE, {
            createDebugAdapterDescriptor: () => new vscode.DebugAdapterInlineImplementation(new Text2FrameDebugAdapter(service, live, tracker))
        }),
        vscode.debug.registerDebugConfigurationProvider(DEBUG_TYPE, {
            provideDebugConfigurations: () => [DEFAULT_CONFIG],
            resolveDebugConfiguration: (_folder, config) => (config.type && config.request ? config : { ...DEFAULT_CONFIG })
        }),
        vscode.commands.registerCommand('text2frame.debug', () => vscode.debug.startDebugging(vscode.workspace.workspaceFolders?.[0], DEFAULT_CONFIG))
    );
}
