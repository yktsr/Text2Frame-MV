import { GameDatabase, DbKind, padId } from './database';
import { RpgCommand, commandRefs } from './commandRefs';
import { commandColor, cssColor, describeColor } from './colors';
import { EventLookup, eventLabel } from './describe';
import { isJapanese, pick, tr } from './lang';

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
    /** 文章がウィンドウからはみ出すときの知らせ。 */
    warn?: string;
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

/** 見出しの名前。[日本語, 英語]。英語は英語版ツクールの表記に合わせる。 */
const COMMAND_NAMES: Record<number, readonly [string, string]> = {
    101: ['文章', 'Text'], 102: ['選択肢の表示', 'Show Choices'], 103: ['数値入力の処理', 'Input Number'],
    104: ['アイテム選択の処理', 'Select Item'], 105: ['文章のスクロール表示', 'Show Scrolling Text'],
    108: ['注釈', 'Comment'], 109: ['スキップ', 'Skip'], 111: ['条件分岐', 'If'], 112: ['ループ', 'Loop'],
    113: ['ループの中断', 'Break Loop'], 115: ['イベント処理の中断', 'Exit Event Processing'],
    117: ['コモンイベント', 'Common Event'], 118: ['ラベル', 'Label'], 119: ['ラベルジャンプ', 'Jump to Label'],
    121: ['スイッチの操作', 'Control Switches'], 122: ['変数の操作', 'Control Variables'],
    123: ['セルフスイッチの操作', 'Control Self Switch'], 124: ['タイマーの操作', 'Control Timer'],
    125: ['所持金の増減', 'Change Gold'], 126: ['アイテムの増減', 'Change Items'], 127: ['武器の増減', 'Change Weapons'],
    128: ['防具の増減', 'Change Armors'], 129: ['メンバーの入れ替え', 'Change Party Member'],
    132: ['戦闘BGMの変更', 'Change Battle BGM'], 133: ['勝利MEの変更', 'Change Victory ME'],
    134: ['セーブ禁止の変更', 'Change Save Access'], 135: ['メニュー禁止の変更', 'Change Menu Access'],
    136: ['エンカウント禁止の変更', 'Change Encounter'], 137: ['並び替え禁止の変更', 'Change Formation Access'],
    138: ['ウィンドウカラーの変更', 'Change Window Color'], 139: ['敗北MEの変更', 'Change Defeat ME'],
    140: ['乗り物BGMの変更', 'Change Vehicle BGM'], 201: ['場所移動', 'Transfer Player'],
    202: ['乗り物の位置設定', 'Set Vehicle Location'], 203: ['イベントの位置設定', 'Set Event Location'],
    204: ['マップのスクロール', 'Scroll Map'], 205: ['移動ルートの設定', 'Set Movement Route'],
    206: ['乗り物の乗降', 'Get on/off Vehicle'], 211: ['透明状態の変更', 'Change Transparency'],
    212: ['アニメーションの表示', 'Show Animation'], 213: ['フキダシアイコンの表示', 'Show Balloon Icon'],
    214: ['イベントの一時消去', 'Erase Event'], 216: ['隊列歩行の変更', 'Change Player Followers'],
    217: ['隊列メンバーの集合', 'Gather Followers'], 221: ['画面のフェードアウト', 'Fadeout Screen'],
    222: ['画面のフェードイン', 'Fadein Screen'], 223: ['画面の色調変更', 'Tint Screen'],
    224: ['画面のフラッシュ', 'Flash Screen'], 225: ['画面のシェイク', 'Shake Screen'], 230: ['ウェイト', 'Wait'],
    231: ['ピクチャの表示', 'Show Picture'], 232: ['ピクチャの移動', 'Move Picture'], 233: ['ピクチャの回転', 'Rotate Picture'],
    234: ['ピクチャの色調変更', 'Tint Picture'], 235: ['ピクチャの消去', 'Erase Picture'],
    236: ['天候の設定', 'Set Weather Effect'], 241: ['BGMの演奏', 'Play BGM'], 242: ['BGMのフェードアウト', 'Fadeout BGM'],
    243: ['BGMの保存', 'Save BGM'], 244: ['BGMの再開', 'Resume BGM'], 245: ['BGSの演奏', 'Play BGS'],
    246: ['BGSのフェードアウト', 'Fadeout BGS'], 249: ['MEの演奏', 'Play ME'], 250: ['SEの演奏', 'Play SE'],
    251: ['SEの停止', 'Stop SE'], 261: ['ムービーの再生', 'Play Movie'], 281: ['マップ名表示の変更', 'Change Map Name Display'],
    282: ['タイルセットの変更', 'Change Tileset'], 283: ['戦闘背景の変更', 'Change Battle Background'],
    284: ['遠景の変更', 'Change Parallax'], 285: ['指定位置の情報取得', 'Get Location Info'],
    301: ['戦闘の処理', 'Battle Processing'], 302: ['ショップの処理', 'Shop Processing'],
    303: ['名前入力の処理', 'Name Input Processing'], 311: ['HPの増減', 'Change HP'], 312: ['MPの増減', 'Change MP'],
    313: ['ステートの変更', 'Change State'], 314: ['全回復', 'Recover All'], 315: ['経験値の増減', 'Change EXP'],
    316: ['レベルの増減', 'Change Level'], 317: ['能力値の増減', 'Change Parameter'], 318: ['スキルの増減', 'Change Skill'],
    319: ['装備の変更', 'Change Equipment'], 320: ['名前の変更', 'Change Name'], 321: ['職業の変更', 'Change Class'],
    322: ['アクターの画像変更', 'Change Actor Images'], 323: ['乗り物の画像変更', 'Change Vehicle Image'],
    324: ['二つ名の変更', 'Change Nickname'], 325: ['プロフィールの変更', 'Change Profile'], 326: ['TPの増減', 'Change TP'],
    331: ['敵キャラのHP増減', 'Change Enemy HP'], 332: ['敵キャラのMP増減', 'Change Enemy MP'],
    333: ['敵キャラのステート変更', 'Change Enemy State'], 334: ['敵キャラの全回復', 'Enemy Recover All'],
    335: ['敵キャラの出現', 'Enemy Appear'], 336: ['敵キャラの変身', 'Enemy Transform'],
    337: ['戦闘アニメーションの表示', 'Show Battle Animation'], 339: ['戦闘行動の強制', 'Force Action'],
    340: ['バトルの中断', 'Abort Battle'], 342: ['敵キャラのTP増減', 'Change Enemy TP'],
    351: ['メニュー画面を開く', 'Open Menu Screen'], 352: ['セーブ画面を開く', 'Open Save Screen'],
    353: ['ゲームオーバー', 'Game Over'], 354: ['タイトル画面に戻す', 'Return to Title Screen'],
    355: ['スクリプト', 'Script'], 356: ['プラグインコマンド', 'Plugin Command'], 357: ['プラグインコマンド', 'Plugin Command']
};

/** コマンドの見出しの名前(今の言語)。表に無ければ undefined。 */
export function commandName(code: number): string | undefined {
    const pair = COMMAND_NAMES[code];
    return pair ? pick(pair) : undefined;
}

/** [日本語, 英語] の表から、番号で今の言語の方を引く。 */
function table<K extends string | number>(ja: Record<K, string> | string[], en: Record<K, string> | string[]): (key: K) => string | undefined {
    return (key: K) => (isJapanese() ? (ja as any)[key] : (en as any)[key]);
}

/** 移動ルートの中身(505 の parameters[0].code)。 */
const MOVE_NAMES = table<number>({
    1: '下に移動', 2: '左に移動', 3: '右に移動', 4: '上に移動', 5: '左下に移動', 6: '右下に移動', 7: '左上に移動',
    8: '右上に移動', 9: 'ランダムに移動', 10: 'プレイヤーに近づく', 11: 'プレイヤーから遠ざかる', 12: '一歩前進',
    13: '一歩後退', 14: 'ジャンプ', 15: 'ウェイト', 16: '下を向く', 17: '左を向く', 18: '右を向く', 19: '上を向く',
    20: '右に90度回転', 21: '左に90度回転', 22: '180度回転', 23: '右か左に90度回転', 24: 'ランダムに方向転換',
    25: 'プレイヤーの方を向く', 26: 'プレイヤーの逆を向く', 27: 'スイッチON', 28: 'スイッチOFF', 29: '移動速度の変更',
    30: '移動頻度の変更', 31: '歩行アニメON', 32: '歩行アニメOFF', 33: '足踏みアニメON', 34: '足踏みアニメOFF',
    35: '向き固定ON', 36: '向き固定OFF', 37: 'すり抜けON', 38: 'すり抜けOFF', 39: '透明化ON', 40: '透明化OFF',
    41: '画像の変更', 42: '不透明度の変更', 43: '合成方法の変更', 44: 'SEの演奏', 45: 'スクリプト'
}, {
    1: 'Move Down', 2: 'Move Left', 3: 'Move Right', 4: 'Move Up', 5: 'Move Lower Left', 6: 'Move Lower Right', 7: 'Move Upper Left',
    8: 'Move Upper Right', 9: 'Move at Random', 10: 'Move toward Player', 11: 'Move away from Player', 12: '1 Step Forward',
    13: '1 Step Backward', 14: 'Jump', 15: 'Wait', 16: 'Turn Down', 17: 'Turn Left', 18: 'Turn Right', 19: 'Turn Up',
    20: 'Turn 90° Right', 21: 'Turn 90° Left', 22: 'Turn 180°', 23: 'Turn 90° Right or Left', 24: 'Turn at Random',
    25: 'Turn toward Player', 26: 'Turn away from Player', 27: 'Switch ON', 28: 'Switch OFF', 29: 'Change Speed',
    30: 'Change Frequency', 31: 'Walking Animation ON', 32: 'Walking Animation OFF', 33: 'Stepping Animation ON', 34: 'Stepping Animation OFF',
    35: 'Direction Fix ON', 36: 'Direction Fix OFF', 37: 'Through ON', 38: 'Through OFF', 39: 'Transparent ON', 40: 'Transparent OFF',
    41: 'Change Image', 42: 'Change Opacity', 43: 'Change Blend Mode', 44: 'Play SE', 45: 'Script'
});

// 移動速度・移動頻度・合成方法の番号(移動ルートの 29・30・43)。
const MOVE_SPEEDS = table<number>(['', '1/8倍速', '1/4倍速', '1/2倍速', '標準速', '2倍速', '4倍速'],
    ['', 'x8 Slower', 'x4 Slower', 'x2 Slower', 'Normal', 'x2 Faster', 'x4 Faster']);
const MOVE_FREQUENCIES = table<number>(['', '最低', '低', '標準', '高', '最高'], ['', 'Lowest', 'Lower', 'Normal', 'Higher', 'Highest']);
const BLEND_MODES = table<number>(['通常', '加算', '乗算', 'スクリーン'], ['Normal', 'Additive', 'Multiply', 'Screen']);

const BACKGROUNDS = table<number>(['ウィンドウ', '暗くする', '透明'], ['Window', 'Dim', 'Transparent']);
const DIRECTIONS = table<number>({ 0: 'そのまま', 2: '下', 4: '左', 6: '右', 8: '上' }, { 0: 'Retain', 2: 'Down', 4: 'Left', 6: 'Right', 8: 'Up' });
const FADES = table<number>(['黒', '白', 'なし'], ['Black', 'White', 'None']);
const BALLOONS = table<number>(['', 'びっくり', 'はてな', '音符', 'ハート', '怒り', '汗', 'くしゃくしゃ', '沈黙', '電球', 'Zzz',
    'ユーザー定義1', 'ユーザー定義2', 'ユーザー定義3', 'ユーザー定義4', 'ユーザー定義5'],
['', 'Exclamation', 'Question', 'Music Note', 'Heart', 'Anger', 'Sweat', 'Frustration', 'Silence', 'Light Bulb', 'Zzz',
    'User-defined 1', 'User-defined 2', 'User-defined 3', 'User-defined 4', 'User-defined 5']);
const WEATHERS = table<string>({ none: 'なし', rain: '雨', storm: '嵐', snow: '雪' }, { none: 'None', rain: 'Rain', storm: 'Storm', snow: 'Snow' });
const LOCATION_INFO = table<number>(['地形タグ', 'イベントID', 'タイルID(レイヤー1)', 'タイルID(レイヤー2)', 'タイルID(レイヤー3)', 'タイルID(レイヤー4)', 'リージョンID'],
    ['Terrain Tag', 'Event ID', 'Tile ID (Layer 1)', 'Tile ID (Layer 2)', 'Tile ID (Layer 3)', 'Tile ID (Layer 4)', 'Region ID']);
const PARAMETERS = table<number>(['最大HP', '最大MP', '攻撃力', '防御力', '魔法力', '魔法防御', '敏捷性', '運'],
    ['Max HP', 'Max MP', 'Attack', 'Defense', 'M.Attack', 'M.Defense', 'Agility', 'Luck']);
const GOODS_KINDS: DbKind[] = ['item', 'weapon', 'armor'];
const DISABLE_ENABLE = table<number>(['禁止', '許可'], ['Disable', 'Enable']);
const POSITIONS = table<number>(['上', '中', '下'], ['Top', 'Middle', 'Bottom']);
const VEHICLES = table<number>(['小型船', '大型船', '飛行船'], ['Boat', 'Ship', 'Airship']);
const FACING = table<number>(['', '下', '左', '右', '上'], ['', 'Down', 'Left', 'Right', 'Up']);
const VARIABLE_OPS = ['=', '+=', '-=', '*=', '/=', '%='];
const COMPARISONS = ['=', '≥', '≤', '>', '<', '≠'];
const ON_OFF = ['ON', 'OFF'];

/** 「(ウェイト)」。多くのコマンドの後ろに付く。 */
const waitMark = (on: unknown): string => (on ? tr(' (ウェイト)', ' (Wait)') : '');
/** 「60フレーム」。 */
const frames = (n: unknown): string => tr(`${n}フレーム`, `${n} frames`);
/** 「1分10秒」。 */
const minSec = (s: number): string => tr(`${Math.floor(s / 60)}分${s % 60}秒`, `${Math.floor(s / 60)} min ${s % 60} sec`);

/** 「#0079 名前」。名前が無ければ番号だけ、DB に無ければそう書く。DB 自体が無ければ番号だけ。 */
export function refText(db: GameDatabase | undefined, kind: DbKind, id: number): string {
    if (!db) return `#${padId(id)}`;
    const r = db.lookup(kind, id);
    if (r.status === 'named') return `#${padId(id)} ${r.name}`;
    if (r.status === 'unnamed') return `#${padId(id)}`;
    return `#${padId(id)} ${tr('(データベースに無い)', '(not in the database)')}`;
}

const rangeText = (db: GameDatabase | undefined, kind: DbKind, a: number, b: number): string =>
    a === b ? refText(db, kind, a) : `#${padId(a)}..#${padId(b)}`;

/** キャラクターの指定。マップのイベントなら、分かれば名前と座標を添える(EV001 ヤドカリ (8,11))。 */
function character(id: number, events?: EventLookup): string {
    if (id === -1) return tr('プレイヤー', 'Player');
    if (id === 0) return tr('このイベント', 'This Event');
    const label = `EV${String(id).padStart(3, '0')}`;
    if (!events) return label;
    const e = events.events[id];
    return e ? `${label} ${eventLabel(e)}` : `${label} ${tr('(マップに無い)', '(not on the map)')}`;
}

function audio(a: any): string {
    if (!a || !a.name) return tr('なし', 'None');
    return `${a.name} (${a.volume}, ${a.pitch}, ${a.pan})`;
}

/** 条件分岐の条件。 */
function condition(db: GameDatabase | undefined, p: any[], events?: EventLookup): string {
    switch (p[0]) {
        case 0: return tr(`${refText(db, 'switch', p[1])} が ${ON_OFF[p[2]] ?? p[2]}`, `${refText(db, 'switch', p[1])} is ${ON_OFF[p[2]] ?? p[2]}`);
        case 1: {
            const rhs = p[2] === 1 ? refText(db, 'variable', p[3]) : String(p[3]);
            return `${refText(db, 'variable', p[1])} ${COMPARISONS[p[4]] ?? '?'} ${rhs}`;
        }
        case 2: return tr(`セルフスイッチ${p[1]} が ${ON_OFF[p[2]] ?? p[2]}`, `Self Switch ${p[1]} is ${ON_OFF[p[2]] ?? p[2]}`);
        case 3: return tr(`タイマー ${p[1] === 0 ? '≥' : '≤'} ${minSec(p[2])}`, `Timer ${p[1] === 0 ? '≥' : '≤'} ${minSec(p[2])}`);
        case 4: return tr(`${refText(db, 'actor', p[1])} の条件`, `${refText(db, 'actor', p[1])} condition`);
        case 5: return tr(`敵キャラ #${p[1] + 1} の条件`, `Enemy #${p[1] + 1} condition`);
        case 6: return tr(`${character(p[1], events)} が${FACING(p[2] / 2) ?? ''}向き`, `${character(p[1], events)} is facing ${FACING(p[2] / 2) ?? ''}`);
        case 7: return tr(`所持金 ${['≥', '≤', '<'][p[2]] ?? '?'} ${p[1]}`, `Gold ${['≥', '≤', '<'][p[2]] ?? '?'} ${p[1]}`);
        case 8: return tr(`${refText(db, 'item', p[1])} を持っている`, `Party has ${refText(db, 'item', p[1])}`);
        case 9: return tr(`${refText(db, 'weapon', p[1])} を持っている`, `Party has ${refText(db, 'weapon', p[1])}`);
        case 10: return tr(`${refText(db, 'armor', p[1])} を持っている`, `Party has ${refText(db, 'armor', p[1])}`);
        case 11: return tr(`ボタン [${p[1]}] が押されている`, `Button [${p[1]}] is pressed`);
        case 12: return tr(`スクリプト：${p[1]}`, `Script: ${p[1]}`);
        case 13: return tr(`乗り物 ${p[1]} に乗っている`, `Riding vehicle ${p[1]}`);
        default: return JSON.stringify(p);
    }
}

function variableOperand(db: GameDatabase | undefined, p: any[]): string {
    switch (p[3]) {
        case 0: return String(p[4]);
        case 1: return refText(db, 'variable', p[4]);
        case 2: return tr(`乱数 ${p[4]}..${p[5]}`, `Random ${p[4]}..${p[5]}`);
        case 3: return tr('ゲームデータ', 'Game Data');
        case 4: return tr(`スクリプト：${p[4]}`, `Script: ${p[4]}`);
        default: return JSON.stringify(p.slice(3));
    }
}

function moveStep(db: GameDatabase | undefined, step: any): string {
    if (!step) return '';
    const name = MOVE_NAMES(step.code);
    const p = step.parameters || [];
    const sep = tr('：', ': ');
    if (step.code === 27 || step.code === 28) return `◇${name}${sep}${refText(db, 'switch', p[0])}`;
    if (step.code === 15) return `◇${name}${sep}${frames(p[0])}`;
    if (step.code === 41) return `◇${name}${sep}${p[0]}(${p[1]})`;
    if (step.code === 45) return `◇${name}${sep}${p[0]}`;
    if (step.code === 44) return `◇${name}${sep}${audio(p[0])}`;
    if (step.code === 14) return `◇${name}${sep}${signed(p[0])}, ${signed(p[1])}`;
    if (step.code === 29) return `◇${name}${sep}${MOVE_SPEEDS(p[0]) || p[0]}`;
    if (step.code === 30) return `◇${name}${sep}${MOVE_FREQUENCIES(p[0]) || p[0]}`;
    if (step.code === 43) return `◇${name}${sep}${BLEND_MODES(p[0]) ?? p[0]}`;
    if (!name) return tr(`◇(移動 ${step.code})`, `◇(move ${step.code})`);
    return p.length ? `◇${name}${sep}${p.join(', ')}` : `◇${name}`;
}

/** ジャンプの量。ツクールと同じく +1 / -1 の形。 */
function signed(v: unknown): string {
    const n = Number(v) || 0;
    return n >= 0 ? `+${n}` : String(n);
}

/** アクターの指定(固定 0 / 変数 1)。固定の 0 はパーティ全体。 */
function actorTarget(db: GameDatabase | undefined, designation: number, id: number): string {
    if (designation === 1) return `{${refText(db, 'variable', id)}}`;
    return id === 0 ? tr('パーティ全体', 'Entire Party') : refText(db, 'actor', id);
}

/** 増減の量(定数 0 / 変数 1)を ± 付きで。 */
function amount(db: GameDatabase | undefined, operation: number, type: number, value: number): string {
    return `${operation === 0 ? '+' : '-'} ${type === 1 ? refText(db, 'variable', value) : value}`;
}

/** 1つのコマンドの見出しの後ろ。続きの行は label を空にして返す。 */
function describe(db: GameDatabase | undefined, c: RpgCommand, events?: EventLookup): { head: boolean; label: string; text: string } {
    const p = c.parameters || [];
    // 見出しの名前は表から引く(日本語と英語はそこに並べてある)。
    const name = commandName(c.code) || '';
    const head = (text = '') => ({ head: true, label: name, text });
    const cont = (text: string) => ({ head: false, label: '', text });
    const none = tr('なし', 'None');
    switch (c.code) {
        case 0: return { head: true, label: '', text: '' };
        case 101: {
            const parts = [p[0] ? `${p[0]}(${p[1]})` : none, BACKGROUNDS(p[2]) ?? String(p[2]), POSITIONS(p[3]) ?? String(p[3])];
            if (p[4]) parts.push(tr(`名前: ${p[4]}`, `Name: ${p[4]}`));
            return head(parts.join(', '));
        }
        case 401: case 405: case 408: case 655: return cont(String(p[0] ?? ''));
        case 102: return head((p[0] || []).join(', '));
        case 402: return cont(tr(`[${p[1]}] のとき`, `When [${p[1]}]`));
        case 403: return cont(tr('キャンセルのとき', 'When Cancel'));
        case 404: case 412: case 604: return cont(tr('分岐終了', 'End'));
        case 411: return cont(tr('それ以外のとき', 'Else'));
        case 413: return cont(tr('以上繰り返し', 'Repeat Above'));
        case 409: return cont(tr('スキップ終了', 'End Skip'));
        case 601: return cont(tr('勝ったとき', 'If Win'));
        case 602: return cont(tr('逃げたとき', 'If Escape'));
        case 603: return cont(tr('負けたとき', 'If Lose'));
        case 103: return head(tr(`${refText(db, 'variable', p[0])}, ${p[1]}桁`, `${refText(db, 'variable', p[0])}, ${p[1]} digits`));
        case 104: return head(refText(db, 'variable', p[0]));
        case 105: return head(tr(`速度 ${p[0]}${p[1] ? ', 早送りなし' : ''}`, `Speed ${p[0]}${p[1] ? ', No Fast Forward' : ''}`));
        case 108: return head(String(p[0] ?? ''));
        case 111: return head(condition(db, p, events));
        case 117: return head(refText(db, 'commonEvent', p[0]));
        case 118: case 119: return head(String(p[0]));
        case 121: return head(`${rangeText(db, 'switch', p[0], p[1])} = ${ON_OFF[p[2]] ?? p[2]}`);
        case 122: return head(`${rangeText(db, 'variable', p[0], p[1])} ${VARIABLE_OPS[p[2]] ?? '?'} ${variableOperand(db, p)}`);
        case 123: return head(`${p[0]} = ${ON_OFF[p[1]] ?? p[1]}`);
        case 126: return head(`${refText(db, 'item', p[0])} ${p[1] === 0 ? '+' : '-'} ${p[2] === 0 ? p[3] : refText(db, 'variable', p[3])}`);
        case 127: return head(`${refText(db, 'weapon', p[0])} ${p[1] === 0 ? '+' : '-'} ${p[2] === 0 ? p[3] : refText(db, 'variable', p[3])}`);
        case 128: return head(`${refText(db, 'armor', p[0])} ${p[1] === 0 ? '+' : '-'} ${p[2] === 0 ? p[3] : refText(db, 'variable', p[3])}`);
        case 129: return head(`${p[1] === 0 ? tr('加える', 'Add') : tr('外す', 'Remove')} ${refText(db, 'actor', p[0])}`);
        case 201: {
            const options = tr(`, 向き ${DIRECTIONS(p[4]) ?? p[4]}, フェード ${FADES(p[5]) ?? p[5]}`, `, Direction ${DIRECTIONS(p[4]) ?? p[4]}, Fade ${FADES(p[5]) ?? p[5]}`);
            if (p[0] === 0) {
                const map = db ? db.lookup('map', p[1]) : undefined;
                const mapName = map && map.status === 'named' ? map.name : tr(`マップ${padId(p[1])}`, `Map${padId(p[1])}`);
                return head(`${mapName} (${p[2]},${p[3]})${options}`);
            }
            if (p[0] === 1) return head(`{${refText(db, 'variable', p[1])}} ({${refText(db, 'variable', p[2])}},{${refText(db, 'variable', p[3])}})${options}`);
            return head(JSON.stringify(p));
        }
        case 124: return head(p[0] === 0 ? tr(`スタート, ${minSec(p[1])}`, `Start, ${minSec(p[1])}`) : tr('ストップ', 'Stop'));
        case 125: return head(amount(db, p[0], p[1], p[2]));
        case 134: case 135: case 136: case 137: return head(DISABLE_ENABLE(p[0]) ?? String(p[0]));
        case 204: return head(`${DIRECTIONS(p[0]) ?? p[0]}, ${p[1]}, ${MOVE_SPEEDS(p[2]) || p[2]}${waitMark(p[3])}`);
        case 216: return head(p[0] === 0 ? 'ON' : 'OFF');
        case 236: return head(tr(`${WEATHERS(p[0]) ?? p[0]}, 強さ ${p[1]}, ${frames(p[2])}`, `${WEATHERS(p[0]) ?? p[0]}, Power ${p[1]}, ${frames(p[2])}`) + waitMark(p[3]));
        case 282: return head(refText(db, 'tileset', p[0]));
        case 285: {
            const where = p[2] === 0 ? `(${p[3]},${p[4]})` : p[2] === 1 ? `({${refText(db, 'variable', p[3])}},{${refText(db, 'variable', p[4])}})` : character(p[3], events);
            return head(`${refText(db, 'variable', p[0])}, ${LOCATION_INFO(p[1]) ?? p[1]}, ${where}`);
        }
        case 302: case 605: {
            const goods = GOODS_KINDS[p[0]];
            const text = goods && p[1] > 0 ? `${refText(db, goods, p[1])}${p[2] === 1 ? tr(`, 価格 ${p[3]}`, `, Price ${p[3]}`) : ''}` : '';
            if (c.code === 605) return cont(text);
            return head(`${text}${p[4] ? (text ? ', ' : '') + tr('購入のみ', 'Purchase Only') : ''}`);
        }
        case 311: case 312: case 326: case 315: case 316: {
            const extra = c.code === 311 && p[5] ? tr(' (戦闘不能を許可)', ' (Allow Knockout)') : (c.code === 315 || c.code === 316) && p[5] ? tr(' (レベルアップを表示)', ' (Show Level Up)') : '';
            return head(`${actorTarget(db, p[0], p[1])}, ${amount(db, p[2], p[3], p[4])}${extra}`);
        }
        case 313: return head(`${actorTarget(db, p[0], p[1])}, ${p[2] === 0 ? '+' : '-'} ${refText(db, 'state', p[3])}`);
        case 314: return head(actorTarget(db, p[0], p[1]));
        case 317: return head(`${actorTarget(db, p[0], p[1])}, ${PARAMETERS(p[2]) ?? p[2]} ${amount(db, p[3], p[4], p[5])}`);
        case 318: return head(`${actorTarget(db, p[0], p[1])}, ${p[2] === 0 ? tr('覚える', 'Learn') : tr('忘れる', 'Forget')} ${refText(db, 'skill', p[3])}`);
        case 319: {
            const item = p[2] > 0 ? refText(db, p[1] === 1 ? 'weapon' : 'armor', p[2]) : none;
            return head(`${refText(db, 'actor', p[0])}, ${refText(db, 'equipType', p[1])} = ${item}`);
        }
        case 320: case 324: case 325: return head(`${refText(db, 'actor', p[0])}, ${String(p[1] ?? '').replace(/\n/g, ' / ')}`);
        case 321: return head(`${refText(db, 'actor', p[0])}, ${refText(db, 'class', p[1])}${p[2] ? tr(' (レベルを保存)', ' (Save Level)') : ''}`);
        case 322: return head(tr(
            `${refText(db, 'actor', p[0])}, 顔 ${p[1] ? `${p[1]}(${p[2]})` : none}, 歩行 ${p[3] ? `${p[3]}(${p[4]})` : none}, 戦闘 ${p[5] || none}`,
            `${refText(db, 'actor', p[0])}, Face ${p[1] ? `${p[1]}(${p[2]})` : none}, Character ${p[3] ? `${p[3]}(${p[4]})` : none}, Battler ${p[5] || none}`));
        case 202: { // 乗り物の位置設定
            const where = p[1] === 0 ? `${refText(db, 'map', p[2])} (${p[3]},${p[4]})`
                : `{${refText(db, 'variable', p[2])}} ({${refText(db, 'variable', p[3])}},{${refText(db, 'variable', p[4])}})`;
            return head(`${VEHICLES(p[0]) ?? p[0]}, ${where}`);
        }
        case 203: { // イベントの位置設定
            const where = p[1] === 0 ? `(${p[2]},${p[3]})`
                : p[1] === 1 ? `({${refText(db, 'variable', p[2])}},{${refText(db, 'variable', p[3])}})` : tr(`${character(p[2], events)} と交換`, `Exchange with ${character(p[2], events)}`);
            return head(tr(`${character(p[0], events)}, ${where}, 向き ${DIRECTIONS(p[4]) ?? p[4]}`, `${character(p[0], events)}, ${where}, Direction ${DIRECTIONS(p[4]) ?? p[4]}`));
        }
        case 205: return head(`${character(p[0], events)}${waitMark(p[1] && p[1].wait)}`);
        case 505: return cont(moveStep(db, p[0]));
        case 212: return head(`${character(p[0], events)}, ${refText(db, 'animation', p[1])}${waitMark(p[2])}`);
        case 213: return head(`${character(p[0], events)}, ${BALLOONS(p[1]) || p[1]}${waitMark(p[2])}`);
        case 211: return head(p[0] === 0 ? 'ON' : 'OFF');
        case 138: return head(`(${(p[0] || []).slice(0, 3).join(',')})`);
        case 223: return head(`(${(p[0] || []).join(',')}), ${frames(p[1])}${waitMark(p[2])}`);
        case 224: return head(`(${(p[0] || []).join(',')}), ${frames(p[1])}${waitMark(p[2])}`);
        case 225: return head(tr(`強さ ${p[0]}, 速さ ${p[1]}, ${frames(p[2])}`, `Power ${p[0]}, Speed ${p[1]}, ${frames(p[2])}`) + waitMark(p[3]));
        case 242: case 246: return head(tr(`${p[0]}秒`, `${p[0]} sec`));
        case 230: return head(frames(p[0]));
        case 231: return head(`#${p[0]}, ${p[1]}`);
        case 232: return head(`#${p[0]}`);
        case 233: return head(`#${p[0]}, ${p[1]}`);
        case 234: return head(`#${p[0]}, (${(p[1] || []).join(',')}), ${frames(p[2])}${waitMark(p[3])}`);
        case 235: return head(`#${p[0]}`);
        case 241: case 245: case 249: case 250: return head(audio(p[0]));
        case 301: return head(p[0] === 0 ? refText(db, 'troop', p[1]) : p[0] === 1 ? `{${refText(db, 'variable', p[1])}}` : tr('ランダムエンカウントと同じ', 'Same as Random Encounter'));
        case 303: return head(tr(`${refText(db, 'actor', p[0])}, ${p[1]}文字`, `${refText(db, 'actor', p[0])}, ${p[1]} characters`));
        case 355: return head(String(p[0] ?? ''));
        case 356: return head(String(p[0] ?? ''));
        case 357: return head(`${p[0]}, ${p[2] || p[1]}`);
        case 657: return cont(String(p[0] ?? ''));
        default: {
            // 組み立てていないコマンドも落とさない。見出しが無ければコード番号で出す。
            // データベースの番号を持つなら、引数の後ろに名前を添える。
            const names = commandRefs(c).filter((r) => r.kind !== 'face' && r.kind !== 'event' && r.kind !== 'icon')
                .map((r) => refText(db, r.kind as DbKind, r.id));
            const text = compact(p) + (names.length ? `  ${names.join(', ')}` : '');
            return name ? head(text) : { head: true, label: tr(`(コード ${c.code})`, `(code ${c.code})`), text };
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
