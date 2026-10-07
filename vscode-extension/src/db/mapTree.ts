import { padId } from './database';
import { PageSummary, triggerLabel } from './eventPages';
import { tr } from './lang';

/**
 * マップの一覧(data/MapInfos.json)を、ツクールのエディタと同じ親子・順番に並べる。
 * ページの説明の文字列もここで作る。VS Code に依存しないので、テストから直接使える。
 */

export interface MapInfo {
    id: number;
    /** 名前が無ければ空文字。 */
    name: string;
    parentId: number;
    order: number;
    /** エディタで開いた状態にしていたか。 */
    expanded: boolean;
}

export interface MapNode {
    info: MapInfo;
    children: MapNode[];
}

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** MapInfos.json の中身 → マップの一覧(番号の小さい順)。 */
export function readMapInfos(json: unknown): MapInfo[] {
    if (!Array.isArray(json)) return [];
    const out: MapInfo[] = [];
    json.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') return;
        const record = entry as { id?: unknown; name?: unknown; parentId?: unknown; order?: unknown; expanded?: unknown };
        const id = Number.isInteger(record.id) && Number(record.id) > 0 ? Number(record.id) : index;
        if (id <= 0) return;
        out.push({
            id,
            name: typeof record.name === 'string' ? record.name : '',
            parentId: num(record.parentId),
            order: num(record.order),
            expanded: record.expanded === true
        });
    });
    return out.sort((a, b) => a.id - b.id);
}

/**
 * 親子と順番で並べる。親が無いもの・親をたどると輪になるものは、いちばん上に出す。
 * 同じ親の中は order の小さい順。order が同じなら番号の順。
 */
export function mapTree(infos: MapInfo[]): MapNode[] {
    const byId = new Map<number, MapInfo>();
    for (const info of infos) byId.set(info.id, info);
    const nodes = new Map<number, MapNode>();
    for (const info of infos) nodes.set(info.id, { info, children: [] });

    const roots: MapNode[] = [];
    for (const info of infos) {
        const node = nodes.get(info.id) as MapNode;
        const parent = reachableParent(info, byId) ? nodes.get(info.parentId) : undefined;
        if (parent) parent.children.push(node);
        else roots.push(node);
    }
    const sort = (list: MapNode[]): void => {
        list.sort((a, b) => a.info.order - b.info.order || a.info.id - b.info.id);
        for (const node of list) sort(node.children);
    };
    sort(roots);
    return roots;
}

/** 親をたどっていちばん上まで行けるか(輪になっていないか)。 */
function reachableParent(info: MapInfo, byId: Map<number, MapInfo>): boolean {
    const seen = new Set<number>([info.id]);
    let current = byId.get(info.parentId);
    while (current) {
        if (seen.has(current.id)) return false;
        seen.add(current.id);
        current = byId.get(current.parentId);
    }
    return byId.has(info.parentId);
}

/** 「はじまりの村」。名前が無ければ「マップ0003」。 */
export function mapLabel(info: { id: number; name: string }): string {
    return info.name || tr(`マップ${padId(info.id)}`, `Map ${padId(info.id)}`);
}

export type NameLookup = (kind: 'switch' | 'variable' | 'item' | 'actor', id: number) => string | undefined;

/** 行の右に出す名前の長さ。これを超えたら切って「…」を付ける(吹き出しには全部出る)。 */
export const SHORT_NAME = 12;

/** 出現条件を1つずつ言葉にする。名前が引ければ添える。limit を渡すと、長い名前を切る。 */
export function pageConditionTexts(page: PageSummary, name?: NameLookup, limit?: number): string[] {
    const named = (kind: 'switch' | 'variable' | 'item' | 'actor', id: number): string => {
        const found = name && name(kind, id);
        if (!found) return '';
        return ' ' + (limit && found.length > limit ? found.slice(0, limit) + '…' : found);
    };
    const out: string[] = [];
    if (page.switch1) out.push(tr(`S${padId(page.switch1)}${named('switch', page.switch1)} が ON`, `S${padId(page.switch1)}${named('switch', page.switch1)} is ON`));
    if (page.switch2) out.push(tr(`S${padId(page.switch2)}${named('switch', page.switch2)} が ON`, `S${padId(page.switch2)}${named('switch', page.switch2)} is ON`));
    if (page.variable) out.push(`V${padId(page.variable[0])}${named('variable', page.variable[0])} ≥ ${page.variable[1]}`);
    if (page.selfSwitch) out.push(tr(`セルフ ${page.selfSwitch} が ON`, `Self switch ${page.selfSwitch} is ON`));
    if (page.item) out.push(tr(`アイテム${named('item', page.item)}(${padId(page.item)})を持つ`, `Has item${named('item', page.item)} (${padId(page.item)})`));
    if (page.actor) out.push(tr(`アクター${named('actor', page.actor)}(${padId(page.actor)})が仲間`, `Actor${named('actor', page.actor)} (${padId(page.actor)}) is in the party`));
    return out;
}

/** ツリーの行の右に出す短い説明。「自動実行・S0012 雨が降る が ON」 */
export function pageDescription(page: PageSummary, empty: boolean, name?: NameLookup): string {
    const parts: string[] = [];
    if (empty) parts.push(tr('中身なし', 'empty'));
    parts.push(triggerLabel(page.trigger));
    parts.push(...pageConditionTexts(page, name, SHORT_NAME));
    return parts.join(tr('・', ' · '));
}

/** テストプレイ中のゲームの様子。ツリーの行に印を付けるのに使う。 */
export interface LiveMarks {
    /** 今いるマップ。0 ならマップにいない。 */
    mapId: number;
    /** イベント番号 → 今出ているページ(1から)。0 はどのページも出ていない。 */
    pages: Map<number, number>;
    /** 並列処理で動いているイベント。 */
    parallelEvents: Set<number>;
    /** 並列処理で動いているコモンイベント。 */
    parallelCommons: Set<number>;
    /** 実行中の場所の鍵(e:マップ:イベント:ページ / c:番号)。 */
    running: Set<string>;
}

/** イベントの行に付ける印。「今 2/3ページ・並列・▶ 実行中」(全ページ数が分かれば添える) */
export function eventLiveMark(marks: LiveMarks | undefined, mapId: number, eventId: number, total?: number): string {
    if (!marks || marks.mapId !== mapId) return '';
    const parts: string[] = [];
    const page = marks.pages.get(eventId) || 0;
    const of = total ? `/${total}` : '';
    parts.push(page ? tr(`今 ${page}${of}ページ`, `now page ${page}${of}`) : tr('出ていない', 'not shown'));
    if (marks.parallelEvents.has(eventId)) parts.push(tr('並列', 'parallel'));
    if (Array.from(marks.running).some((key) => key.startsWith(`e:${mapId}:${eventId}:`))) parts.push(tr('▶ 実行中', '▶ running'));
    return parts.join(tr('・', ' · '));
}

/** ページの行に付ける印。「● 今のページ・▶ 実行中」 */
export function pageLiveMark(marks: LiveMarks | undefined, mapId: number, eventId: number, pageId: number): string {
    if (!marks || marks.mapId !== mapId) return '';
    const parts: string[] = [];
    if ((marks.pages.get(eventId) || 0) === pageId) parts.push(tr('● 今のページ', '● current page'));
    if (marks.running.has(`e:${mapId}:${eventId}:${pageId}`)) parts.push(tr('▶ 実行中', '▶ running'));
    return parts.join(tr('・', ' · '));
}

/** コモンイベントの行に付ける印。 */
export function commonLiveMark(marks: LiveMarks | undefined, commonEventId: number): string {
    if (!marks) return '';
    const parts: string[] = [];
    if (marks.parallelCommons.has(commonEventId)) parts.push(tr('並列', 'parallel'));
    if (marks.running.has(`c:${commonEventId}`)) parts.push(tr('▶ 実行中', '▶ running'));
    return parts.join(tr('・', ' · '));
}

/** コモンイベントの行の右に出す短い説明。トリガーが「なし」なら空。 */
export function commonDescription(trigger: number, switchId: number, empty: boolean, name?: NameLookup): string {
    const parts: string[] = [];
    if (empty) parts.push(tr('中身なし', 'empty'));
    if (trigger === 1 || trigger === 2) {
        const found = name && name('switch', switchId);
        parts.push(tr(`${trigger === 1 ? '自動実行' : '並列処理'}・S${padId(switchId)}${found ? ' ' + found : ''} が ON`, `${trigger === 1 ? 'Autorun' : 'Parallel'} · S${padId(switchId)}${found ? ' ' + found : ''} is ON`));
    }
    return parts.join(tr('・', ' · '));
}
