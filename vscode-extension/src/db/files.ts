import * as fs from 'fs';
import * as path from 'path';

/* ファイルまわりの小道具。vscode に依存しないので、拡張ホストの外(テスト)からも読める。 */

/** 画面や出力に出すパス。作業フォルダからの相対で、区切りは / に揃える。 */
export function relLabel(workspaceRoot: string, file: string): string {
    return path.relative(workspaceRoot, file).split(path.sep).join('/') || path.basename(file);
}

/* 会話のみ書き出し(*.conversation.txt)は、落ちる情報のある読み物。行き先を持たないので
 * 反映も取り出しもしない。*.translation.txt は以前の版が作っていた同じ類のファイル。 */
const SIDECAR_TEXT = /\.(conversation|translation)\.txt$/;
export function isSidecarText(file: string): boolean {
    return SIDECAR_TEXT.test(file);
}

/** JSON を読む。読めない・壊れているときは undefined(呼び側でそのまま扱えるように)。 */
export function readJsonFile<T = unknown>(file: string): T | undefined {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch (e) {
        return undefined;
    }
}
