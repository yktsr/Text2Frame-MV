/*
 * コメント行の先頭の文字を、どこから採るか。vscode に依存しない(検査から呼べるように)。
 *
 * 反映の側(本体の Text2Frame.js)と**同じ順番**でなければならない。食い違うと、同じ
 * プロジェクトで画面の色分けと反映が別の文字を見ることになり、**コメント行が本文として
 * 色分けされ、本文がコメントとして消える**。
 */
import { commentOutCharIn } from './db/projectParams';

/** 出荷時の既定。本体の Text2Frame.js と同じ。 */
export const SHIPPED_COMMENT_CHAR = '%';

/**
 * 決め方は3段。
 *
 *   1. 設定(text2frame.commentOutChar)が言っていればそれ
 *   2. そのゲームの js/plugins.js にある Text2Frame の設定
 *      ただし**プラグインが実際に入っているときだけ**(installed) ── 項目だけ残して
 *      消したゲームでは、その設定はゲームの中で何も動かしていない
 *   3. 出荷時の既定(`%`)
 *
 * @param said      設定の値。未設定は空文字。
 * @param pluginsJs ゲームの js/plugins.js の中身。読めなければ空文字。
 * @param installed js/plugins/Text2Frame.js が実在するか。
 */
export function commentCharFrom(said: string, pluginsJs: string, installed: boolean): string {
    if (said) return said;
    if (!installed || !pluginsJs) return SHIPPED_COMMENT_CHAR;
    return commentOutCharIn(pluginsJs) || SHIPPED_COMMENT_CHAR;
}
