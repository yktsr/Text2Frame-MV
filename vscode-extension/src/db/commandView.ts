import { GameDatabase, DbKind, padId } from './database';
import { RpgCommand, commandRefs } from './commandRefs';
import { commandColor, cssColor, describeColor } from './colors';
import { EventLookup, eventLabel } from './describe';

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
    /** 色調・フラッシュなら色見本(CSS の色)と、その説明。 */
    swatch?: { color: string; title: string };
    /** BGM・BGS・ME・SE を鳴らすコマンドなら、その音声。プレビューの ▶ で試しに鳴らす。 */
    audio?: PreviewAudio;
}

export interface PreviewAudio {
    folder: 'bgm' | 'bgs' | 'me' | 'se';
    name: string;
    volume: number;
    pitch: number;
    pan: number;
}

/** コマンドが鳴らす音声(ツクールの audio オブジェクト)と、その置き場。 */
function commandAudio(c: RpgCommand): PreviewAudio | undefined {
    const p = c.parameters || [];
    const pick = (folder: PreviewAudio['folder'], a: any): PreviewAudio | undefined =>
        a && typeof a.name === 'string' && a.name
            ? { folder, name: a.name, volume: Number(a.volume ?? 90), pitch: Number(a.pitch ?? 100), pan: Number(a.pan ?? 0) }
            : undefined;
    switch (c.code) {
        case 241: case 132: return pick('bgm', p[0]); // BGMの演奏・戦闘曲の変更
        case 140: return pick('bgm', p[1]); // 乗り物BGMの変更
        case 245: return pick('bgs', p[0]); // BGSの演奏
        case 249: case 133: case 139: return pick('me', p[0]); // MEの演奏・勝利ME・敗北ME
        case 250: return pick('se', p[0]); // SEの演奏
        case 505: return p[0] && p[0].code === 44 ? pick('se', (p[0].parameters || [])[0]) : undefined; // 移動ルートの SE
        default: return undefined;
    }
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

// 移動速度・移動頻度・合成方法の番号(移動ルートの 29・30・43)。
const MOVE_SPEEDS = ['', '1/8倍速', '1/4倍速', '1/2倍速', '標準速', '2倍速', '4倍速'];
const MOVE_FREQUENCIES = ['', '最低', '低', '標準', '高', '最高'];
const BLEND_MODES = ['通常', '加算', '乗算', 'スクリーン'];

const BACKGROUNDS = ['ウィンドウ', '暗くする', '透明'];
const DIRECTIONS: Record<number, string> = { 0: 'そのまま', 2: '下', 4: '左', 6: '右', 8: '上' };
const FADES = ['黒', '白', 'なし'];
const BALLOONS = ['', 'びっくり', 'はてな', '音符', 'ハート', '怒り', '汗', 'くしゃくしゃ', '沈黙', '電球', 'Zzz',
    'ユーザー定義1', 'ユーザー定義2', 'ユーザー定義3', 'ユーザー定義4', 'ユーザー定義5'];
const WEATHERS: Record<string, string> = { none: 'なし', rain: '雨', storm: '嵐', snow: '雪' };
const LOCATION_INFO = ['地形タグ', 'イベントID', 'タイルID(レイヤー1)', 'タイルID(レイヤー2)', 'タイルID(レイヤー3)', 'タイルID(レイヤー4)', 'リージョンID'];
const PARAMETERS = ['最大HP', '最大MP', '攻撃力', '防御力', '魔法力', '魔法防御', '敏捷性', '運'];
const GOODS_KINDS: DbKind[] = ['item', 'weapon', 'armor'];
const DISABLE_ENABLE = ['禁止', '許可'];
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

/** キャラクターの指定。マップのイベントなら、分かれば名前と座標を添える(EV001 ヤドカリ (8,11))。 */
function character(id: number, events?: EventLookup): string {
    if (id === -1) return 'プレイヤー';
    if (id === 0) return 'このイベント';
    const label = `EV${String(id).padStart(3, '0')}`;
    if (!events) return label;
    const e = events.events[id];
    return e ? `${label} ${eventLabel(e)}` : `${label} (マップに無い)`;
}

function audio(a: any): string {
    if (!a || !a.name) return 'なし';
    return `${a.name} (${a.volume}, ${a.pitch}, ${a.pan})`;
}

/** 条件分岐の条件。 */
function condition(db: GameDatabase | undefined, p: any[], events?: EventLookup): string {
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
        case 6: return `${character(p[1], events)} が${['', '下', '左', '右', '上'][p[2] / 2] ?? ''}向き`;
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
    if (step.code === 44) return `◇${name}：${audio(p[0])}`;
    if (step.code === 14) return `◇${name}：${signed(p[0])}, ${signed(p[1])}`;
    if (step.code === 29) return `◇${name}：${MOVE_SPEEDS[p[0]] || p[0]}`;
    if (step.code === 30) return `◇${name}：${MOVE_FREQUENCIES[p[0]] || p[0]}`;
    if (step.code === 43) return `◇${name}：${BLEND_MODES[p[0]] ?? p[0]}`;
    if (!name) return `◇(移動 ${step.code})`;
    return p.length ? `◇${name}：${p.join(', ')}` : `◇${name}`;
}

/** ジャンプの量。ツクールと同じく +1 / -1 の形。 */
function signed(v: unknown): string {
    const n = Number(v) || 0;
    return n >= 0 ? `+${n}` : String(n);
}

/** アクターの指定(固定 0 / 変数 1)。固定の 0 はパーティ全体。 */
function actorTarget(db: GameDatabase | undefined, designation: number, id: number): string {
    if (designation === 1) return `{${refText(db, 'variable', id)}}`;
    return id === 0 ? 'パーティ全体' : refText(db, 'actor', id);
}

/** 増減の量(定数 0 / 変数 1)を ± 付きで。 */
function amount(db: GameDatabase | undefined, operation: number, type: number, value: number): string {
    return `${operation === 0 ? '+' : '-'} ${type === 1 ? refText(db, 'variable', value) : value}`;
}

/** 1つのコマンドの見出しの後ろ。続きの行は label を空にして返す。 */
function describe(db: GameDatabase | undefined, c: RpgCommand, events?: EventLookup): { head: boolean; label: string; text: string } {
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
        case 111: return head('条件分岐', condition(db, p, events));
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
            const options = `, 向き ${DIRECTIONS[p[4]] ?? p[4]}, フェード ${FADES[p[5]] ?? p[5]}`;
            if (p[0] === 0) {
                const map = db ? db.lookup('map', p[1]) : undefined;
                const name = map && map.status === 'named' ? map.name : `マップ${padId(p[1])}`;
                return head('場所移動', `${name} (${p[2]},${p[3]})${options}`);
            }
            if (p[0] === 1) return head('場所移動', `{${refText(db, 'variable', p[1])}} ({${refText(db, 'variable', p[2])}},{${refText(db, 'variable', p[3])}})${options}`);
            return head('場所移動', JSON.stringify(p));
        }
        case 124: return head('タイマーの操作', p[0] === 0 ? `スタート, ${Math.floor(p[1] / 60)}分${p[1] % 60}秒` : 'ストップ');
        case 125: return head('所持金の増減', amount(db, p[0], p[1], p[2]));
        case 134: case 135: case 136: case 137: return head(COMMAND_NAMES[c.code], DISABLE_ENABLE[p[0]] ?? String(p[0]));
        case 204: return head('マップのスクロール', `${DIRECTIONS[p[0]] ?? p[0]}, ${p[1]}, ${MOVE_SPEEDS[p[2]] || p[2]}${p[3] ? ' (ウェイト)' : ''}`);
        case 216: return head('隊列歩行の変更', p[0] === 0 ? 'ON' : 'OFF');
        case 236: return head('天候の設定', `${WEATHERS[p[0]] ?? p[0]}, 強さ ${p[1]}, ${p[2]}フレーム${p[3] ? ' (ウェイト)' : ''}`);
        case 282: return head('タイルセットの変更', refText(db, 'tileset', p[0]));
        case 285: {
            const where = p[2] === 0 ? `(${p[3]},${p[4]})` : p[2] === 1 ? `({${refText(db, 'variable', p[3])}},{${refText(db, 'variable', p[4])}})` : character(p[3], events);
            return head('指定位置の情報取得', `${refText(db, 'variable', p[0])}, ${LOCATION_INFO[p[1]] ?? p[1]}, ${where}`);
        }
        case 302: case 605: {
            const goods = GOODS_KINDS[p[0]];
            const text = goods && p[1] > 0 ? `${refText(db, goods, p[1])}${p[2] === 1 ? `, 価格 ${p[3]}` : ''}` : '';
            if (c.code === 605) return cont(text);
            return head('ショップの処理', `${text}${p[4] ? (text ? ', ' : '') + '購入のみ' : ''}`);
        }
        case 311: case 312: case 326: case 315: case 316: {
            const extra = c.code === 311 && p[5] ? ' (戦闘不能を許可)' : (c.code === 315 || c.code === 316) && p[5] ? ' (レベルアップを表示)' : '';
            return head(COMMAND_NAMES[c.code], `${actorTarget(db, p[0], p[1])}, ${amount(db, p[2], p[3], p[4])}${extra}`);
        }
        case 313: return head('ステートの変更', `${actorTarget(db, p[0], p[1])}, ${p[2] === 0 ? '+' : '-'} ${refText(db, 'state', p[3])}`);
        case 314: return head('全回復', actorTarget(db, p[0], p[1]));
        case 317: return head('能力値の増減', `${actorTarget(db, p[0], p[1])}, ${PARAMETERS[p[2]] ?? p[2]} ${amount(db, p[3], p[4], p[5])}`);
        case 318: return head('スキルの増減', `${actorTarget(db, p[0], p[1])}, ${p[2] === 0 ? '覚える' : '忘れる'} ${refText(db, 'skill', p[3])}`);
        case 319: {
            const item = p[2] > 0 ? refText(db, p[1] === 1 ? 'weapon' : 'armor', p[2]) : 'なし';
            return head('装備の変更', `${refText(db, 'actor', p[0])}, ${refText(db, 'equipType', p[1])} = ${item}`);
        }
        case 320: case 324: case 325: return head(COMMAND_NAMES[c.code], `${refText(db, 'actor', p[0])}, ${String(p[1] ?? '').replace(/\n/g, ' / ')}`);
        case 321: return head('職業の変更', `${refText(db, 'actor', p[0])}, ${refText(db, 'class', p[1])}${p[2] ? ' (レベルを保存)' : ''}`);
        case 322: return head('アクターの画像変更', `${refText(db, 'actor', p[0])}, 顔 ${p[1] ? `${p[1]}(${p[2]})` : 'なし'}, 歩行 ${p[3] ? `${p[3]}(${p[4]})` : 'なし'}, 戦闘 ${p[5] || 'なし'}`);
        case 202: { // 乗り物の位置設定
            const where = p[1] === 0 ? `${refText(db, 'map', p[2])} (${p[3]},${p[4]})`
                : `{${refText(db, 'variable', p[2])}} ({${refText(db, 'variable', p[3])}},{${refText(db, 'variable', p[4])}})`;
            return head('乗り物の位置設定', `${['小型船', '大型船', '飛行船'][p[0]] ?? p[0]}, ${where}`);
        }
        case 203: { // イベントの位置設定
            const where = p[1] === 0 ? `(${p[2]},${p[3]})`
                : p[1] === 1 ? `({${refText(db, 'variable', p[2])}},{${refText(db, 'variable', p[3])}})` : `${character(p[2], events)} と交換`;
            return head('イベントの位置設定', `${character(p[0], events)}, ${where}, 向き ${DIRECTIONS[p[4]] ?? p[4]}`);
        }
        case 205: return head('移動ルートの設定', `${character(p[0], events)}${p[1] && p[1].wait ? ' (ウェイト)' : ''}`);
        case 505: return cont(moveStep(db, p[0]));
        case 212: return head('アニメーションの表示', `${character(p[0], events)}, ${refText(db, 'animation', p[1])}${p[2] ? ' (ウェイト)' : ''}`);
        case 213: return head('フキダシアイコンの表示', `${character(p[0], events)}, ${BALLOONS[p[1]] || p[1]}${p[2] ? ' (ウェイト)' : ''}`);
        case 211: return head('透明状態の変更', p[0] === 0 ? 'ON' : 'OFF');
        case 138: return head('ウィンドウカラーの変更', `(${(p[0] || []).slice(0, 3).join(',')})`);
        case 223: return head('画面の色調変更', `(${(p[0] || []).join(',')}), ${p[1]}フレーム${p[2] ? ' (ウェイト)' : ''}`);
        case 224: return head('画面のフラッシュ', `(${(p[0] || []).join(',')}), ${p[1]}フレーム${p[2] ? ' (ウェイト)' : ''}`);
        case 225: return head('画面のシェイク', `強さ ${p[0]}, 速さ ${p[1]}, ${p[2]}フレーム${p[3] ? ' (ウェイト)' : ''}`);
        case 242: case 246: return head(COMMAND_NAMES[c.code], `${p[0]}秒`);
        case 230: return head('ウェイト', `${p[0]}フレーム`);
        case 231: return head('ピクチャの表示', `#${p[0]}, ${p[1]}`);
        case 232: return head('ピクチャの移動', `#${p[0]}`);
        case 233: return head('ピクチャの回転', `#${p[0]}, ${p[1]}`);
        case 234: return head('ピクチャの色調変更', `#${p[0]}, (${(p[1] || []).join(',')}), ${p[2]}フレーム${p[3] ? ' (ウェイト)' : ''}`);
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
            // データベースの番号を持つなら、引数の後ろに名前を添える。
            const names = commandRefs(c).filter((r) => r.kind !== 'face' && r.kind !== 'event' && r.kind !== 'icon')
                .map((r) => refText(db, r.kind as DbKind, r.id));
            const text = compact(p) + (names.length ? `  ${names.join(', ')}` : '');
            return label ? head(label, text) : head(`(コード ${c.code})`, text);
        }
    }
}

function compact(p: any[]): string {
    if (!p.length) return '';
    const s = JSON.stringify(p);
    return s.length > 80 ? s.slice(0, 77) + '...' : s;
}

export function renderCommands(commands: RpgCommand[], db?: GameDatabase, events?: EventLookup): PreviewRow[] {
    return commands.map((c, index) => {
        const d = describe(db, c, events);
        const row: PreviewRow = { index, code: c.code, indent: c.indent || 0, head: d.head, label: d.label, text: d.text };
        const p = c.parameters || [];
        if (c.code === 101 && p[0]) row.face = { name: String(p[0]), index: Number(p[1]) || 0 };
        if (c.code === 322 && p[1]) row.face = { name: String(p[1]), index: Number(p[2]) || 0 };
        const sound = commandAudio(c);
        if (sound) row.audio = sound;
        const color = commandColor(c);
        if (color) row.swatch = { color: cssColor(color.swatch), title: describeColor(color.kind, color.values) };
        return row;
    });
}
