import { padId } from './database';
import { PageSummary, TRIGGER_LABELS } from './eventPages';

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

/** 「水族館1」。名前が無ければ「マップ0003」。 */
export function mapLabel(info: { id: number; name: string }): string {
    return info.name || `マップ${padId(info.id)}`;
}

export type NameLookup = (kind: 'switch' | 'variable' | 'item' | 'actor', id: number) => string | undefined;

/** 出現条件を1つずつ言葉にする。名前が引ければ添える。 */
export function pageConditionTexts(page: PageSummary, name?: NameLookup): string[] {
    const named = (kind: 'switch' | 'variable' | 'item' | 'actor', id: number): string => {
        const found = name && name(kind, id);
        return found ? ' ' + found : '';
    };
    const out: string[] = [];
    if (page.switch1) out.push(`S${padId(page.switch1)}${named('switch', page.switch1)} が ON`);
    if (page.switch2) out.push(`S${padId(page.switch2)}${named('switch', page.switch2)} が ON`);
    if (page.variable) out.push(`V${padId(page.variable[0])}${named('variable', page.variable[0])} ≥ ${page.variable[1]}`);
    if (page.selfSwitch) out.push(`セルフ ${page.selfSwitch} が ON`);
    if (page.item) out.push(`アイテム${named('item', page.item)}(${padId(page.item)})を持つ`);
    if (page.actor) out.push(`アクター${named('actor', page.actor)}(${padId(page.actor)})が仲間`);
    return out;
}

/** ツリーの行の右に出す短い説明。「自動実行・S0012 が ON」 */
export function pageDescription(page: PageSummary, empty: boolean): string {
    const parts: string[] = [];
    if (empty) parts.push('中身なし');
    parts.push(TRIGGER_LABELS[page.trigger] || TRIGGER_LABELS[0]);
    parts.push(...pageConditionTexts(page));
    return parts.join('・');
}

/** コモンイベントの行の右に出す短い説明。トリガーが「なし」なら空。 */
export function commonDescription(trigger: number, switchId: number, empty: boolean, name?: NameLookup): string {
    const parts: string[] = [];
    if (empty) parts.push('中身なし');
    if (trigger === 1 || trigger === 2) {
        const found = name && name('switch', switchId);
        parts.push(`${trigger === 1 ? '自動実行' : '並列処理'}・S${padId(switchId)}${found ? ' ' + found : ''} が ON`);
    }
    return parts.join('・');
}
