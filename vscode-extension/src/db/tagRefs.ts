import { RefKind, ESCAPE_REF, ESCAPE_KINDS } from './commandRefs';
import { DbKind } from './database';

/**
 * テキスト1行から、データベースの番号が「どの種類で、何文字目から何文字目にあるか」を取り出す。
 * VS Code に依存しない。名前の薄い表示・ホバー・警告・「使っている箇所を探す」がこれを使う。
 *
 * タグの別名(英語・日本語・短縮形)は Text2Frame.js の正規表現と揃えてある。
 * ずれていないことは、例文をコンパイラに通した結果(commandRefs)と突き合わせるテストで確かめる。
 * 位置は JavaScript の文字列の添字(UTF-16)で、VS Code の列と同じ。
 */

export interface TagRef {
    kind: RefKind;
    id: number;
    /** `1-10` のような範囲指定の終わり。 */
    endId?: number;
    /** 顔だけ。顔画像のファイル名。id は何番目の顔か。 */
    faceName?: string;
    /** 行の中の位置(この範囲に番号が書かれている)。 */
    start: number;
    end: number;
}

// 変数の操作の演算子(Text2Frame.js の set/add/sub/mul/div/mod_operation_list)。
const VARIABLE_OPS = 'set|代入|=|add|加算|\\+|sub|減算|-|mul|乗算|\\*|div|除算|\\/|mod|剰余|%';
const SWITCH_TAGS = 'sw|switch|スイッチ';
// 移動ルートの中のスイッチ操作(Text2Frame.js の switch_on / switch_off)。
const MOVE_SWITCH_TAGS = 'switchon|switchoff|スイッチon|スイッチoff';
const COMMON_EVENT_TAGS = 'commonevent|ce|コモンイベント';
const FACE_TAGS = 'face|fc|顔';
const IF_TAGS = 'if|条件分岐';
const TRANSFER_TAGS = 'transferplayer|場所移動';
// 変数を指す書き方。`\V[n]`(文章中の制御文字)は別物なので、直前が英字・\ のものは除く。
const VARIABLE_REF = '(?<![A-Za-z_\\\\])(?:variables|v|変数)\\[';

/** 条件分岐の対象 → 種類(Text2Frame.js の getConditionalBranch)。 */
const IF_TARGET_KINDS: Array<[RegExp, RefKind]> = [
    [/^(?:switches|スイッチ|sw)$/i, 'switch'],
    [/^(?:variables|変数|v)$/i, 'variable'],
    [/^(?:actors|アクター)$/i, 'actor'],
    [/^(?:items|アイテム)$/i, 'item'],
    [/^(?:weapons|武器)$/i, 'weapon'],
    [/^(?:armors|防具)$/i, 'armor'],
    [/^(?:characters|キャラクター)$/i, 'event']
];
const IF_ENEMY = /^(?:enemies|敵キャラ|エネミー)$/i;
/** アクターの条件の2つ目(Text2Frame.js の getIfActorParameters)→ 3つ目の番号の種類。 */
const IF_ACTOR_MODES: Array<[RegExp, DbKind]> = [
    [/^(?:class|職業)$/i, 'class'],
    [/^(?:skill|スキル)$/i, 'skill'],
    [/^(?:weapon|武器)$/i, 'weapon'],
    [/^(?:armor|防具)$/i, 'armor'],
    [/^(?:state|ステート)$/i, 'state']
];
/** 変数の操作のゲームデータ(GameData[Item][5] など)→ 種類。 */
const GAME_DATA = /(?:gd|gamedata|ゲームデータ)\[(item|アイテム|weapon|武器|armor|防具|actor|アクター|character|キャラクター)\]\[(-?\d+)\]/gi;
const GAME_DATA_KINDS: Array<[RegExp, RefKind]> = [
    [/^(?:item|アイテム)$/i, 'item'],
    [/^(?:weapon|武器)$/i, 'weapon'],
    [/^(?:armor|防具)$/i, 'armor'],
    [/^(?:actor|アクター)$/i, 'actor'],
    [/^(?:character|キャラクター)$/i, 'event']
];

/**
 * 引数の読み方(Text2Frame.js がタグごとに params[n] をどう読むか)。
 *   DbKind            先頭の数字がその種類の番号(parseInt)
 *   operand           定数か V[n](getConstantOrVariable)
 *   actorOrVariable   アクター番号・パーティ全体・V[n](getFixedOrVariable)
 *   troop             敵グループの番号か V[n](getTroopValue)
 *   character         プレイヤー・このイベント・イベント番号(getCharacterValue)
 *   location3         Direct[マップ][x][y] / WithVariables[変数][変数][変数]
 *   location2         Direct[x][y] / WithVariables[変数][変数] / Character[キャラ] / Exchange[キャラ]
 *   enemyOrActor      敵キャラの並び順か Actors[n](getEnemyOrActor)
 *   goods             商品の番号。種類は1つ前の引数(アイテム・武器・防具)
 *   equipItem         装備の番号。1つ前の引数(装備タイプ)が 1 なら武器、ほかは防具
 *   faceIndex         顔の番号。1つ前の引数が顔画像のファイル名
 *   null              番号ではない
 */
type ArgRead = DbKind | 'operand' | 'actorOrVariable' | 'troop' | 'character' | 'location3' | 'location2'
    | 'enemyOrActor' | 'goods' | 'equipItem' | 'faceIndex' | null;

interface ArgTag {
    /** タグ名の別名(Text2Frame.js の正規表現と同じ。大小文字は区別しない)。 */
    names: string;
    args: ArgRead[];
}

const ARG_TAGS: ArgTag[] = [
    { names: 'changegold|所持金の増減', args: [null, 'operand'] },
    { names: 'changeitems|アイテムの増減', args: ['item', null, 'operand'] },
    { names: 'changeweapons|武器の増減', args: ['weapon', null, 'operand'] },
    { names: 'changearmors|防具の増減', args: ['armor', null, 'operand'] },
    { names: 'changepartymember|メンバーの入れ替え', args: ['actor'] },
    { names: 'changehp|hpの増減|changemp|mpの増減|changetp|tpの増減|changeexp|経験値の増減|changelevel|レベルの増減', args: ['actorOrVariable', null, 'operand'] },
    { names: 'changestate|ステートの変更', args: ['actorOrVariable', null, 'state'] },
    { names: 'recoverall|全回復', args: ['actorOrVariable'] },
    { names: 'changeparameter|能力値の増減', args: ['actorOrVariable', null, null, 'operand'] },
    { names: 'changeskill|スキルの増減', args: ['actorOrVariable', null, 'skill'] },
    { names: 'changeequipment|装備の変更', args: ['actor', 'equipType', 'equipItem'] },
    { names: 'changename|名前の変更|changenickname|二つ名の変更|changeprofile|プロフィールの変更', args: ['actor'] },
    { names: 'changeclass|職業の変更', args: ['actor', 'class'] },
    { names: 'changeactorimages|アクターの画像変更', args: ['actor', null, 'faceIndex'] },
    { names: 'setvehiclelocation|乗り物の位置設定', args: [null, 'location3'] },
    { names: 'seteventlocation|イベントの位置設定', args: ['character', 'location2'] },
    { names: 'setmovementroute|移動ルートの設定', args: ['character'] },
    { names: 'showanimation|アニメーションの表示', args: ['character', 'animation'] },
    { names: 'showballoonicon|フキダシアイコンの表示', args: ['character'] },
    { names: 'changetileset|タイルセットの変更', args: ['tileset'] },
    { names: 'getlocationinfo|指定位置の情報取得', args: ['variable', null, 'location2'] },
    { names: 'battleprocessing|戦闘の処理', args: ['troop'] },
    { names: 'nameinputprocessing|名前入力の処理', args: ['actor'] },
    { names: 'merchandise|商品', args: [null, 'goods'] },
    { names: 'changeenemyhp|敵キャラのhp増減|changeenemymp|敵キャラのmp増減|changeenemytp|敵キャラのtp増減', args: [null, null, 'operand'] },
    { names: 'changeenemystate|敵キャラのステート変更', args: [null, null, 'state'] },
    { names: 'enemytransform|敵キャラの変身', args: [null, 'enemy'] },
    { names: 'showbattleanimation|戦闘アニメーションの表示', args: [null, 'animation'] },
    { names: 'forceaction|戦闘行動の強制', args: ['enemyOrActor', 'skill'] },
    { names: 'inputnumber|inn|数値入力の処理', args: ['variable'] },
    { names: 'selectitem|si|アイテム選択の処理', args: ['variable'] }
];
// タグの引数(Text2Frame.js と同じく、行の最後の > まで)。
const ARG_TAG_RES = ARG_TAGS.map((t) => ({ tag: t, re: new RegExp(`(<(?:${t.names})\\s*:\\s*)([^\\s].*)>`, 'i') }));

// Text2Frame.js の単語の一覧(小文字にしてから比べる)。
const ENTIRE_PARTY = ['entire party', 'パーティ全体'];
const PLAYER_OR_THIS_EVENT = ['player', '-1', 'プレイヤー', 'this event', '0', 'このイベント'];
const LOCATION_DIRECT = ['direct', '0', '直接指定'];
const LOCATION_VARIABLES = ['withvariables', '変数で指定'];
const LOCATION_CHARACTER = ['exchange', '2', '交換', 'character', 'キャラクターで指定', 'キャラクター'];
const GOODS_KINDS: Array<[string[], DbKind]> = [[['item', '0', 'アイテム'], 'item'], [['weapon', '1', '武器'], 'weapon'], [['armor', '2', '防具'], 'armor']];
const NO_EQUIPMENT = ['none', 'なし', '0'];
const NO_IMAGE = ['none', 'なし'];

// ピクチャの表示・移動(引数の Position[原点][x][y] に変数を書ける)。
const PICTURE_TAGS = [
    { re: /(<(?:showpicture|ピクチャの表示|sp)\s*:\s*)([^\s].*)>/i, first: 2 }, // 番号, 画像名 のあとがオプション
    { re: /(<(?:movepicture|ピクチャの移動|mp)\s*:\s*)([^\s].*)>/i, first: 1 }
];
// getPictureOptions の option_regexp と同じ。キー(角括弧の前)と、角括弧の並び。
const PICTURE_OPTION = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])/i;

// 文章中の制御文字(\V[n] \N[n])を読む行。文章の行と、名前・選択肢(<When>)のタグ。
// プラグインコマンドなどの中は読まない。<ShowChoices> の引数は選択肢にならない(文言は <When> から作られる)。
const ESCAPE_TAG_LINE = /^\s*<(?:name|nm|名前|when|選択肢)\s*:/i;

const each = function (re: RegExp, line: string, fn: (m: RegExpExecArray) => void): void {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        fn(m);
        if (m[0].length === 0) re.lastIndex++;
    }
};

/** タグの中(`<` の後、対になる `>` の前)の変数参照 `V[n]` を拾う。offset は s の行内の位置。 */
const variableRefsIn = function (s: string, offset: number, out: TagRef[]): void {
    each(new RegExp('(' + VARIABLE_REF + ')(\\d+)\\]', 'gi'), s, (m) => {
        const start = offset + m.index + m[1].length;
        out.push({ kind: 'variable', id: Number(m[2]), start, end: start + m[2].length });
    });
};

interface Piece {
    text: string;
    start: number;
}

/** 引数をカンマで分け、前後の空白を落とした各部分とその位置(Text2Frame.js の split(',').map(trim) と同じ)。 */
function splitArgs(args: string, offset: number): Piece[] {
    const out: Piece[] = [];
    let pos = 0;
    for (const piece of args.split(',')) {
        const lead = piece.length - piece.trimStart().length;
        out.push({ text: piece.trim(), start: offset + pos + lead });
        pos += piece.length + 1;
    }
    return out;
}

/** `word[a][b][c]` の角括弧の中身とその位置。 */
function brackets(p: Piece): { word: string; values: Piece[] } {
    const open = p.text.indexOf('[');
    if (open < 0) return { word: p.text, values: [] };
    const values: Piece[] = [];
    const re = /\[([^\]]*)\]/g;
    re.lastIndex = open;
    let m: RegExpExecArray | null;
    while ((m = re.exec(p.text)) !== null) values.push({ text: m[1], start: p.start + m.index + 1 });
    return { word: p.text.slice(0, open).trim().toLowerCase(), values };
}

const refAt = (kind: RefKind, p: Piece, digits: RegExpMatchArray | null, out: TagRef[]): void => {
    if (!digits || digits.index === undefined) return;
    const start = p.start + digits.index;
    out.push({ kind, id: Number(digits[0]), start, end: start + digits[0].length });
};
const leadingNumber = (kind: RefKind, p: Piece, out: TagRef[]): void => refAt(kind, p, p.text.match(/^\d+/), out);
const variableIn = (p: Piece, out: TagRef[]): void => {
    const m = p.text.match(/(?:variables|v|変数)\[(\d+)\]/i);
    if (m && m.index !== undefined) {
        const start = p.start + m.index + m[0].indexOf('[') + 1;
        out.push({ kind: 'variable', id: Number(m[1]), start, end: start + m[1].length });
    }
};
const characterIn = (p: Piece, out: TagRef[]): void => {
    if (PLAYER_OR_THIS_EVENT.includes(p.text.toLowerCase())) return;
    const m = p.text.match(/^\d+/);
    if (m && Number(m[0]) > 0) refAt('event', p, m, out);
};

function readArg(read: ArgRead, pieces: Piece[], i: number, out: TagRef[]): void {
    const p = pieces[i];
    if (!p || read === null) return;
    const lower = p.text.toLowerCase();
    const constant = /^\d+$/.test(lower);
    switch (read) {
        case 'operand':
            if (!constant) variableIn(p, out);
            return;
        case 'actorOrVariable':
            if (constant) { if (Number(lower) > 0) leadingNumber('actor', p, out); } else if (!ENTIRE_PARTY.includes(lower)) variableIn(p, out);
            return;
        case 'troop':
            if (constant) leadingNumber('troop', p, out); else variableIn(p, out);
            return;
        case 'character':
            characterIn(p, out);
            return;
        case 'location3': {
            const { word, values } = brackets(p);
            if (values.length < 3) return;
            if (LOCATION_DIRECT.includes(word)) leadingNumber('map', values[0], out);
            else if (LOCATION_VARIABLES.includes(word)) values.slice(0, 3).forEach((v) => leadingNumber('variable', v, out));
            return;
        }
        case 'location2': {
            const { word, values } = brackets(p);
            if (!values.length) return;
            if (LOCATION_VARIABLES.includes(word)) values.slice(0, 2).forEach((v) => leadingNumber('variable', v, out));
            else if (LOCATION_CHARACTER.includes(word)) characterIn(values[0], out);
            return;
        }
        case 'enemyOrActor': {
            if (constant) return; // 敵キャラの並び順(データベースの番号ではない)
            const m = p.text.match(/(?:actors|v|アクター)\[(\d+)\]/i);
            if (m && m.index !== undefined) {
                const start = p.start + m.index + m[0].indexOf('[') + 1;
                out.push({ kind: 'actor', id: Number(m[1]), start, end: start + m[1].length });
            }
            return;
        }
        case 'goods': {
            const type = pieces[i - 1] ? pieces[i - 1].text.toLowerCase() : '';
            const kind = GOODS_KINDS.find(([words]) => words.includes(type));
            if (kind && Number(p.text.match(/^\d+/)) > 0) leadingNumber(kind[1], p, out);
            return;
        }
        case 'equipItem': {
            if (NO_EQUIPMENT.includes(lower)) return;
            const etype = pieces[i - 1] ? parseInt(pieces[i - 1].text, 10) : NaN;
            if (Number(p.text.match(/^\d+/)) > 0) leadingNumber(etype === 1 ? 'weapon' : 'armor', p, out);
            return;
        }
        case 'faceIndex': {
            const name = pieces[i - 1];
            const m = p.text.match(/^\d+/);
            if (!name || !name.text || NO_IMAGE.includes(name.text.toLowerCase()) || !m) return;
            out.push({ kind: 'face', id: Number(m[0]), faceName: name.text, start: name.start, end: p.start + m[0].length });
            return;
        }
        default:
            leadingNumber(read, p, out);
    }
}

/** ピクチャの Position[原点][x][y]。getPictureOptions と同じく、後の値が変数か定数かで全体の指定が決まる。 */
function pictureRefs(line: string, out: TagRef[]): void {
    for (const { re, first } of PICTURE_TAGS) {
        const m = line.match(re);
        if (!m || m.index === undefined) continue;
        let position: { variable: boolean; xy: Array<Piece | undefined> } | undefined;
        for (const option of splitArgs(m[2], m.index + m[1].length).slice(first)) {
            const o = option.text.match(PICTURE_OPTION);
            if (!o || o.index === undefined || !/^(?:position|位置)$/i.test(o[1])) continue;
            const inner = o[2].slice(1, -1);
            let pos = option.start + o.index + o[1].length + 1;
            const values: Piece[] = inner.split('][').map((text) => {
                const piece = { text, start: pos };
                pos += text.length + 2;
                return piece;
            });
            let variable = false;
            const xy: Array<Piece | undefined> = [undefined, undefined];
            [1, 2].forEach((k) => {
                const v = values[k];
                if (!v) return;
                if (/^-?\d+$/.test(v.text)) { variable = false; xy[k - 1] = v; return; }
                const vm = v.text.match(/(?:variables|v|変数)\[(\d+)\]/i);
                if (vm && vm.index !== undefined) {
                    variable = true;
                    xy[k - 1] = { text: vm[1], start: v.start + vm.index + vm[0].indexOf('[') + 1 };
                }
            });
            position = { variable, xy };
        }
        if (position && position.variable) {
            for (const p of position.xy) if (p) leadingNumber('variable', p, out);
        }
    }
}

/** 文章中の制御文字 \V[n](変数)・\N[n](アクター)・\I[n](アイコン)。 */
export function findEscapeRefs(line: string): TagRef[] {
    const out: TagRef[] = [];
    each(new RegExp(ESCAPE_REF.source, 'g'), line, (m) => {
        const start = m.index + 3;
        out.push({ kind: ESCAPE_KINDS[m[1].toLowerCase()], id: Number(m[2]), start, end: start + m[2].length });
    });
    return out;
}

export function findRefs(line: string): TagRef[] {
    const out: TagRef[] = [];

    // 顔: <Face: suzu1(4)>。番号だけでなく「名前(番号)」全体を範囲にする。
    // <Face: (5)> は顔画像なし(番号だけ残っている)。コンパイラも顔なしと読むので拾わない。
    each(new RegExp(`(<(?:${FACE_TAGS}) *: *)([^()<>\\s][^()<>]*?)\\((\\d+)\\)`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        out.push({ kind: 'face', id: Number(m[3]), faceName: m[2], start, end: start + m[2].length + m[3].length + 2 });
    });

    // スイッチの操作: <Switch: 79, ON> / <SW: 3-5, OFF>
    each(new RegExp(`(<(?:${SWITCH_TAGS}) *: *)(\\d+)(?:-(\\d+))?`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        const text = m[2] + (m[3] !== undefined ? '-' + m[3] : '');
        out.push({ kind: 'switch', id: Number(m[2]), endId: m[3] !== undefined ? Number(m[3]) : undefined, start, end: start + text.length });
    });

    // 移動ルートの中のスイッチ操作: <SwitchOn: 128> / <スイッチOFF: 5>。範囲は書けない。
    each(new RegExp(`(<(?:${MOVE_SWITCH_TAGS})\\s*:\\s*)(\\d+)`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        out.push({ kind: 'switch', id: Number(m[2]), start, end: start + m[2].length });
    });

    // 変数の操作: <Set: 5, V[20]>。左辺と、右辺の変数参照・ゲームデータ(GameData[Item][5] など)。
    each(new RegExp(`(<(?:${VARIABLE_OPS}) *: *)(\\d+)(?:-(\\d+))?([^<>]*)>`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        const text = m[2] + (m[3] !== undefined ? '-' + m[3] : '');
        out.push({ kind: 'variable', id: Number(m[2]), endId: m[3] !== undefined ? Number(m[3]) : undefined, start, end: start + text.length });
        const rest = start + text.length;
        variableRefsIn(m[4], rest, out);
        each(new RegExp(GAME_DATA.source, 'gi'), m[4], (g) => {
            const kind = GAME_DATA_KINDS.find(([re]) => re.test(g[1]));
            if (!kind || Number(g[2]) <= 0) return; // キャラクターの -1・0 はプレイヤー・このイベント
            const s = rest + g.index + g[0].length - g[2].length - 1;
            out.push({ kind: kind[1], id: Number(g[2]), start: s, end: s + g[2].length });
        });
    });

    // 条件分岐: <If: Switches[79], ON> / <If: V[2], >=, V[9]>。比較演算子に > が入るので行末の > まで取る。
    each(new RegExp(`(<(?:${IF_TAGS})\\s*:\\s*)([^\\[\\]<>,\\s]+)\\[(\\d+)\\](.*)>`, 'gi'), line, (m) => {
        const start = m.index + m[1].length + m[2].length + 1;
        const rest = splitArgs(m[4], start + m[3].length + 1).slice(1); // 対象のあとの引数
        if (IF_ENEMY.test(m[2])) { // 敵キャラの並び順は DB の番号ではない。ステートだけ拾う
            if (rest[0] && /^(?:state|ステート)$/i.test(rest[0].text) && rest[1]) leadingNumber('state', rest[1], out);
            return;
        }
        const target = IF_TARGET_KINDS.find(([re]) => re.test(m[2]));
        if (!target) return;
        if (target[1] !== 'event' || Number(m[3]) > 0) out.push({ kind: target[1], id: Number(m[3]), start, end: start + m[3].length });
        if (target[1] === 'variable') variableRefsIn(m[4], start + m[3].length + 1, out);
        if (target[1] === 'actor' && rest[0] && rest[1]) {
            const mode = IF_ACTOR_MODES.find(([re]) => re.test(rest[0].text));
            if (mode && Number(rest[1].text) > 0) leadingNumber(mode[1], rest[1], out);
        }
    });

    // コモンイベント: <CommonEvent: 7>
    each(new RegExp(`(<(?:${COMMON_EVENT_TAGS}) *: *)(\\d+)`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        out.push({ kind: 'commonEvent', id: Number(m[2]), start, end: start + m[2].length });
    });

    // 場所移動: 直接指定ならマップ、変数で指定なら3つとも変数。
    each(new RegExp(`(<(?:${TRANSFER_TAGS})\\s*:\\s*)(direct|0|直接指定|withvariables|変数で指定)\\[(\\d+)\\]\\[(\\d+)\\]\\[(\\d+)\\]`, 'gi'), line, (m) => {
        let pos = m.index + m[1].length + m[2].length + 1;
        const direct = /^(?:direct|0|直接指定)$/i.test(m[2]);
        [m[3], m[4], m[5]].forEach((value, i) => {
            if (direct && i === 0) out.push({ kind: 'map', id: Number(value), start: pos, end: pos + value.length });
            if (!direct) out.push({ kind: 'variable', id: Number(value), start: pos, end: pos + value.length });
            pos += value.length + 2;
        });
    });

    // 引数の位置で種類が決まるタグ(ARG_TAGS)。
    for (const { tag, re } of ARG_TAG_RES) {
        const m = line.match(re);
        if (!m || m.index === undefined) continue;
        const pieces = splitArgs(m[2], m.index + m[1].length);
        tag.args.forEach((read, i) => readArg(read, pieces, i, out));
    }

    pictureRefs(line, out);

    if (!/^\s*</.test(line) || ESCAPE_TAG_LINE.test(line)) out.push(...findEscapeRefs(line));

    return out.sort((a, b) => a.start - b.start);
}

export interface LineRef extends TagRef {
    line: number;
}

// 中身がタグとして読まれないブロック(Text2Frame.js の getBlockStatement と同じ3種)。
// \b は ASCII の単語境界なので「文章のスクロール表示>」の間では効かない。先読みで区切る。
const BLOCK_OPEN = /<(?:script|sc|スクリプト)>|<(?:comment|co|注釈)>|<(?:ShowScrollingText|sst|文章のスクロール表示)(?=[\s:,>])[^>]*>/i;
const SCROLLING_OPEN = /^<(?:ShowScrollingText|sst|文章のスクロール表示)/i;
const BLOCK_CLOSE = /<\/(?:script|sc|スクリプト|comment|co|注釈|ShowScrollingText|sst|文章のスクロール表示)>/i;

/** 行の種類。tag: タグ・文章として読まれる / scrolling: スクロール文章の中身 / skip: % の行・スクリプトや注釈の中・ブロックの開閉。 */
export type LineKind = 'tag' | 'scrolling' | 'skip';

export function lineKinds(lines: string[], commentOutChar = '%'): LineKind[] {
    const out: LineKind[] = [];
    let inBlock: 'scrolling' | 'other' | undefined;
    const comment = new RegExp('^ *' + commentOutChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    lines.forEach((text) => {
        if (inBlock) {
            if (BLOCK_CLOSE.test(text)) {
                inBlock = undefined;
                out.push('skip');
            } else {
                out.push(inBlock === 'scrolling' ? 'scrolling' : 'skip');
            }
            return;
        }
        const open = text.match(BLOCK_OPEN);
        if (open) {
            // 同じ行で閉じていなければ、次の行からブロックの中。
            if (!BLOCK_CLOSE.test(text.slice((open.index || 0) + open[0].length))) inBlock = SCROLLING_OPEN.test(open[0]) ? 'scrolling' : 'other';
            out.push('skip');
            return;
        }
        out.push(comment.test(text) ? 'skip' : 'tag');
    });
    return out;
}

/** タグとして読まれる行の番号(0始まり)。% の行と、ブロックの中(開き・閉じの行を含む)を除く。 */
export function tagLines(lines: string[], commentOutChar = '%'): number[] {
    const out: number[] = [];
    lineKinds(lines, commentOutChar).forEach((k, line) => { if (k === 'tag') out.push(line); });
    return out;
}

/**
 * 文書全体を走査する。% で始まる行(コメントアウト)と、スクリプト・注釈のブロックの中は飛ばす
 * (そこに書かれた <Switch: 1, ON> はコマンドにならないので)。スクロール文章の中は文章なので、
 * 制御文字(\V[n] など)だけを読む。
 */
export function scanLines(lines: string[], commentOutChar = '%'): LineRef[] {
    const out: LineRef[] = [];
    lineKinds(lines, commentOutChar).forEach((k, line) => {
        const refs = k === 'tag' ? findRefs(lines[line]) : k === 'scrolling' ? findEscapeRefs(lines[line]) : [];
        for (const ref of refs) out.push(Object.assign({ line }, ref));
    });
    return out;
}

export interface Expected {
    kind: RefKind;
    /** カーソルの前に打ってある部分(補完の絞り込みに使い、確定したら置き換える)。 */
    typed: string;
    start: number;
    /** 顔の番号を選んでいるときの、顔画像のファイル名。 */
    faceName?: string;
}

const FRAGMENT = '([^,<>\\[\\]()\\s]*)$';
const EXPECT: Array<[RegExp, RefKind]> = [
    [new RegExp(`<(?:${SWITCH_TAGS})\\s*:\\s*${FRAGMENT}`, 'i'), 'switch'],
    [new RegExp(`<(?:${MOVE_SWITCH_TAGS})\\s*:\\s*${FRAGMENT}`, 'i'), 'switch'],
    [new RegExp(`<(?:${VARIABLE_OPS})\\s*:\\s*${FRAGMENT}`, 'i'), 'variable'],
    [new RegExp(`<(?:${COMMON_EVENT_TAGS})\\s*:\\s*${FRAGMENT}`, 'i'), 'commonEvent'],
    [new RegExp(`<(?:${TRANSFER_TAGS})\\s*:\\s*(?:direct|0|直接指定)\\[${FRAGMENT}`, 'i'), 'map'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:switches|スイッチ|sw)\\[${FRAGMENT}`, 'i'), 'switch'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:actors|アクター)\\[${FRAGMENT}`, 'i'), 'actor'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:items|アイテム)\\[${FRAGMENT}`, 'i'), 'item'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:weapons|武器)\\[${FRAGMENT}`, 'i'), 'weapon'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:armors|防具)\\[${FRAGMENT}`, 'i'), 'armor'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:characters|キャラクター)\\[${FRAGMENT}`, 'i'), 'event'],
    [new RegExp(`${VARIABLE_REF}${FRAGMENT}`, 'i'), 'variable'],
    [/\\[Vv]\[(\d*)$/, 'variable'],
    [/\\[Nn]\[(\d*)$/, 'actor'],
    [new RegExp(`<(?:${FACE_TAGS})\\s*:\\s*${FRAGMENT}`, 'i'), 'face']
];
const FACE_INDEX = new RegExp(`<(?:${FACE_TAGS})\\s*:\\s*([^()<>]+?)\\(${FRAGMENT}`, 'i');
const ARG_EXPECT = ARG_TAGS.map((t) => ({ tag: t, re: new RegExp(`<(?:${t.names})\\s*:\\s*([^<>]*)$`, 'i') }));

/** 引数の位置で種類が決まるタグで、カーソルが打とうとしている番号の種類。 */
function expectedArg(before: string, column: number): Expected | undefined {
    for (const { tag, re } of ARG_EXPECT) {
        const m = before.match(re);
        if (!m) continue;
        const parts = m[1].split(',');
        const i = parts.length - 1;
        const typed = parts[i].trimStart();
        if (!new RegExp(FRAGMENT).test(typed)) return undefined; // 角括弧の中などは別の規則で
        const read = tag.args[i];
        const prev = (parts[i - 1] || '').trim().toLowerCase();
        let kind: RefKind | undefined;
        if (read === 'actorOrVariable') kind = 'actor';
        else if (read === 'troop') kind = 'troop';
        else if (read === 'character') kind = 'event';
        else if (read === 'goods') kind = (GOODS_KINDS.find(([words]) => words.includes(prev)) || [])[1];
        else if (read === 'equipItem') kind = parseInt(prev, 10) === 1 ? 'weapon' : 'armor';
        else if (read && !['operand', 'location3', 'location2', 'enemyOrActor', 'faceIndex'].includes(read)) kind = read as DbKind;
        return kind ? { kind, typed, start: column - typed.length } : undefined;
    }
    return undefined;
}

/** カーソル位置でどの種類の番号を打とうとしているか。補完に使う。タグの外なら undefined(\V[ \N[ を除く)。 */
export function expectedAt(line: string, column: number): Expected | undefined {
    const before = line.slice(0, column);
    const inTag = before.lastIndexOf('<') > before.lastIndexOf('>');
    if (!inTag) {
        // 文章中の制御文字だけは、タグの外でも番号を入れられる。
        const v = before.match(/\\([VvNn])\[(\d*)$/);
        return v ? { kind: v[1].toLowerCase() === 'v' ? 'variable' : 'actor', typed: v[2], start: column - v[2].length } : undefined;
    }
    const face = before.match(FACE_INDEX);
    if (face) return { kind: 'face', typed: face[2], start: column - face[2].length, faceName: face[1] };
    for (const [re, kind] of EXPECT) {
        const m = before.match(re);
        if (m) return { kind, typed: m[1], start: column - m[1].length };
    }
    return expectedArg(before, column);
}
