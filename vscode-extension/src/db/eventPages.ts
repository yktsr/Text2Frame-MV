/**
 * イベントの各ページの出現条件とトリガー。VS Code に依存しない。
 * ツクールは、条件がそろったページのうち番号がいちばん大きいものを動かす。
 */

export interface PageSummary {
    /** 0 決定ボタン / 1 プレイヤーから接触 / 2 イベントから接触 / 3 自動実行 / 4 並列処理 */
    trigger: number;
    switch1?: number;
    switch2?: number;
    /** [変数の番号, この値以上] */
    variable?: [number, number];
    selfSwitch?: string;
    item?: number;
    actor?: number;
}

export const TRIGGER_LABELS = ['決定ボタン', 'プレイヤーから接触', 'イベントから接触', '自動実行', '並列処理'];

const id = (v: unknown): number => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : 0);

export function summarizePages(event: unknown): PageSummary[] {
    const pages = event && typeof event === 'object' && Array.isArray((event as { pages?: unknown }).pages) ? (event as { pages: any[] }).pages : [];
    return pages.map((page) => {
        const c = page && typeof page.conditions === 'object' && page.conditions ? page.conditions : {};
        const out: PageSummary = { trigger: Number.isInteger(page && page.trigger) ? page.trigger : 0 };
        if (c.switch1Valid && id(c.switch1Id)) out.switch1 = c.switch1Id;
        if (c.switch2Valid && id(c.switch2Id)) out.switch2 = c.switch2Id;
        if (c.variableValid && id(c.variableId)) out.variable = [c.variableId, Number(c.variableValue) || 0];
        if (c.selfSwitchValid && typeof c.selfSwitchCh === 'string') out.selfSwitch = c.selfSwitchCh;
        if (c.itemValid && id(c.itemId)) out.item = c.itemId;
        if (c.actorValid && id(c.actorId)) out.actor = c.actorId;
        return out;
    });
}

export function hasConditions(page: PageSummary): boolean {
    return !!(page.switch1 || page.switch2 || page.variable || page.selfSwitch || page.item || page.actor);
}
