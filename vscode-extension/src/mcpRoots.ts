import * as fs from 'fs';
import * as path from 'path';

/*
 * MCP サーバを差し出すフォルダを選ぶ。vscode に依存しない(src/db/* と同じ約束)ので、
 * テストから直接呼べる。vscode を使う側は src/mcpProvider.ts。
 */

/**
 * ツクールのプロジェクトだけを選ぶ。判定は data/System.json の有無で、
 * DatabaseService がプロジェクトを探すときと同じ目印(dbService.ts:54)。
 *
 * **フォルダごとに1つ**差し出すためにここは配列を返す。1つにまとめてはいけない:
 * 祖先(.t2f-base)の鍵はテキストの置き場所で分かれるので、別のプロジェクトを
 * 1つのサーバに任せると鍵を取り合う。
 */
export function mcpRoots(folders: string[], dataDir: string): string[] {
    const out: string[] = [];
    for (const folder of folders) {
        if (!folder || out.indexOf(folder) >= 0) {
            continue;
        }
        if (fs.existsSync(path.resolve(folder, dataDir, 'System.json'))) {
            out.push(folder);
        }
    }
    return out;
}

/**
 * サーバに渡す引数。--text-dir と --data-dir は**必ず渡す**。
 * 既定に任せると、設定を変えている人のところでエディタと MCP が別のフォルダを見て、
 * 祖先の鍵が分かれて3方向マージが狂う。
 */
export function mcpArgs(serverPath: string, root: string, dataDir: string, textDir: string): string[] {
    return [serverPath, '--root', root, '--data-dir', dataDir, '--text-dir', textDir];
}

/** 画面に出す名前。フォルダが1つだけのときは余計な括弧を付けない。 */
export function mcpLabel(root: string, count: number): string {
    return count > 1 ? 'Text2Frame (' + path.basename(root) + ')' : 'Text2Frame';
}
