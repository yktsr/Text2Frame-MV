import { RpgCommand } from './commandRefs';
import { PageSummary } from './eventPages';

/**
 * イベント同士のつながり。VS Code に依存しないので、テストから直接使える。
 *   ページ・コモンイベント → 呼ぶコモンイベント・移動先のマップ・変えるスイッチや変数
 *   スイッチ・変数・セルフスイッチ → それを出現条件にしているページ、動き出すコモンイベント
 * 逆に引けば、「誰がここを呼ぶか」「誰がこのページを出すか」が分かる。
 */

export type LinkNode =
    | { kind: 'page'; mapId: number; eventId: number; pageId: number }
    | { kind: 'common'; id: number }
    | { kind: 'switch'; id: number }
    | { kind: 'variable'; id: number }
    | { kind: 'selfSwitch'; mapId: number; eventId: number; letter: string }
    | { kind: 'map'; id: number };

/** つながりの種類。 */
export type LinkHow =
    | 'call'          // コモンイベントを呼ぶ
    | 'transfer'      // 場所移動
    | 'vehicle'       // 乗り物の位置設定
    | 'switchOn' | 'switchOff'
    | 'variable'      // 変数の操作
    | 'selfSwitchOn' | 'selfSwitchOff'
    | 'condition'     // ページの出現条件
    | 'trigger';      // コモンイベントの自動実行・並列処理のスイッチ

export interface Link {
    from: string;
    to: string;
    how: LinkHow;
    /** from の中の何番目のコマンドか(出現条件やトリガーには無い)。 */
    index?: number;
    /** 行き先が変数で決まるとき(to は変数)。 */
    byVariable?: boolean;
    /** 出現条件のときの、ページのしきい値など。表に出す短い言葉。 */
    note?: string;
}

export function nodeKey(node: LinkNode): string {
    switch (node.kind) {
        case 'page': return `e:${node.mapId}:${node.eventId}:${node.pageId}`;
        case 'common': return `c:${node.id}`;
        case 'switch': return `s:${node.id}`;
        case 'variable': return `v:${node.id}`;
        case 'selfSwitch': return `ss:${node.mapId}:${node.eventId}:${node.letter}`;
        default: return `m:${node.id}`;
    }
}

export function nodeFromKey(key: string): LinkNode | undefined {
    let m = /^e:(\d+):(\d+):(\d+)$/.exec(key);
    if (m) return { kind: 'page', mapId: Number(m[1]), eventId: Number(m[2]), pageId: Number(m[3]) };
    m = /^ss:(\d+):(\d+):([A-Za-z0-9_]+)$/.exec(key);
    if (m) return { kind: 'selfSwitch', mapId: Number(m[1]), eventId: Number(m[2]), letter: m[3] };
    m = /^([csvm]):(\d+)$/.exec(key);
    if (!m) return undefined;
    const id = Number(m[2]);
    if (m[1] === 'c') return { kind: 'common', id };
    if (m[1] === 's') return { kind: 'switch', id };
    if (m[1] === 'v') return { kind: 'variable', id };
    return { kind: 'map', id };
}

const int = (v: unknown): number => (Number.isInteger(Number(v)) ? Number(v) : 0);

/** ページ・コモンイベントの中のコマンドから出るつながり。 */
export function commandLinks(from: string, commands: RpgCommand[]): Link[] {
    const owner = nodeFromKey(from);
    const out: Link[] = [];
    (commands || []).forEach((command, index) => {
        const p = (command && command.parameters) || [];
        const add = (to: string, how: LinkHow, extra: Partial<Link> = {}): void => { out.push({ from, to, how, index, ...extra }); };
        switch (command && command.code) {
            case 117: {
                if (int(p[0]) > 0) add(nodeKey({ kind: 'common', id: int(p[0]) }), 'call');
                break;
            }
            case 201: case 202: {
                const q = command.code === 201 ? p : p.slice(1);
                const how: LinkHow = command.code === 201 ? 'transfer' : 'vehicle';
                if (int(q[0]) === 0 && int(q[1]) > 0) add(nodeKey({ kind: 'map', id: int(q[1]) }), how);
                else if (int(q[0]) === 1 && int(q[1]) > 0) add(nodeKey({ kind: 'variable', id: int(q[1]) }), how, { byVariable: true });
                break;
            }
            case 121: {
                const how: LinkHow = int(p[2]) === 0 ? 'switchOn' : 'switchOff';
                for (let id = int(p[0]); id <= int(p[1]) && id > 0; id++) add(nodeKey({ kind: 'switch', id }), how);
                break;
            }
            case 122: {
                for (let id = int(p[0]); id <= int(p[1]) && id > 0; id++) add(nodeKey({ kind: 'variable', id }), 'variable');
                break;
            }
            case 123: {
                if (!owner || owner.kind !== 'page' || typeof p[0] !== 'string') break;
                const how: LinkHow = int(p[1]) === 0 ? 'selfSwitchOn' : 'selfSwitchOff';
                add(nodeKey({ kind: 'selfSwitch', mapId: owner.mapId, eventId: owner.eventId, letter: p[0] }), how);
                break;
            }
            case 505: {
                const step = (p[0] || {}) as { code?: number; parameters?: unknown[] };
                const id = int((step.parameters || [])[0]);
                if ((step.code === 27 || step.code === 28) && id > 0) {
                    add(nodeKey({ kind: 'switch', id }), step.code === 27 ? 'switchOn' : 'switchOff');
                }
                break;
            }
            default:
                break;
        }
    });
    return out;
}

export interface EventPages {
    mapId: number;
    eventId: number;
    summaries: PageSummary[];
}

/** 出現条件から出るつながり(スイッチ・変数・セルフスイッチ → そのページ)。 */
export function conditionLinks(events: EventPages[]): Link[] {
    const out: Link[] = [];
    for (const event of events) {
        event.summaries.forEach((page, index) => {
            const to = nodeKey({ kind: 'page', mapId: event.mapId, eventId: event.eventId, pageId: index + 1 });
            const add = (from: string, note: string): void => { out.push({ from, to, how: 'condition', note }); };
            if (page.switch1) add(nodeKey({ kind: 'switch', id: page.switch1 }), 'ON で出る');
            if (page.switch2) add(nodeKey({ kind: 'switch', id: page.switch2 }), 'ON で出る');
            if (page.variable) add(nodeKey({ kind: 'variable', id: page.variable[0] }), `${page.variable[1]} 以上で出る`);
            if (page.selfSwitch) {
                add(nodeKey({ kind: 'selfSwitch', mapId: event.mapId, eventId: event.eventId, letter: page.selfSwitch }), 'ON で出る');
            }
        });
    }
    return out;
}

export interface CommonTrigger {
    id: number;
    /** 0 なし / 1 自動実行 / 2 並列処理。 */
    trigger: number;
    switchId: number;
}

/** 自動実行・並列処理のコモンイベントを動かすスイッチ。 */
export function commonTriggerLinks(commons: CommonTrigger[]): Link[] {
    const out: Link[] = [];
    for (const common of commons) {
        if ((common.trigger !== 1 && common.trigger !== 2) || common.switchId <= 0) continue;
        out.push({
            from: nodeKey({ kind: 'switch', id: common.switchId }),
            to: nodeKey({ kind: 'common', id: common.id }),
            how: 'trigger',
            note: common.trigger === 1 ? 'ON で自動実行' : 'ON で並列処理'
        });
    }
    return out;
}

/** つながりを両向きに引けるようにまとめたもの。 */
export class LinkIndex {
    private readonly fromKey = new Map<string, Link[]>();
    private readonly toKey = new Map<string, Link[]>();

    constructor(links: Link[]) {
        for (const link of links) {
            const out = this.fromKey.get(link.from) || [];
            out.push(link);
            this.fromKey.set(link.from, out);
            const back = this.toKey.get(link.to) || [];
            back.push(link);
            this.toKey.set(link.to, back);
        }
    }

    /** そこから出るつながり。 */
    out(key: string): Link[] {
        return this.fromKey.get(key) || [];
    }

    /** そこへ入るつながり。 */
    in(key: string): Link[] {
        return this.toKey.get(key) || [];
    }
}

/** 場所移動を「マップ → マップ」にまとめる。行き先が変数で決まるものは to が undefined。 */
export interface MapLink {
    fromMap?: number;
    toMap?: number;
    /** 移動している所(ページかコモンイベント)。 */
    at: string;
    index?: number;
    how: 'transfer' | 'vehicle';
    /** 行き先が変数で決まるときの、その変数。 */
    variableId?: number;
}

export function mapLinks(links: Link[]): MapLink[] {
    const out: MapLink[] = [];
    for (const link of links) {
        if (link.how !== 'transfer' && link.how !== 'vehicle') continue;
        const owner = nodeFromKey(link.from);
        const target = nodeFromKey(link.to);
        out.push({
            fromMap: owner && owner.kind === 'page' ? owner.mapId : undefined,
            toMap: target && target.kind === 'map' ? target.id : undefined,
            at: link.from,
            index: link.index,
            how: link.how,
            variableId: link.byVariable && target && target.kind === 'variable' ? target.id : undefined
        });
    }
    return out;
}
