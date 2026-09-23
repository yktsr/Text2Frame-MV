import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { RunTracker } from './runHighlight';
import { parseFrontMatter, workspaceRootFor } from './compiler';
import { renderCommands } from './exportText';
import { placeFromKey, placeFromMeta, placeKey, placeLabel } from './placeLabel';
import { padId } from './db/database';
import { mapLabel } from './db/mapTree';
import { eventId as eventLabelId } from './db/describe';
import { summarizePages, triggerLabel } from './db/eventPages';
import { scanLines } from './db/tagRefs';
import { scanSelfSwitchLines } from './db/selfSwitchRefs';
import { RpgCommand } from './db/commandRefs';
import { commandMark } from './db/runLines';
import { alignCommands } from './db/runLines';
import { tr } from './db/lang';
import {
    Link, LinkIndex, LinkNode, commandLinks, commonTriggerLinks, conditionLinks, nodeFromKey, nodeKey
} from './db/eventLinks';

/**
 * イベントのつながりを、VS Code の「呼び出し階層」(Shift+Alt+H)で出す。
 *   ここから: 呼ぶコモンイベント・移動先のマップ・ON にするスイッチやセルフスイッチ
 *   ここへ:   誰が呼ぶか・誰がこのページを出すか
 * つながりはゲームのデータ(Map###.json / CommonEvents.json)から読む。
 * 開いているテキストは、書きかけの内容で置き換える。
 */

const SELECTOR: vscode.DocumentSelector = { language: 'text2frame' };
export const LINKS_SCHEME = 'text2frame-links';

/** つながり方の言葉。使うときに今の言語で作る。 */
const howLabels = (): Record<string, string> => ({
    call: tr('呼ぶ', 'calls'),
    transfer: tr('移動する', 'transfers'),
    vehicle: tr('乗り物を置く', 'places a vehicle'),
    switchOn: tr('ON にする', 'turns ON'),
    switchOff: tr('OFF にする', 'turns OFF'),
    variable: tr('変える', 'changes'),
    selfSwitchOn: tr('ON にする', 'turns ON'),
    selfSwitchOff: tr('OFF にする', 'turns OFF'),
    condition: tr('出現条件', 'page condition'),
    trigger: tr('動き出す', 'starts')
});

interface FileLinks {
    mtime: number;
    /** ページ・コモンイベントの中のコマンドから出るつながり(場所の鍵ごと)。 */
    byPlace: Map<string, Link[]>;
    /** 出現条件・トリガーのつながり。 */
    others: Link[];
}

/** ゲームのデータから、つながりを読んでためる。 */
export class LinkService {
    private readonly files = new Map<string, FileLinks>();
    private dataDir = '';

    constructor(private readonly service: DatabaseService, private readonly tracker: RunTracker) {}

    clear(): void {
        this.files.clear();
    }

    /** 今のつながり。開いているテキストは書きかけの内容で置き換える。 */
    index(ctx: DbContext): LinkIndex {
        if (this.dataDir !== ctx.dataDir) {
            this.files.clear();
            this.dataDir = ctx.dataDir;
        }
        const wanted = new Set<string>();
        for (const file of this.dataFiles(ctx)) {
            wanted.add(file);
            this.read(file);
        }
        for (const file of Array.from(this.files.keys())) if (!wanted.has(file)) this.files.delete(file);

        const byPlace = new Map<string, Link[]>();
        const others: Link[] = [];
        for (const entry of this.files.values()) {
            entry.byPlace.forEach((links, key) => byPlace.set(key, links));
            others.push(...entry.others);
        }
        for (const [key, links] of this.openTextLinks(ctx)) byPlace.set(key, links);
        const all: Link[] = others.slice();
        byPlace.forEach((links) => all.push(...links));
        return new LinkIndex(all);
    }

    /** そのページ・コモンイベントのテキスト(あれば)。 */
    textFor(ctx: DbContext, key: string): Promise<string | undefined> {
        return this.tracker.textFor(ctx, key);
    }

    /** その場所を開く先。テキストがあればテキスト、無ければ読むだけの画面。 */
    async uriFor(ctx: DbContext, key: string): Promise<{ uri: vscode.Uri; file?: string }> {
        const node = nodeFromKey(key);
        if (node && (node.kind === 'page' || node.kind === 'common')) {
            const file = await this.textFor(ctx, key);
            if (file) return { uri: vscode.Uri.file(file), file };
        }
        return { uri: readOnlyUri(key) };
    }

    /** ゲームのコマンドの番号 → テキストの行(0 から)。 */
    lineOf(ctx: DbContext, key: string, file: string | undefined, index?: number): number {
        if (file === undefined || index === undefined) return 0;
        const source = this.tracker.sourceFor(ctx, file);
        if ('error' in source) return 0;
        const alignment = alignCommands(this.commandsOf(ctx, key).map(commandMark), source.marks);
        const textIndex = alignment[index];
        return textIndex === undefined ? 0 : source.lines[textIndex] || 0;
    }

    /** ゲームのデータのコマンド。 */
    commandsOf(ctx: DbContext, key: string): RpgCommand[] {
        const node = nodeFromKey(key);
        if (!node) return [];
        if (node.kind === 'common') {
            const list = readJson(path.join(ctx.dataDir, 'CommonEvents.json'));
            const entry = Array.isArray(list) ? list[node.id] : undefined;
            return entry && Array.isArray(entry.list) ? entry.list : [];
        }
        if (node.kind !== 'page') return [];
        const map = readJson(mapPath(ctx, node.mapId));
        const event = map && Array.isArray(map.events) ? map.events[node.eventId] : undefined;
        const page = event && Array.isArray(event.pages) ? event.pages[node.pageId - 1] : undefined;
        return page && Array.isArray(page.list) ? page.list : [];
    }

    private dataFiles(ctx: DbContext): string[] {
        const out: string[] = [];
        let names: string[];
        try {
            names = fs.readdirSync(ctx.dataDir);
        } catch (e) {
            return out;
        }
        for (const name of names) if (/^Map\d+\.json$/.test(name)) out.push(path.join(ctx.dataDir, name));
        const commons = path.join(ctx.dataDir, 'CommonEvents.json');
        if (fs.existsSync(commons)) out.push(commons);
        return out;
    }

    private read(file: string): void {
        let mtime: number;
        try {
            mtime = fs.statSync(file).mtimeMs;
        } catch (e) {
            this.files.delete(file);
            return;
        }
        const hit = this.files.get(file);
        if (hit && hit.mtime === mtime) return;
        const byPlace = new Map<string, Link[]>();
        const others: Link[] = [];
        const json = readJson(file);
        if (path.basename(file) === 'CommonEvents.json') {
            const list = Array.isArray(json) ? json : [];
            const triggers: Array<{ id: number; trigger: number; switchId: number }> = [];
            list.forEach((entry: any, id: number) => {
                if (!entry || id === 0) return;
                const key = nodeKey({ kind: 'common', id });
                byPlace.set(key, commandLinks(key, Array.isArray(entry.list) ? entry.list : []));
                triggers.push({ id, trigger: Number(entry.trigger) || 0, switchId: Number(entry.switchId) || 0 });
            });
            others.push(...commonTriggerLinks(triggers));
        } else {
            const mapId = Number((path.basename(file).match(/^Map(\d+)\.json$/) || [])[1]);
            const events = json && Array.isArray(json.events) ? json.events : [];
            const pages: Array<{ mapId: number; eventId: number; summaries: ReturnType<typeof summarizePages> }> = [];
            events.forEach((event: any, eventId: number) => {
                if (!event || eventId === 0) return;
                (Array.isArray(event.pages) ? event.pages : []).forEach((page: any, index: number) => {
                    const key = nodeKey({ kind: 'page', mapId, eventId, pageId: index + 1 });
                    byPlace.set(key, commandLinks(key, Array.isArray(page && page.list) ? page.list : []));
                });
                pages.push({ mapId, eventId, summaries: summarizePages(event) });
            });
            others.push(...conditionLinks(pages));
        }
        this.files.set(file, { mtime, byPlace, others });
    }

    /** 開いているテキストの、書きかけの内容から読んだつながり。 */
    private openTextLinks(ctx: DbContext): Array<[string, Link[]]> {
        const out: Array<[string, Link[]]> = [];
        for (const doc of vscode.workspace.textDocuments) {
            if (doc.languageId !== 'text2frame' || doc.uri.scheme !== 'file') continue;
            const place = placeFromMeta(parseFrontMatter(doc.getText()).meta);
            const key = place && placeKey(place);
            if (!key) continue;
            const source = this.tracker.sourceFor(ctx, doc.uri.fsPath);
            if ('error' in source) continue;
            out.push([key, commandLinks(key, source.commands)]);
        }
        return out;
    }
}

function readJson(file: string): any {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return undefined;
    }
}

const mapPath = (ctx: DbContext, mapId: number): string => path.join(ctx.dataDir, 'Map' + String(mapId).padStart(3, '0') + '.json');

/** 読むだけの画面(テキストの無いページ・スイッチなど)。 */
/**
 * テキストの無いページ・コモンイベントを読むだけの画面で開く前に、そう知らせる。
 * 開いてよければ true。テキストがある所や、スイッチなどの画面はそのまま true。
 */
export async function confirmNoText(service: DatabaseService, ctx: DbContext, uri: vscode.Uri): Promise<boolean> {
    if (uri.scheme !== LINKS_SCHEME) return true;
    const node = nodeFromKey(uri.query);
    if (!node || (node.kind !== 'page' && node.kind !== 'common')) return true;
    const where = placeLabel(service, ctx, placeFromKey(uri.query));
    const open = tr('開く', 'Open');
    const pick = await vscode.window.showInformationMessage(
        node.kind === 'page'
            ? tr(`このイベントにはテキストがありません(${where})`, `This event has no text (${where})`)
            : tr(`このコモンイベントにはテキストがありません(${where})`, `This common event has no text (${where})`),
        {
            modal: true,
            detail: tr('ゲームのデータから読んだ中身を、読むだけの画面で開きます。書き換えるときは、先に「ゲームから取り出す」でテキストを作ってください。',
                'The contents read from the game data open in a read-only view. To edit them, make a text first with Pull from game.')
        },
        open
    );
    return pick === open;
}

export function readOnlyUri(key: string): vscode.Uri {
    return vscode.Uri.from({ scheme: LINKS_SCHEME, path: '/' + key.replace(/:/g, '_') + '.txt', query: key });
}

/** 呼び出し階層の行に出す名前。 */
function nodeLabel(service: DatabaseService, ctx: DbContext, node: LinkNode): { name: string; detail: string } {
    const named = (kind: 'switch' | 'variable' | 'commonEvent' | 'map', id: number): string => {
        const hit = ctx.db.lookup(kind, id);
        return hit.status === 'named' ? hit.name : '';
    };
    if (node.kind === 'switch') return { name: tr(`スイッチ ${padId(node.id)} ${named('switch', node.id)}`, `Switch ${padId(node.id)} ${named('switch', node.id)}`).trim(), detail: tr('スイッチ', 'Switch') };
    if (node.kind === 'variable') return { name: tr(`変数 ${padId(node.id)} ${named('variable', node.id)}`, `Variable ${padId(node.id)} ${named('variable', node.id)}`).trim(), detail: tr('変数', 'Variable') };
    if (node.kind === 'common') return { name: tr(`コモンイベント ${padId(node.id)} ${named('commonEvent', node.id)}`, `Common event ${padId(node.id)} ${named('commonEvent', node.id)}`).trim(), detail: tr('コモンイベント', 'Common event') };
    if (node.kind === 'map') return { name: mapLabel({ id: node.id, name: named('map', node.id) }), detail: tr(`マップ${padId(node.id)}`, `Map ${padId(node.id)}`) };
    if (node.kind === 'selfSwitch') {
        const event = service.mapEvents(ctx, node.mapId)?.[node.eventId];
        return {
            name: tr(`セルフスイッチ ${node.letter}`, `Self switch ${node.letter}`),
            detail: `${mapLabel({ id: node.mapId, name: named('map', node.mapId) })} / ${eventLabelId(node.eventId)}${event && event.name ? ' ' + event.name : ''}`
        };
    }
    const event = service.mapEvents(ctx, node.mapId)?.[node.eventId];
    const summary = event && (event.pageSummaries || [])[node.pageId - 1];
    return {
        name: tr(`${eventLabelId(node.eventId)}${event && event.name ? ' ' + event.name : ''} / ${node.pageId}ページ`, `${eventLabelId(node.eventId)}${event && event.name ? ' ' + event.name : ''} / page ${node.pageId}`),
        detail: [mapLabel({ id: node.mapId, name: named('map', node.mapId) }), summary ? triggerLabel(summary.trigger) : ''].filter((s) => s).join(' / ')
    };
}

const ICONS: Record<LinkNode['kind'], vscode.SymbolKind> = {
    page: vscode.SymbolKind.Event,
    common: vscode.SymbolKind.Function,
    switch: vscode.SymbolKind.Boolean,
    variable: vscode.SymbolKind.Variable,
    selfSwitch: vscode.SymbolKind.Boolean,
    map: vscode.SymbolKind.Namespace
};

export function registerEventLinks(context: vscode.ExtensionContext, service: DatabaseService, tracker: RunTracker): LinkService {
    const links = new LinkService(service, tracker);

    const contextFor = (document?: vscode.TextDocument): DbContext | undefined => {
        const ctx = service.forDocument(document || vscode.window.activeTextEditor?.document);
        if (ctx) return ctx;
        const root = workspaceRootFor(document);
        return root ? service.forRoot(root) : undefined;
    };

    const contents = (ctx: DbContext, key: string): string => {
        const node = nodeFromKey(key);
        if (!node) return '';
        const { name, detail } = nodeLabel(service, ctx, node);
        const head = [`${name}${detail ? '(' + detail + ')' : ''}`, ''];
        if (node.kind === 'page' || node.kind === 'common') {
            const body = renderCommands(context, ctx.root, links.commandsOf(ctx, key));
            return head.concat(['% ゲームのデータから読んだ中身です(テキストがまだありません)。', '', body]).join('\n');
        }
        const index = links.index(ctx);
        const line = (link: Link, other: string): string => {
            const target = nodeFromKey(other);
            const label = target ? nodeLabel(service, ctx, target) : { name: other, detail: '' };
            return `  ${howLabels()[link.how] || link.how}: ${label.name}${label.detail ? '(' + label.detail + ')' : ''}${link.note ? ' — ' + link.note : ''}`;
        };
        return head.concat([
            tr('ここから:', 'From here:'),
            ...index.out(key).map((link) => line(link, link.to)),
            '',
            tr('ここへ:', 'To here:'),
            ...index.in(key).map((link) => line(link, link.from))
        ]).join('\n');
    };

    /** その場所を開く場所(テキストがあればテキスト、無ければ読むだけの画面)。 */
    const uriFor = (ctx: DbContext, key: string): Promise<{ uri: vscode.Uri; file?: string }> => links.uriFor(ctx, key);
    const lineOf = (ctx: DbContext, key: string, file: string | undefined, index?: number): number => links.lineOf(ctx, key, file, index);

    const itemFor = async (ctx: DbContext, key: string): Promise<vscode.CallHierarchyItem | undefined> => {
        const node = nodeFromKey(key);
        if (!node) return undefined;
        const { name, detail } = nodeLabel(service, ctx, node);
        const { uri } = await uriFor(ctx, key);
        // テキストの無いページは、押す前に分かるようにする(押すと読むだけの画面が開く)。
        const noText = uri.scheme === LINKS_SCHEME && (node.kind === 'page' || node.kind === 'common');
        const item = new vscode.CallHierarchyItem(ICONS[node.kind], name, noText ? [detail, tr('テキストなし', 'no text')].filter((s) => s).join(' / ') : detail, uri, new vscode.Range(0, 0, 0, 0), new vscode.Range(0, 0, 0, 0));
        (item as vscode.CallHierarchyItem & { t2fKey?: string }).t2fKey = key;
        return item;
    };

    const keyOf = (item: vscode.CallHierarchyItem): string | undefined => (item as vscode.CallHierarchyItem & { t2fKey?: string }).t2fKey;

    /** カーソルの下にあるもの。無ければ、そのテキストの場所。 */
    const keyAt = (document: vscode.TextDocument, position: vscode.Position): string | undefined => {
        if (document.uri.scheme === LINKS_SCHEME) return document.uri.query || undefined;
        const lines: string[] = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);
        const within = (r: { line: number; start: number; end: number }): boolean =>
            r.line === position.line && r.start <= position.character && position.character <= r.end;
        const place = placeFromMeta(parseFrontMatter(document.getText()).meta);
        const own = place && placeKey(place);
        const self = scanSelfSwitchLines(lines).find(within);
        if (self && place && place.kind === 'event' && place.eventId !== undefined) {
            return nodeKey({ kind: 'selfSwitch', mapId: place.mapId, eventId: place.eventId, letter: self.letter });
        }
        const ref = scanLines(lines).find(within);
        if (ref) {
            if (ref.kind === 'commonEvent') return nodeKey({ kind: 'common', id: ref.id });
            if (ref.kind === 'switch') return nodeKey({ kind: 'switch', id: ref.id });
            if (ref.kind === 'variable') return nodeKey({ kind: 'variable', id: ref.id });
            if (ref.kind === 'map') return nodeKey({ kind: 'map', id: ref.id });
        }
        return own;
    };

    /** マップから出るつながりは、そのマップのイベントのページ(自動実行・並列処理が先)。 */
    const mapPages = (ctx: DbContext, mapId: number): string[] => {
        const events = service.mapEvents(ctx, mapId) || [];
        const out: Array<[number, string]> = [];
        events.forEach((event, eventId) => {
            if (!event || eventId === 0) return;
            (event.pageSummaries || []).forEach((summary, index) => {
                const order = summary.trigger === 3 ? 0 : summary.trigger === 4 ? 1 : 2;
                out.push([order, nodeKey({ kind: 'page', mapId, eventId, pageId: index + 1 })]);
            });
        });
        return out.sort((a, b) => a[0] - b[0]).map(([, key]) => key);
    };

    const provider: vscode.CallHierarchyProvider = {
        async prepareCallHierarchy(document, position) {
            const ctx = contextFor(document);
            const key = ctx && keyAt(document, position);
            if (!ctx || !key) return undefined;
            const item = await itemFor(ctx, key);
            return item ? [item] : [];
        },
        async provideCallHierarchyOutgoingCalls(item) {
            const ctx = contextFor();
            const key = keyOf(item);
            if (!ctx || !key) return [];
            const node = nodeFromKey(key);
            const out: vscode.CallHierarchyOutgoingCall[] = [];
            const file = await links.textFor(ctx, key);
            for (const link of links.index(ctx).out(key)) {
                const to = await itemFor(ctx, link.to);
                if (!to) continue;
                to.detail = [to.detail, howLabels()[link.how], link.note].filter((s) => s).join(' / ');
                const line = lineOf(ctx, key, file, link.index);
                out.push(new vscode.CallHierarchyOutgoingCall(to, [new vscode.Range(line, 0, line, 0)]));
            }
            if (node && node.kind === 'map') {
                for (const pageKey of mapPages(ctx, node.id)) {
                    const to = await itemFor(ctx, pageKey);
                    if (to) out.push(new vscode.CallHierarchyOutgoingCall(to, [new vscode.Range(0, 0, 0, 0)]));
                }
            }
            return out;
        },
        async provideCallHierarchyIncomingCalls(item) {
            const ctx = contextFor();
            const key = keyOf(item);
            if (!ctx || !key) return [];
            const out: vscode.CallHierarchyIncomingCall[] = [];
            for (const link of links.index(ctx).in(key)) {
                const from = await itemFor(ctx, link.from);
                if (!from) continue;
                from.detail = [from.detail, howLabels()[link.how], link.note].filter((s) => s).join(' / ');
                const file = await links.textFor(ctx, link.from);
                const line = lineOf(ctx, link.from, file, link.index);
                out.push(new vscode.CallHierarchyIncomingCall(from, [new vscode.Range(line, 0, line, 0)]));
            }
            return out;
        }
    };

    const readOnly: vscode.TextDocumentContentProvider = {
        provideTextDocumentContent(uri) {
            const ctx = contextFor();
            return ctx ? contents(ctx, uri.query) : '';
        }
    };

    context.subscriptions.push(
        vscode.languages.registerCallHierarchyProvider(SELECTOR, provider),
        vscode.languages.registerCallHierarchyProvider({ scheme: LINKS_SCHEME }, provider),
        vscode.workspace.registerTextDocumentContentProvider(LINKS_SCHEME, readOnly)
    );
    return links;
}
