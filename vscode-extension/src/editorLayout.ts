export interface EditorLayout {
    orientation: number;
    groups: LayoutGroup[];
}

interface LayoutGroup {
    groups?: LayoutGroup[];
}

const VERTICAL = 1;

/** 列番号 lower のグループが、列番号 upper のグループのすぐ下にあるか。並びが読めなければ undefined。 */
export function isDirectlyBelow(layout: EditorLayout | undefined, upper: number, lower: number, groupCount: number): boolean | undefined {
    if (!layout || !Array.isArray(layout.groups)) return undefined;
    let next = 1;
    let below = false;
    const walk = (groups: LayoutGroup[], vertical: boolean): void => {
        const leaves = groups.map((g) => {
            if (Array.isArray(g.groups) && g.groups.length) {
                walk(g.groups, !vertical);
                return 0;
            }
            return next++;
        });
        if (!vertical) return;
        for (let i = 0; i + 1 < leaves.length; i++) {
            if (leaves[i] === upper && leaves[i + 1] === lower) below = true;
        }
    };
    walk(layout.groups, layout.orientation === VERTICAL);
    return next - 1 === groupCount ? below : undefined;
}
