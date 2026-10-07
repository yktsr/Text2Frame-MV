import { MapLink } from './eventLinks';

/**
 * マップのつながりの図の、点と矢印の並べ方。VS Code に依存しないので、テストから直接使える。
 * 真ん中のマップから何回の移動で行けるかを段(column)にして、同じ段の中で順に並べる(row)。
 * 全部のマップを出すときは、つながりのかたまりごとに、いちばんつながりの多いマップから数える。
 */

export interface GraphPlace {
    /** 移動しているページ・コモンイベント。 */
    at: string;
    index?: number;
    /** その矢印の向き(from → to なら forward)。 */
    forward: boolean;
}

export interface GraphEdge {
    from: number;
    to: number;
    /** 行き来できる(両方向に移動がある)。 */
    both: boolean;
    /** 乗り物の移動を含む。 */
    vehicle: boolean;
    places: GraphPlace[];
}

export interface GraphNode {
    id: number;
    /** 真ん中から何回の移動で行けるか。 */
    hop: number;
    column: number;
    row: number;
}

export interface Graph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    /** 点が多すぎて、途中で切ったか。 */
    truncated: boolean;
}

export interface GraphOptions {
    /** 真ん中に置くマップ。0 なら全部のマップ。 */
    center: number;
    /** 何段先まで出すか。 */
    hops: number;
    /** 乗り物の移動も入れるか。 */
    vehicle?: boolean;
    maxNodes?: number;
}

const pairKey = (a: number, b: number): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** 場所移動を、マップ同士の行き来にまとめる。 */
export function graphEdges(links: MapLink[], vehicle = false): GraphEdge[] {
    const byPair = new Map<string, GraphEdge>();
    for (const link of links) {
        if (link.fromMap === undefined || link.toMap === undefined || link.fromMap === link.toMap) continue;
        if (link.how === 'vehicle' && !vehicle) continue;
        const key = pairKey(link.fromMap, link.toMap);
        const hit = byPair.get(key);
        if (!hit) {
            byPair.set(key, {
                from: link.fromMap,
                to: link.toMap,
                both: false,
                vehicle: link.how === 'vehicle',
                places: [{ at: link.at, index: link.index, forward: true }]
            });
            continue;
        }
        const forward = hit.from === link.fromMap;
        if (!forward) hit.both = true;
        if (link.how === 'vehicle') hit.vehicle = true;
        hit.places.push({ at: link.at, index: link.index, forward });
    }
    return Array.from(byPair.values());
}

/** 図に出す点と矢印。 */
export function buildGraph(links: MapLink[], options: GraphOptions): Graph {
    const maxNodes = options.maxNodes || 60;
    const edges = graphEdges(links, options.vehicle);
    const neighbours = new Map<number, Set<number>>();
    const touch = (a: number, b: number): void => {
        const set = neighbours.get(a) || new Set<number>();
        set.add(b);
        neighbours.set(a, set);
    };
    for (const edge of edges) {
        touch(edge.from, edge.to);
        touch(edge.to, edge.from);
    }

    const hops = new Map<number, number>();
    let truncated = false;
    const starts = options.center > 0
        ? [options.center]
        : Array.from(neighbours.keys()).sort((a, b) => (neighbours.get(b) as Set<number>).size - (neighbours.get(a) as Set<number>).size || a - b);
    const limit = options.center > 0 ? options.hops : Number.MAX_SAFE_INTEGER;
    for (const start of starts) {
        if (hops.has(start)) continue;
        if (hops.size >= maxNodes) { truncated = true; break; }
        hops.set(start, 0);
        let edge: number[] = [start];
        for (let hop = 1; hop <= limit && edge.length; hop++) {
            const next: number[] = [];
            for (const id of edge) {
                for (const other of Array.from(neighbours.get(id) || []).sort((a, b) => a - b)) {
                    if (hops.has(other)) continue;
                    if (hops.size >= maxNodes) { truncated = true; continue; }
                    hops.set(other, hop);
                    next.push(other);
                }
            }
            edge = next;
        }
    }

    const shown = new Set(hops.keys());
    const nodes = placeRows(hops, neighbours, shown);
    return { nodes, edges: edges.filter((e) => shown.has(e.from) && shown.has(e.to)), truncated };
}

/**
 * 段の中の並び順。つながっている相手(1つ手前の段)の高さの平均で並べると、線の交わりが減る。
 * 同じ高さなら番号の順。
 */
function placeRows(hops: Map<number, number>, neighbours: Map<number, Set<number>>, shown: Set<number>): GraphNode[] {
    const columns = new Map<number, number[]>();
    for (const [id, hop] of hops) {
        const list = columns.get(hop) || [];
        list.push(id);
        columns.set(hop, list);
    }
    const rowOf = new Map<number, number>();
    const out: GraphNode[] = [];
    for (const column of Array.from(columns.keys()).sort((a, b) => a - b)) {
        const list = (columns.get(column) as number[]).slice();
        const near = (id: number): number => {
            const rows: number[] = [];
            for (const other of neighbours.get(id) || []) {
                if (!shown.has(other) || hops.get(other) !== column - 1) continue;
                const row = rowOf.get(other);
                if (row !== undefined) rows.push(row);
            }
            return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : Number.MAX_SAFE_INTEGER;
        };
        const middle = new Map(list.map((id) => [id, near(id)]));
        list.sort((a, b) => (middle.get(a) as number) - (middle.get(b) as number) || a - b);
        list.forEach((id, row) => {
            rowOf.set(id, row);
            out.push({ id, hop: hops.get(id) as number, column, row });
        });
    }
    return out;
}
