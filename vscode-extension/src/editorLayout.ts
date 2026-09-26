export interface EditorLayout {
    orientation: number;
    groups: LayoutGroup[];
}

interface LayoutGroup {
    groups?: LayoutGroup[];
}

export type Side = 'below' | 'right';

const VERTICAL = 1;

/** 列番号 next のグループが、列番号 from のグループのすぐ下(すぐ右)にあるか。並びが読めなければ undefined。 */
export function isNextTo(layout: EditorLayout | undefined, from: number, next: number, groupCount: number, side: Side): boolean | undefined {
    if (!layout || !Array.isArray(layout.groups)) return undefined;
    let counter = 1;
    let found = false;
    const walk = (groups: LayoutGroup[], vertical: boolean): void => {
        const leaves = groups.map((g) => {
            if (Array.isArray(g.groups) && g.groups.length) {
                walk(g.groups, !vertical);
                return 0;
            }
            return counter++;
        });
        if (vertical !== (side === 'below')) return;
        for (let i = 0; i + 1 < leaves.length; i++) {
            if (leaves[i] === from && leaves[i + 1] === next) found = true;
        }
    };
    walk(layout.groups, layout.orientation === VERTICAL);
    return counter - 1 === groupCount ? found : undefined;
}
