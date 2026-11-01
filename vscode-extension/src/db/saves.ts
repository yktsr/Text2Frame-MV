import * as fs from 'fs';
import * as path from 'path';

/*
 * ゲームのフォルダにあるセーブファイル。vscode に依存しない(src/db/* の約束)。
 *
 * 読むだけで、形式には触らない。MV は .rpgsave、MZ は .rmmzsave で、どちらもゲーム自身が
 * utf8 のテキストとして読み書きする。同じ読み方をすれば中身は変わらないので、そのまま渡せる。
 *
 * 根の MCP サーバ(t2f-mcp.js)と拡張の両方がここを使う。拡張子の見分け方を2か所に書くと、
 * 片方だけ MZ に対応している状態が作れてしまう。
 */

export interface SaveOnDisk {
    /** 拡張子を除いた名前。`file1` `global` など。 */
    name: string;
    /** 中身。大きすぎて読まなかったときは無い。 */
    data?: string;
    bytes: number;
    /** 上限を超えていて読まなかった。 */
    tooBig?: boolean;
}

/**
 * これより大きいセーブは読まない。
 * 壊れたファイルや別物を置かれたときに、まるごとメモリへ載せないための上限。
 */
export const SAVE_MAX_BYTES = 4 * 1024 * 1024;

/** `config` は設定(音量など)で、セーブではない。 */
const NOT_A_SAVE = ['config'];

/**
 * `<gameRoot>/save` にあるセーブ。名前順。フォルダが無ければ空。
 * 読めなかったファイルは黙って落とし、大きすぎたものは `tooBig` を立てて名前だけ返す
 * (黙って消すと「そのセーブは無い」と誤解させる)。
 */
export function savesOnDisk(gameRoot: string): SaveOnDisk[] {
    const dir = path.join(gameRoot, 'save');
    let names: string[] = [];
    try {
        names = fs.readdirSync(dir);
    } catch (e) {
        return [];
    }
    const out: SaveOnDisk[] = [];
    for (const name of names.sort()) {
        const m = /^(.+)\.(rmmzsave|rpgsave)$/.exec(name);
        if (!m || NOT_A_SAVE.indexOf(m[1]) >= 0) continue;
        const file = path.join(dir, name);
        let bytes = 0;
        try {
            bytes = fs.statSync(file).size;
        } catch (e) {
            continue;
        }
        if (bytes > SAVE_MAX_BYTES) {
            out.push({ name: m[1], bytes, tooBig: true });
            continue;
        }
        try {
            out.push({ name: m[1], data: fs.readFileSync(file, 'utf8'), bytes });
        } catch (e) {
            // 読めないものは出さない。
        }
    }
    return out;
}
