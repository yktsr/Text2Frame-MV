import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { LiveService, LiveSession } from './live';
import { liveViewHtml } from './liveViewHtml';
import { parseVariableInput, SELF_SWITCH_KEY } from './liveState';
import { padId } from './db/database';
import { eventId } from './db/describe';
import { RunningFrame, RunTracker } from './runHighlight';

export const LIVE_VIEW_ID = 'text2frame.liveValues';

const REPAINT = 150;
const STATUS_CHECK = 1000;

class LiveViewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private namesFor?: { gameRoot: string; db: unknown };
    private eventsFor?: { gameRoot: string; mapId: number; events: unknown; db: unknown };
    private lastPost = 0;
    private lastStatus = '';
    private timer?: NodeJS.Timeout;

    constructor(private readonly service: DatabaseService, private readonly live: LiveService, private readonly tracker: RunTracker) {}

    running(frames: RunningFrame[] = this.tracker.current()): void {
        const inner = frames[frames.length - 1];
        const event = inner ? /^e:(\d+):(\d+):/.exec(inner.key) : null;
        this.view?.webview.postMessage({
            type: 'running',
            frames: frames.map((f) => ({ label: f.label, line: f.from !== undefined ? f.from + 1 : null, exact: f.exact, found: !!f.uri, problem: f.problem || '' })),
            event: event ? [Number(event[1]), Number(event[2])] : null
        });
    }

    resolveWebviewView(view: vscode.WebviewView): void {
        this.view = view;
        this.namesFor = undefined;
        this.eventsFor = undefined;
        this.lastStatus = '';
        view.webview.options = { enableScripts: true };
        view.webview.html = liveViewHtml();
        view.webview.onDidReceiveMessage((m) => this.receive(m));
        view.onDidChangeVisibility(() => { if (view.visible) this.post(false); });
        view.onDidDispose(() => { this.view = undefined; });
    }

    changed(): void {
        if (this.timer) return;
        this.timer = setTimeout(() => { this.timer = undefined; this.post(true); }, REPAINT);
    }

    checkStatus(): void {
        if (this.view?.visible && this.statusOf(this.live.current()) !== this.lastStatus) this.post(true);
    }

    dispose(): void {
        clearTimeout(this.timer);
    }

    private statusOf(session: LiveSession | undefined): 'live' | 'stale' | 'none' {
        if (!session || !session.state.received()) return 'none';
        return session.state.connected(Date.now()) ? 'live' : 'stale';
    }

    private post(flash: boolean): void {
        const view = this.view;
        if (!view) return;
        const session = this.live.current();
        const ctx = session ? this.service.forRoot(session.projectRoot) : undefined;
        if (session && ctx && (!this.namesFor || this.namesFor.gameRoot !== session.gameRoot || this.namesFor.db !== ctx.db)) {
            const names = (kind: 'switch' | 'variable'): string[] => {
                const out = [''];
                for (const e of ctx.db.entries(kind)) out[e.id] = e.name;
                return out;
            };
            view.webview.postMessage({ type: 'names', switches: names('switch'), variables: names('variable') });
            this.namesFor = { gameRoot: session.gameRoot, db: ctx.db };
        }
        const status = this.statusOf(session);
        const now = Date.now();
        const snapshot = session ? session.state.snapshot() : { switches: [], variables: [], selfSwitches: [], mapId: 0 };
        if (session && ctx) this.postEvents(view, session, ctx, snapshot.mapId);
        const changed = session && flash ? session.state.changedSince(this.lastPost) : { switches: [], variables: [], selfSwitches: [] };
        view.webview.postMessage({
            type: 'values',
            status,
            project: session ? path.basename(session.gameRoot) : '',
            switches: snapshot.switches,
            variables: snapshot.variables,
            selfSwitches: snapshot.selfSwitches,
            selfLabels: ctx ? this.selfLabels(ctx, snapshot.selfSwitches) : {},
            mapId: snapshot.mapId,
            changed
        });
        this.lastPost = now;
        this.lastStatus = status;
    }

    private mapName(ctx: DbContext, mapId: number): string {
        const map = ctx.db.lookup('map', mapId);
        return map.status === 'named' ? map.name : `マップ${padId(mapId)}`;
    }

    private postEvents(view: vscode.WebviewView, session: LiveSession, ctx: DbContext, mapId: number): void {
        const events = mapId > 0 ? this.service.mapEvents(ctx, mapId) : undefined;
        const last = this.eventsFor;
        if (last && last.gameRoot === session.gameRoot && last.mapId === mapId && last.events === events && last.db === ctx.db) return;
        const list: Array<[number, string, number, number]> = [];
        (events || []).forEach((e, id) => { if (e && id > 0) list.push([id, e.name, e.x, e.y]); });
        view.webview.postMessage({ type: 'events', mapId, mapName: mapId > 0 ? this.mapName(ctx, mapId) : '', events: list });
        this.eventsFor = { gameRoot: session.gameRoot, mapId, events, db: ctx.db };
    }

    private selfLabels(ctx: DbContext, keys: string[]): Record<string, string> {
        const out: Record<string, string> = {};
        for (const key of keys) {
            const [m, e] = key.split(',').map(Number);
            const group = `${m},${e}`;
            if (out[group] !== undefined) continue;
            const ev = this.service.mapEvents(ctx, m)?.[e];
            out[group] = `${this.mapName(ctx, m)}${ev && ev.name && ev.name !== eventId(e) ? ' / ' + ev.name : ''}`;
        }
        return out;
    }

    private notice(text: string): void {
        this.view?.webview.postMessage({ type: 'notice', text });
    }

    private receive(m: any): void {
        if (!m || typeof m !== 'object') return;
        if (m.type === 'ready') {
            this.namesFor = undefined;
            this.eventsFor = undefined;
            this.post(false);
            this.running();
            return;
        }
        if (m.type === 'revealRunning') {
            vscode.commands.executeCommand('text2frame.revealRunning', Number.isInteger(m.index) ? m.index : undefined);
            return;
        }
        if (m.type === 'testPlay') {
            vscode.commands.executeCommand('text2frame.testPlay');
            return;
        }
        if (m.type !== 'set') return;
        const selfSwitch = m.kind === 'selfSwitch' && typeof m.key === 'string' && SELF_SWITCH_KEY.test(m.key) && typeof m.value === 'boolean';
        if (!selfSwitch && (!Number.isInteger(m.id) || m.id < 1)) return;
        const session = this.live.current();
        if (!session || this.statusOf(session) !== 'live') {
            this.notice('テストプレイ中だけ書き換えられます。');
            return;
        }
        let delivered = 0;
        if (selfSwitch) {
            delivered = session.send({ selfSwitches: { [m.key]: m.value } });
        } else if (m.kind === 'switch' && typeof m.value === 'boolean') {
            delivered = session.send({ switches: { [m.id]: m.value } });
        } else if (m.kind === 'variable' && typeof m.text === 'string') {
            const input = parseVariableInput(m.text);
            if ('error' in input) {
                this.notice(input.error);
                return;
            }
            delivered = session.send({ variables: { [m.id]: input.value } });
        } else {
            return;
        }
        if (delivered === 0) this.notice('ゲームに届きませんでした。テストプレイのページを読み直してください。');
    }
}

export function registerLiveView(context: vscode.ExtensionContext, service: DatabaseService, live: LiveService, tracker: RunTracker): void {
    const provider = new LiveViewProvider(service, live, tracker);
    const statusTimer = setInterval(() => provider.checkStatus(), STATUS_CHECK);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(LIVE_VIEW_ID, provider, { webviewOptions: { retainContextWhenHidden: true } }),
        vscode.commands.registerCommand('text2frame.showLiveValues', () => vscode.commands.executeCommand(`${LIVE_VIEW_ID}.focus`)),
        live.onDidChange(() => provider.changed()),
        service.onDidChange(() => provider.changed()),
        tracker.onDidChange((frames) => provider.running(frames)),
        { dispose: () => { clearInterval(statusTimer); provider.dispose(); } }
    );
}
