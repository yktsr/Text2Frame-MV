import { DbKind } from './database';

/**
 * コンパイル後のコマンド1つが、データベースのどれを指しているか。VS Code に依存しない。
 *
 * ツクールのコマンドの形(code と parameters の並び)は MV / MZ で共通なので、
 * タグの書き方(英語・日本語・短縮形)に関係なくここで読める。
 * プレビューはこれで名前を引き、テストは tagRefs(テキスト側)とこれを突き合わせて、
 * タグの表がコンパイラとずれていないことを確かめる。
 */

export type RefKind = DbKind | 'face';

export interface CommandRef {
    kind: RefKind;
    id: number;
    /** 顔だけ。顔画像のファイル名。id は何番目の顔か。 */
    faceName?: string;
}

export interface RpgCommand {
    code: number;
    indent?: number;
    parameters: any[];
}

const range = (kind: DbKind, start: number, end: number): CommandRef[] => {
    const out: CommandRef[] = [];
    for (let id = start; id <= end; id++) out.push({ kind, id });
    return out;
};

/** 条件分岐(111)の種類 → 1つ目の番号の種類。敵キャラ(5)は敵グループ内の並び順で DB の番号ではない。 */
const IF_TARGETS: Record<number, DbKind> = { 0: 'switch', 1: 'variable', 4: 'actor', 8: 'item', 9: 'weapon', 10: 'armor' };

export function commandRefs(cmd: RpgCommand): CommandRef[] {
    const p = cmd.parameters || [];
    switch (cmd.code) {
        case 101: // 文章の表示
            return p[0] ? [{ kind: 'face', id: Number(p[1]) || 0, faceName: String(p[0]) }] : [];
        case 117: // コモンイベント
            return [{ kind: 'commonEvent', id: p[0] }];
        case 121: // スイッチの操作
            return range('switch', p[0], p[1]);
        case 122: { // 変数の操作。オペランドが変数(1)なら p[4] も変数
            const out = range('variable', p[0], p[1]);
            if (p[3] === 1) out.push({ kind: 'variable', id: p[4] });
            return out;
        }
        case 111: { // 条件分岐
            const kind = IF_TARGETS[p[0]];
            if (!kind) return [];
            const out: CommandRef[] = [{ kind, id: p[1] }];
            if (p[0] === 1 && p[2] === 1) out.push({ kind: 'variable', id: p[3] }); // 変数と変数の比較
            return out;
        }
        case 201: // 場所移動。直接指定(0)ならマップ、変数で指定(1)なら3つとも変数
            if (p[0] === 0) return [{ kind: 'map', id: p[1] }];
            if (p[0] === 1) return [{ kind: 'variable', id: p[1] }, { kind: 'variable', id: p[2] }, { kind: 'variable', id: p[3] }];
            return [];
        case 212: // アニメーションの表示
            return [{ kind: 'animation', id: p[1] }];
        default:
            return [];
    }
}
