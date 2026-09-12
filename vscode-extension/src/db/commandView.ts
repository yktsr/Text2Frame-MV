import { GameDatabase, DbKind, padId } from './database';
import { RpgCommand } from './commandRefs';

/**
 * コンパイル後のコマンド列を、ツクールのイベント編集画面と同じ見た目の行に組み立てる。
 * VS Code に依存しない。プレビューはこの結果を HTML にするだけ。
 *
 * 見出し(◆の後ろ)の日本語はツクール MV / MZ の表記に合わせる。番号は「#0079 名前」の形で
 * データベースの名前を添える。細かく組み立てていないコマンドも、見出しと引数は必ず出す。
 */

export interface PreviewRow {
    /** 元のコマンド列での位置。カーソルとの対応(lineMap)はこの番号で引く。 */
    index: number;
    code: number;
    indent: number;
    /** true: ◆ で始まる行 / false: 前のコマンドの続き(：で始まる行) */
    head: boolean;
    /** ◆ の後ろの見出し。続きの行では空。 */
    label: string;
    /** 見出しの後ろ(：以降)の中身。 */
    text: string;
    /** 文章の表示なら顔。 */
    face?: { name: string; index: number };
}

export const COMMAND_NAMES: Record<number, string> = {
    101: '文章', 102: '選択肢の表示', 103: '数値入力の処理', 104: 'アイテム選択の処理', 105: '文章のスクロール表示',
    108: '注釈', 109: 'スキップ', 111: '条件分岐', 112: 'ループ', 113: 'ループの中断', 115: 'イベント処理の中断',
    117: 'コモンイベント', 118: 'ラベル', 119: 'ラベルジャンプ', 121: 'スイッチの操作', 122: '変数の操作',
    123: 'セルフスイッチの操作', 124: 'タイマーの操作', 125: '所持金の増減', 126: 'アイテムの増減', 127: '武器の増減',
    128: '防具の増減', 129: 'メンバーの入れ替え', 132: '戦闘BGMの変更', 133: '勝利MEの変更', 134: 'セーブ禁止の変更',
    135: 'メニュー禁止の変更', 136: 'エンカウント禁止の変更', 137: '並び替え禁止の変更', 138: 'ウィンドウカラーの変更',
    139: '敗北MEの変更', 140: '乗り物BGMの変更', 201: '場所移動', 202: '乗り物の位置設定', 203: 'イベントの位置設定',
    204: 'マップのスクロール', 205: '移動ルートの設定', 206: '乗り物の乗降', 211: '透明状態の変更',
    212: 'アニメーションの表示', 213: 'フキダシアイコンの表示', 214: 'イベントの一時消去', 216: '隊列歩行の変更',
    217: '隊列メンバーの集合', 221: '画面のフェードアウト', 222: '画面のフェードイン', 223: '画面の色調変更',
    224: '画面のフラッシュ', 225: '画面のシェイク', 230: 'ウェイト', 231: 'ピクチャの表示', 232: 'ピクチャの移動',
    233: 'ピクチャの回転', 234: 'ピクチャの色調変更', 235: 'ピクチャの消去', 236: '天候の設定', 241: 'BGMの演奏',
    242: 'BGMのフェードアウト', 243: 'BGMの保存', 244: 'BGMの再開', 245: 'BGSの演奏', 246: 'BGSのフェードアウト',
    249: 'MEの演奏', 250: 'SEの演奏', 251: 'SEの停止', 261: 'ムービーの再生', 281: 'マップ名表示の変更',
    282: 'タイルセットの変更', 283: '戦闘背景の変更', 284: '遠景の変更', 285: '指定位置の情報取得', 301: '戦闘の処理',
    302: 'ショップの処理', 303: '名前入力の処理', 311: 'HPの増減', 312: 'MPの増減', 313: 'ステートの変更', 314: '全回復',
    315: '経験値の増減', 316: 'レベルの増減', 317: '能力値の増減', 318: 'スキルの増減', 319: '装備の変更',
    320: '名前の変更', 321: '職業の変更', 322: 'アクターの画像変更', 323: '乗り物の画像変更', 324: '二つ名の変更',
    325: 'プロフィールの変更', 326: 'TPの増減', 331: '敵キャラのHP増減', 332: '敵キャラのMP増減',
    333: '敵キャラのステート変更', 334: '敵キャラの全回復', 335: '敵キャラの出現', 336: '敵キャラの変身',
    337: '戦闘アニメーションの表示', 339: '戦闘行動の強制', 340: 'バトルの中断', 342: '敵キャラのTP増減',
    351: 'メニュー画面を開く', 352: 'セーブ画面を開く', 353: 'ゲームオーバー', 354: 'タイトル画面に戻す',
    355: 'スクリプト', 356: 'プラグインコマンド', 357: 'プラグインコマンド'
};

/** 移動ルートの中身(505 の parameters[0].code)。 */
const MOVE_NAMES: Record<number, string> = {
    1: '下に移動', 2: '左に移動', 3: '右に移動', 4: '上に移動', 5: '左下に移動', 6: '右下に移動', 7: '左上に移動',
    8: '右上に移動', 9: 'ランダムに移動', 10: 'プレイヤーに近づく', 11: 'プレイヤーから遠ざかる', 12: '一歩前進',
    13: '一歩後退', 14: 'ジャンプ', 15: 'ウェイト', 16: '下を向く', 17: '左を向く', 18: '右を向く', 19: '上を向く',
    20: '右に90度回転', 21: '左に90度回転', 22: '180度回転', 23: '右か左に90度回転', 24: 'ランダムに方向転換',
    25: 'プレイヤーの方を向く', 26: 'プレイヤーの逆を向く', 27: 'スイッチON', 28: 'スイッチOFF', 29: '移動速度の変更',
    30: '移動頻度の変更', 31: '歩行アニメON', 32: '歩行アニメOFF', 33: '足踏みアニメON', 34: '足踏みアニメOFF',
    35: '向き固定ON', 36: '向き固定OFF', 37: 'すり抜けON', 38: 'すり抜けOFF', 39: '透明化ON', 40: '透明化OFF',
    41: '画像の変更', 42: '不透明度の変更', 43: '合成方法の変更', 44: 'SEの演奏', 45: 'スクリプト'
};

const BACKGROUNDS = ['ウィンドウ', '暗くする', '透明'];
const POSITIONS = ['上', '中', '下'];
const VARIABLE_OPS = ['=', '+=', '-=', '*=', '/=', '%='];
const COMPARISONS = ['=', '≥', '≤', '>', '<', '≠'];
const ON_OFF = ['ON', 'OFF'];

/** 「#0079 名前」。名前が無ければ番号だけ、DB に無ければそう書く。DB 自体が無ければ番号だけ。 */
export function refText(db: GameDatabase | undefined, kind: DbKind, id: number): string {
    if (!db) return `#${padId(id)}`;
    const r = db.lookup(kind, id);
    if (r.status === 'named') return `#${padId(id)} ${r.name}`;
    if (r.status === 'unnamed') return `#${padId(id)}`;
    return `#${padId(id)} (データベースに無い)`;
}

const rangeText = (db: GameDatabase | undefined, kind: DbKind, a: number, b: number): string =>
    a === b ? refText(db, kind, a) : `#${padId(a)}..#${padId(b)}`;

function character(id: number): string {
    if (id === -1) return 'プレイヤー';
    if (id === 0) return 'このイベント';
    return `EV${String(id).padStart(3, '0')}`;
}

function audio(a: any): string {
    if (!a || !a.name) return 'なし';
    return `${a.name} (${a.volume}, ${a.pitch}, ${a.pan})`;
}

/** 条件分岐の条件。 */
function condition(db: GameDatabase | undefined, p: any[]): string {
    switch (p[0]) {
        case 0: return `${refText(db, 'switch', p[1])} が ${ON_OFF[p[2]] ?? p[2]}`;
        case 1: {
            const rhs = p[2] === 1 ? refText(db, 'variable', p[3]) : String(p[3]);
            return `${refText(db, 'variable', p[1])} ${COMPARISONS[p[4]] ?? '?'} ${rhs}`;
        }
        case 2: return `セルフスイッチ${p[1]} が ${ON_OFF[p[2]] ?? p[2]}`;
        case 3: return `タイマー ${p[1] === 0 ? '≥' : '≤'} ${Math.floor(p[2] / 60)}分${p[2] % 60}秒`;
        case 4: return `${refText(db, 'actor', p[1])} の条件`;
        case 5: return `敵キャラ #${p[1] + 1} の条件`;
        case 6: return `${character(p[1])} が${['', '下', '左', '右', '上'][p[2] / 2] ?? ''}向き`;
        case 7: return `所持金 ${['≥', '≤', '<'][p[2]] ?? '?'} ${p[1]}`;
        case 8: return `${refText(db, 'item', p[1])} を持っている`;
        case 9: return `${refText(db, 'weapon', p[1])} を持っている`;
        case 10: return `${refText(db, 'armor', p[1])} を持っている`;
        case 11: return `ボタン [${p[1]}] が押されている`;
        case 12: return `スクリプト：${p[1]}`;
        case 13: return `乗り物 ${p[1]} に乗っている`;
        default: return JSON.stringify(p);
    }
}

function variableOperand(db: GameDatabase | undefined, p: any[]): string {
    switch (p[3]) {
        case 0: return String(p[4]);
        case 1: return refText(db, 'variable', p[4]);
        case 2: return `乱数 ${p[4]}..${p[5]}`;
        case 3: return 'ゲームデータ';
        case 4: return `スクリプト：${p[4]}`;
        default: return JSON.stringify(p.slice(3));
    }
}

function moveStep(db: GameDatabase | undefined, step: any): string {
    if (!step) return '';
    const name = MOVE_NAMES[step.code];
    const p = step.parameters || [];
    if (step.code === 27 || step.code === 28) return `◇${name}：${refText(db, 'switch', p[0])}`;
    if (step.code === 15) return `◇${name}：${p[0]}フレーム`;
    if (step.code === 41) return `◇${name}：${p[0]}(${p[1]})`;
    if (step.code === 45) return `◇${name}：${p[0]}`;
    if (!name) return `◇(移動 ${step.code})`;
    return p.length ? `◇${name}：${p.join(', ')}` : `◇${name}`;
}

/** 1つのコマンドの見出しの後ろ。続きの行は label を空にして返す。 */
function describe(db: GameDatabase | undefined, c: RpgCommand): { head: boolean; label: string; text: string } {
    const p = c.parameters || [];
    const head = (label: string, text = '') => ({ head: true, label, text });
    const cont = (text: string) => ({ head: false, label: '', text });
    switch (c.code) {
        case 0: return head('', '');
        case 101: {
            const parts = [p[0] ? `${p[0]}(${p[1]})` : 'なし', BACKGROUNDS[p[2]] ?? String(p[2]), POSITIONS[p[3]] ?? String(p[3])];
            if (p[4]) parts.push(`名前: ${p[4]}`);
            return head('文章', parts.join(', '));
        }
        case 401: case 405: case 408: case 655: return cont(String(p[0] ?? ''));
        case 102: return head('選択肢の表示', (p[0] || []).join(', '));
        case 402: return cont(`[${p[1]}] のとき`);
        case 403: return cont('キャンセルのとき');
        case 404: case 412: case 604: return cont('分岐終了');
        case 411: return cont('それ以外のとき');
        case 413: return cont('以上繰り返し');
        case 409: return cont('スキップ終了');
        case 601: return cont('勝ったとき');
        case 602: return cont('逃げたとき');
        case 603: return cont('負けたとき');
        case 103: return head('数値入力の処理', `${refText(db, 'variable', p[0])}, ${p[1]}桁`);
        case 104: return head('アイテム選択の処理', refText(db, 'variable', p[0]));
        case 105: return head('文章のスクロール表示', `速度 ${p[0]}${p[1] ? ', 早送りなし' : ''}`);
        case 108: return head('注釈', String(p[0] ?? ''));
        case 111: return head('条件分岐', condition(db, p));
        case 117: return head('コモンイベント', refText(db, 'commonEvent', p[0]));
        case 118: case 119: return head(COMMAND_NAMES[c.code], String(p[0]));
        case 121: return head('スイッチの操作', `${rangeText(db, 'switch', p[0], p[1])} = ${ON_OFF[p[2]] ?? p[2]}`);
        case 122: return head('変数の操作', `${rangeText(db, 'variable', p[0], p[1])} ${VARIABLE_OPS[p[2]] ?? '?'} ${variableOperand(db, p)}`);
        case 123: return head('セルフスイッチの操作', `${p[0]} = ${ON_OFF[p[1]] ?? p[1]}`);
        case 126: return head('アイテムの増減', `${refText(db, 'item', p[0])} ${p[1] === 0 ? '+' : '-'} ${p[2] === 0 ? p[3] : refText(db, 'variable', p[3])}`);
        case 127: return head('武器の増減', `${refText(db, 'weapon', p[0])} ${p[1] === 0 ? '+' : '-'} ${p[2] === 0 ? p[3] : refText(db, 'variable', p[3])}`);
        case 128: return head('防具の増減', `${refText(db, 'armor', p[0])} ${p[1] === 0 ? '+' : '-'} ${p[2] === 0 ? p[3] : refText(db, 'variable', p[3])}`);
        case 129: return head('メンバーの入れ替え', `${p[1] === 0 ? '加える' : '外す'} ${refText(db, 'actor', p[0])}`);
        case 201: {
            if (p[0] === 0) {
                const map = db ? db.lookup('map', p[1]) : undefined;
                const name = map && map.status === 'named' ? map.name : `マップ${padId(p[1])}`;
                return head('場所移動', `${name} (${p[2]},${p[3]})`);
            }
            if (p[0] === 1) return head('場所移動', `{${refText(db, 'variable', p[1])}} ({${refText(db, 'variable', p[2])}},{${refText(db, 'variable', p[3])}})`);
            return head('場所移動', JSON.stringify(p));
        }
        case 205: return head('移動ルートの設定', `${character(p[0])}${p[1] && p[1].wait ? ' (ウェイト)' : ''}`);
        case 505: return cont(moveStep(db, p[0]));
        case 212: return head('アニメーションの表示', `${character(p[0])}, ${refText(db, 'animation', p[1])}${p[2] ? ' (ウェイト)' : ''}`);
        case 213: return head('フキダシアイコンの表示', `${character(p[0])}, ${p[1]}${p[2] ? ' (ウェイト)' : ''}`);
        case 211: return head('透明状態の変更', p[0] === 0 ? 'ON' : 'OFF');
        case 223: return head('画面の色調変更', `(${(p[0] || []).join(',')}), ${p[1]}フレーム${p[2] ? ' (ウェイト)' : ''}`);
        case 224: return head('画面のフラッシュ', `(${(p[0] || []).join(',')}), ${p[1]}フレーム${p[2] ? ' (ウェイト)' : ''}`);
        case 225: return head('画面のシェイク', `強さ ${p[0]}, 速さ ${p[1]}, ${p[2]}フレーム${p[3] ? ' (ウェイト)' : ''}`);
        case 242: case 246: return head(COMMAND_NAMES[c.code], `${p[0]}秒`);
        case 230: return head('ウェイト', `${p[0]}フレーム`);
        case 231: return head('ピクチャの表示', `#${p[0]}, ${p[1]}`);
        case 232: return head('ピクチャの移動', `#${p[0]}`);
        case 233: return head('ピクチャの回転', `#${p[0]}, ${p[1]}`);
        case 234: return head('ピクチャの色調変更', `#${p[0]}`);
        case 235: return head('ピクチャの消去', `#${p[0]}`);
        case 241: case 245: case 249: case 250: return head(COMMAND_NAMES[c.code], audio(p[0]));
        case 301: return head('戦闘の処理', p[0] === 0 ? refText(db, 'troop', p[1]) : p[0] === 1 ? `{${refText(db, 'variable', p[1])}}` : 'ランダムエンカウントと同じ');
        case 303: return head('名前入力の処理', `${refText(db, 'actor', p[0])}, ${p[1]}文字`);
        case 355: return head('スクリプト', String(p[0] ?? ''));
        case 356: return head('プラグインコマンド', String(p[0] ?? ''));
        case 357: return head('プラグインコマンド', `${p[0]}, ${p[2] || p[1]}`);
        case 657: return cont(String(p[0] ?? ''));
        default: {
            const label = COMMAND_NAMES[c.code];
            // 組み立てていないコマンドも落とさない。見出しが無ければコード番号で出す。
            return label ? head(label, compact(p)) : head(`(コード ${c.code})`, compact(p));
        }
    }
}

function compact(p: any[]): string {
    if (!p.length) return '';
    const s = JSON.stringify(p);
    return s.length > 80 ? s.slice(0, 77) + '...' : s;
}

export function renderCommands(commands: RpgCommand[], db?: GameDatabase): PreviewRow[] {
    return commands.map((c, index) => {
        const d = describe(db, c);
        const row: PreviewRow = { index, code: c.code, indent: c.indent || 0, head: d.head, label: d.label, text: d.text };
        const p = c.parameters || [];
        if (c.code === 101 && p[0]) row.face = { name: String(p[0]), index: Number(p[1]) || 0 };
        return row;
    });
}
