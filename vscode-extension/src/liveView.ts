import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { LiveService, LiveSession } from './live';
import { liveViewHtml } from './liveViewHtml';
import { ITEM_KEY, LiveChanges, LiveSnapshot, parseCountInput, parseVariableInput, SELF_SWITCH_KEY } from './liveState';
import { DbKind, padId } from './db/database';
import { eventId, MapEvent } from './db/describe';
import { PageSummary } from './db/eventPages';
import { placeFromKey, placeLabel } from './placeLabel';
import { RunningFrame, RunTracker, openRunningText, openText, setOpenRunningText } from './runHighlight';

export const LIVE_VIEW_ID = 'text2frame.liveValues';

const REPAINT = 150;
const STATUS_CHECK = 1000;

export const LIVE_TAB_TYPE = 'text2frameLive';

interface LiveHost {
    webview: vscode.Webview;
    visible: () => boolean;
    namesFor?: { gameRoot: string; db: unknown };
    eventsFor?: { gameRoot: string; mapId: number; events: unknown; db: unknown };
}

class LiveViewProvider implements vscode.WebviewViewProvider, vscode.WebviewPanelSerializer {
    private readonly hosts = new Set<LiveHost>();
    private tab?: vscode.WebviewPanel;
    private lastPost = 0;
    private lastStatus = '';
    private timer?: NodeJS.Timeout;

    constructor(private readonly service: DatabaseService, private readonly live: LiveService, private readonly tracker: RunTracker) {}

    private broadcast(message: unknown): void {
        this.hosts.forEach((host) => { host.webview.postMessage(message); });
    }

    options(): void {
        this.broadcast({ type: 'options', openRunning: openRunningText() });
    }

    running(frames: RunningFrame[] = this.tracker.current()): void {
        const inner = frames[frames.length - 1];
        const event = inner ? /^e:(\d+):(\d+):/.exec(inner.key) : null;
        this.broadcast({
            type: 'running',
            frames: frames.map((f) => ({ label: f.label, line: f.from !== undefined ? f.from + 1 : null, exact: f.exact, found: !!f.uri, problem: f.problem || '' })),
            event: event ? [Number(event[1]), Number(event[2])] : null
        });
    }

    private attach(webview: vscode.Webview, visible: () => boolean): LiveHost {
        const host: LiveHost = { webview, visible };
        this.hosts.add(host);
        this.lastStatus = '';
        webview.options = { enableScripts: true };
        webview.html = liveViewHtml();
        webview.onDidReceiveMessage((m) => this.receive(host, m));
        return host;
    }

    resolveWebviewView(view: vscode.WebviewView): void {
        const host = this.attach(view.webview, () => view.visible);
        view.onDidChangeVisibility(() => { if (view.visible) this.post(false); });
        view.onDidDispose(() => { this.hosts.delete(host); });
    }

    async deserializeWebviewPanel(panel: vscode.WebviewPanel): Promise<void> {
        this.adoptTab(panel);
    }

    private adoptTab(panel: vscode.WebviewPanel): void {
        this.tab?.dispose();
        this.tab = panel;
        const host = this.attach(panel.webview, () => panel.visible);
        panel.onDidChangeViewState(() => { if (panel.visible) this.post(false); });
        panel.onDidDispose(() => {
            this.hosts.delete(host);
            if (this.tab === panel) this.tab = undefined;
        });
    }

    openTab(): void {
        if (this.tab) {
            this.tab.reveal();
            return;
        }
        this.adoptTab(vscode.window.createWebviewPanel(LIVE_TAB_TYPE, 'デバッグメニュー', vscode.ViewColumn.Beside, { retainContextWhenHidden: true }));
    }

    async show(): Promise<void> {
        if (this.tab) this.tab.reveal(undefined, true);
        else await vscode.commands.executeCommand(`${LIVE_VIEW_ID}.focus`);
    }

    changed(): void {
        if (this.timer) return;
        this.timer = setTimeout(() => { this.timer = undefined; this.post(true); }, REPAINT);
    }

    checkStatus(): void {
        if (Array.from(this.hosts).some((h) => h.visible()) && this.statusOf(this.live.current()) !== this.lastStatus) this.post(true);
    }

    dispose(): void {
        clearTimeout(this.timer);
        this.tab?.dispose();
    }

    private statusOf(session: LiveSession | undefined): 'live' | 'stale' | 'none' {
        if (!session || !session.state.received()) return 'none';
        return session.state.connected(Date.now()) ? 'live' : 'stale';
    }

    private post(flash: boolean): void {
        if (!this.hosts.size) return;
        const session = this.live.current();
        const ctx = session ? this.service.forRoot(session.projectRoot) : undefined;
        const status = this.statusOf(session);
        const now = Date.now();
        const snapshot: LiveSnapshot = session ? session.state.snapshot() : { switches: [], variables: [], selfSwitches: [], items: [], gold: 0, actors: [], pages: [], mapId: 0 };
        const changed: LiveChanges = session && flash ? session.state.changedSince(this.lastPost) : { switches: [], variables: [], selfSwitches: [], items: [], gold: false };
        const values = {
            type: 'values',
            status,
            project: session ? path.basename(session.gameRoot) : '',
            switches: snapshot.switches,
            variables: snapshot.variables,
            selfSwitches: snapshot.selfSwitches,
            selfLabels: ctx ? this.selfLabels(ctx, snapshot.selfSwitches) : {},
            items: snapshot.items,
            gold: snapshot.gold,
            actors: snapshot.actors,
            pages: snapshot.pages,
            mapId: snapshot.mapId,
            changed
        };
        let names: unknown;
        let events: { events: Array<MapEvent | null> | undefined; message: unknown } | undefined;
        for (const host of this.hosts) {
            if (session && ctx && (!host.namesFor || host.namesFor.gameRoot !== session.gameRoot || host.namesFor.db !== ctx.db)) {
                names = names || this.namesMessage(ctx);
                host.webview.postMessage(names);
                host.namesFor = { gameRoot: session.gameRoot, db: ctx.db };
            }
            if (session && ctx) {
                const mapId = snapshot.mapId;
                const current = mapId > 0 ? this.service.mapEvents(ctx, mapId) : undefined;
                const last = host.eventsFor;
                if (!last || last.gameRoot !== session.gameRoot || last.mapId !== mapId || last.events !== current || last.db !== ctx.db) {
                    events = events || { events: current, message: this.eventsMessage(ctx, mapId, current) };
                    host.webview.postMessage(events.message);
                    host.eventsFor = { gameRoot: session.gameRoot, mapId, events: current, db: ctx.db };
                }
            }
            host.webview.postMessage(values);
        }
        this.lastPost = now;
        this.lastStatus = status;
    }

    private namesMessage(ctx: DbContext): unknown {
        const names = (kind: DbKind): string[] => {
            const out = [''];
            for (const e of ctx.db.entries(kind)) out[e.id] = e.name;
            return out;
        };
        return {
            type: 'names',
            switches: names('switch'),
            variables: names('variable'),
            items: { i: names('item'), w: names('weapon'), a: names('armor') },
            actors: names('actor'),
            currencyUnit: ctx.db.system.currencyUnit || ''
        };
    }

    private mapName(ctx: DbContext, mapId: number): string {
        const map = ctx.db.lookup('map', mapId);
        return map.status === 'named' ? map.name : `マップ${padId(mapId)}`;
    }

    private eventsMessage(ctx: DbContext, mapId: number, events: Array<MapEvent | null> | undefined): unknown {
        const list: Array<[number, string, number, number, string[], PageSummary[]]> = [];
        (events || []).forEach((e, id) => { if (e && id > 0) list.push([id, e.name, e.x, e.y, e.selfSwitches || [], e.pageSummaries || []]); });
        return { type: 'events', mapId, mapName: mapId > 0 ? this.mapName(ctx, mapId) : '', events: list };
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

    private async openEvent(mapId: number, eventNo: number, chosen?: number): Promise<void> {
        const session = this.live.current();
        const ctx = session ? this.service.forRoot(session.projectRoot) : undefined;
        if (!session || !ctx) return;
        const prefix = `e:${mapId}:${eventNo}:`;
        const running = this.tracker.current().slice().reverse().find((f) => f.key.startsWith(prefix) && f.uri);
        let page = chosen ?? (running ? Number(running.key.slice(prefix.length)) : session.state.mapId === mapId ? session.state.eventPage(eventNo) : undefined);
        if (!page) {
            const count = this.service.mapEvents(ctx, mapId)?.[eventNo]?.pages ?? 1;
            if (count <= 1) {
                page = 1;
            } else {
                const pick = await vscode.window.showQuickPick(
                    Array.from({ length: count }, (_v, i) => ({ label: `${i + 1}ページ`, page: i + 1 })),
                    { placeHolder: `${placeLabel(this.service, ctx, { kind: 'event', mapId, eventId: eventNo })} のどのページを開きますか` }
                );
                if (!pick) return;
                page = pick.page;
            }
        }
        const key = prefix + page;
        const here = running && running.key === key ? running : undefined;
        const file = here?.uri?.fsPath ?? await this.tracker.textFor(ctx, key);
        if (!file) {
            this.notice(`${placeLabel(this.service, ctx, placeFromKey(key))} のテキストが見つかりません。`);
            return;
        }
        await openText(vscode.Uri.file(file), here?.from ?? 0);
    }

    private notice(text: string): void {
        this.broadcast({ type: 'notice', text });
    }

    private receive(host: LiveHost, m: any): void {
        if (!m || typeof m !== 'object') return;
        if (m.type === 'ready') {
            host.namesFor = undefined;
            host.eventsFor = undefined;
            this.post(false);
            this.running();
            this.options();
            return;
        }
        if (m.type === 'openRunning' && typeof m.value === 'boolean') {
            setOpenRunningText(m.value);
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
        if (m.type === 'openEvent' && Number.isInteger(m.mapId) && Number.isInteger(m.eventId) && m.mapId > 0 && m.eventId > 0) {
            this.openEvent(m.mapId, m.eventId, Number.isInteger(m.page) && m.page > 0 ? m.page : undefined);
            return;
        }
        if (m.type !== 'set') return;
        const selfSwitch = m.kind === 'selfSwitch' && typeof m.key === 'string' && SELF_SWITCH_KEY.test(m.key) && typeof m.value === 'boolean';
        const item = m.kind === 'item' && typeof m.key === 'string' && ITEM_KEY.test(m.key) && typeof m.text === 'string';
        const gold = m.kind === 'gold' && typeof m.text === 'string';
        if (!selfSwitch && !item && !gold && (!Number.isInteger(m.id) || m.id < 1)) return;
        const session = this.live.current();
        if (!session || this.statusOf(session) !== 'live') {
            this.notice('テストプレイ中だけ書き換えられます。');
            return;
        }
        let delivered = 0;
        if (selfSwitch) {
            delivered = session.send({ selfSwitches: { [m.key]: m.value } });
        } else if (item || gold) {
            const input = parseCountInput(m.text);
            if ('error' in input) {
                this.notice(input.error);
                return;
            }
            delivered = session.send(gold ? { gold: input.value } : { items: { [m.key]: input.value } });
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
        vscode.window.registerWebviewPanelSerializer(LIVE_TAB_TYPE, provider),
        vscode.commands.registerCommand('text2frame.showLiveValues', () => provider.show()),
        vscode.commands.registerCommand('text2frame.openLiveValuesTab', () => provider.openTab()),
        live.onDidChange(() => provider.changed()),
        service.onDidChange(() => provider.changed()),
        tracker.onDidChange((frames) => provider.running(frames)),
        vscode.workspace.onDidChangeConfiguration((e) => { if (e.affectsConfiguration('text2frame.openRunningText')) provider.options(); }),
        { dispose: () => { clearInterval(statusTimer); provider.dispose(); } }
    );
}
