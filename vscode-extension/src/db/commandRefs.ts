import { DbKind } from './database';

/**
 * コンパイル後のコマンド1つが、データベースのどれを指しているか。VS Code に依存しない。
 *
 * ツクールのコマンドの形(code と parameters の並び)は MV / MZ で共通なので、
 * タグの書き方(英語・日本語・短縮形)に関係なくここで読める。
 * プレビューはこれで名前を引き、テストは tagRefs(テキスト側)とこれを突き合わせて、
 * タグの表がコンパイラとずれていないことを確かめる。
 */

/**
 * face は顔画像、event はそのマップのイベント(番号はイベント ID。データベースではなく Map###.json)、
 * icon はアイコン画像(img/system/IconSet)の番号。
 */
export type RefKind = DbKind | 'face' | 'event' | 'icon';

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
const one = (kind: RefKind, id: number): CommandRef[] => [{ kind, id }];
/** キャラクターの指定。-1 はプレイヤー、0 はこのイベント、1 以上がマップ上のイベント。 */
const character = (id: number): CommandRef[] => (id > 0 ? one('event', id) : []);
/** アクターの指定(固定 0 / 変数 1)。固定の 0 はパーティ全体。 */
const actorOrVariable = (designation: number, id: number): CommandRef[] =>
    designation === 1 ? one('variable', id) : id > 0 ? one('actor', id) : [];
/** オペランド(定数 0 / 変数 1)。 */
const operand = (type: number, value: number): CommandRef[] => (type === 1 ? one('variable', value) : []);
const GOODS: DbKind[] = ['item', 'weapon', 'armor'];

/** 条件分岐(111)の種類 → 1つ目の番号の種類。敵キャラ(5)は敵グループ内の並び順で DB の番号ではない。 */
const IF_TARGETS: Record<number, DbKind> = { 0: 'switch', 1: 'variable', 4: 'actor', 8: 'item', 9: 'weapon', 10: 'armor' };
/** アクターの条件(111 の p[2])→ p[3] の種類。 */
const IF_ACTOR_TARGETS: Record<number, DbKind> = { 2: 'class', 3: 'skill', 4: 'weapon', 5: 'armor', 6: 'state' };
/** 変数の操作のゲームデータ(122 の p[4])→ p[5] の種類。 */
const GAME_DATA_TARGETS: Record<number, DbKind> = { 0: 'item', 1: 'weapon', 2: 'armor', 3: 'actor' };

/** 文章中の制御文字のうち番号を持つもの。\V[n] は変数、\N[n] はアクター、\I[n] はアイコン。 */
export const ESCAPE_REF = /\\([VvNnIi])\[(\d+)\]/g;
export const ESCAPE_KINDS: Record<string, RefKind> = { v: 'variable', n: 'actor', i: 'icon' };
export function escapeRefs(text: unknown): CommandRef[] {
    if (typeof text !== 'string') return [];
    const out: CommandRef[] = [];
    for (const m of text.matchAll(ESCAPE_REF)) out.push({ kind: ESCAPE_KINDS[m[1].toLowerCase()], id: Number(m[2]) });
    return out;
}

export function commandRefs(cmd: RpgCommand): CommandRef[] {
    const p = cmd.parameters || [];
    switch (cmd.code) {
        case 101: { // 文章の表示。MZ は p[4] に名前
            const face: CommandRef[] = p[0] ? [{ kind: 'face', id: Number(p[1]) || 0, faceName: String(p[0]) }] : [];
            return face.concat(escapeRefs(p[4]));
        }
        case 401: case 405: // 文章・スクロール文章の1行
            return escapeRefs(p[0]);
        case 402: // 選択肢のとき。選択肢の表示(102)の p[0] にも同じ文言が入るが、テキストの行に当たるのはこちら
            return escapeRefs(p[1]);
        case 103: case 104: // 数値入力の処理 / アイテム選択の処理
            return one('variable', p[0]);
        case 117: // コモンイベント
            return one('commonEvent', p[0]);
        case 121: // スイッチの操作
            return range('switch', p[0], p[1]);
        case 122: { // 変数の操作
            const out = range('variable', p[0], p[1]);
            if (p[3] === 1) out.push({ kind: 'variable', id: p[4] }); // オペランドが変数
            if (p[3] === 3) { // ゲームデータ
                if (GAME_DATA_TARGETS[p[4]] && p[5] > 0) out.push({ kind: GAME_DATA_TARGETS[p[4]], id: p[5] });
                if (p[4] === 5) out.push(...character(p[5]));
            }
            return out;
        }
        case 111: { // 条件分岐
            if (p[0] === 5) return p[2] === 1 ? one('state', p[3]) : []; // 敵キャラのステート
            if (p[0] === 6) return character(p[1]);
            const kind = IF_TARGETS[p[0]];
            if (!kind) return [];
            const out: CommandRef[] = [{ kind, id: p[1] }];
            if (p[0] === 1 && p[2] === 1) out.push({ kind: 'variable', id: p[3] }); // 変数と変数の比較
            if (p[0] === 4 && IF_ACTOR_TARGETS[p[2]]) out.push({ kind: IF_ACTOR_TARGETS[p[2]], id: p[3] });
            return out;
        }
        case 125: // 所持金の増減
            return operand(p[1], p[2]);
        case 126: return one('item', p[0]).concat(operand(p[2], p[3])); // アイテムの増減
        case 127: return one('weapon', p[0]).concat(operand(p[2], p[3])); // 武器の増減
        case 128: return one('armor', p[0]).concat(operand(p[2], p[3])); // 防具の増減
        case 129: return one('actor', p[0]); // メンバーの入れ替え
        case 201: // 場所移動。直接指定(0)ならマップ、変数で指定(1)なら3つとも変数
        case 202: { // 乗り物の位置設定(p[0] が乗り物なので1つずれる)
            const q = cmd.code === 201 ? p : p.slice(1);
            if (q[0] === 0) return one('map', q[1]);
            if (q[0] === 1) return [q[1], q[2], q[3]].map((id) => ({ kind: 'variable' as const, id }));
            return [];
        }
        case 203: { // イベントの位置設定
            const out = character(p[0]);
            if (p[1] === 1) out.push({ kind: 'variable', id: p[2] }, { kind: 'variable', id: p[3] });
            if (p[1] === 2) out.push(...character(p[2]));
            return out;
        }
        case 205: return character(p[0]); // 移動ルートの設定
        case 505: { // 移動ルートの1手。スイッチON(27)・OFF(28)はスイッチを指す。
            // 同じ手は 205 の parameters[1].list にも入っているが、テキストの1行に当たるのはこちら。
            const step = p[0] || {};
            if (step.code === 27 || step.code === 28) return one('switch', (step.parameters || [])[0]);
            return [];
        }
        case 212: return character(p[0]).concat(one('animation', p[1])); // アニメーションの表示
        case 213: return character(p[0]); // フキダシアイコンの表示
        case 231: case 232: // ピクチャの表示・移動。位置を変数で指定(p[3] = 1)
            return p[3] === 1 ? [{ kind: 'variable', id: p[4] }, { kind: 'variable', id: p[5] }] : [];
        case 282: return one('tileset', p[0]); // タイルセットの変更
        case 285: { // 指定位置の情報取得
            const out = one('variable', p[0]);
            if (p[2] === 1) out.push({ kind: 'variable', id: p[3] }, { kind: 'variable', id: p[4] });
            if (p[2] === 2) out.push(...character(p[3]));
            return out;
        }
        case 301: // 戦闘の処理。直接指定(0)なら敵グループ、変数で指定(1)なら変数
            return p[0] === 0 ? one('troop', p[1]) : p[0] === 1 ? one('variable', p[1]) : [];
        case 302: case 605: // ショップの処理・商品。1つ目の商品は 302 に入る(商品が無ければ番号 0)
            return GOODS[p[0]] && p[1] > 0 ? one(GOODS[p[0]], p[1]) : [];
        case 303: return one('actor', p[0]); // 名前入力の処理
        case 311: case 312: case 326: case 315: case 316: // HP・MP・TP・経験値・レベルの増減
            return actorOrVariable(p[0], p[1]).concat(operand(p[3], p[4]));
        case 313: return actorOrVariable(p[0], p[1]).concat(one('state', p[3])); // ステートの変更
        case 314: return actorOrVariable(p[0], p[1]); // 全回復
        case 317: return actorOrVariable(p[0], p[1]).concat(operand(p[4], p[5])); // 能力値の増減
        case 318: return actorOrVariable(p[0], p[1]).concat(one('skill', p[3])); // スキルの増減
        case 319: { // 装備の変更。装備タイプ 1 は武器、ほかは防具。0 は外す
            const out = one('actor', p[0]).concat(one('equipType', p[1]));
            if (p[2] > 0) out.push({ kind: p[1] === 1 ? 'weapon' : 'armor', id: p[2] });
            return out;
        }
        case 320: case 324: case 325: return one('actor', p[0]); // 名前・二つ名・プロフィールの変更
        case 321: return one('actor', p[0]).concat(one('class', p[1])); // 職業の変更
        case 322: { // アクターの画像変更
            const out = one('actor', p[0]);
            if (p[1]) out.push({ kind: 'face', id: Number(p[2]) || 0, faceName: String(p[1]) });
            return out;
        }
        case 331: case 332: case 342: return operand(p[2], p[3]); // 敵キャラの HP・MP・TP 増減
        case 333: return one('state', p[2]); // 敵キャラのステート変更
        case 336: return one('enemy', p[1]); // 敵キャラの変身
        case 337: return one('animation', p[1]); // 戦闘アニメーションの表示
        case 339: // 戦闘行動の強制。行動主体がアクター(1)なら p[1] はアクター
            return (p[0] === 1 ? one('actor', p[1]) : []).concat(one('skill', p[2]));
        default:
            return [];
    }
}
