import { PageSummary } from './eventPages';
import { GameDatabase, DbKind, padId } from './database';
import { RefKind } from './commandRefs';
import { FACE_COLUMNS, FACE_ROWS } from './faces';
import { tr } from './lang';

/**
 * 番号1つについて、画面に出す文言をまとめて作る。VS Code に依存しない。
 * 名前の薄い表示(hint)・ホバー(title/lines)・警告(problem)が同じ判断を使うよう、ここに寄せる。
 */

export interface RefLike {
    kind: RefKind;
    id: number;
    endId?: number;
    faceName?: string;
}

export interface Problem {
    /** warning: 番号が DB に無い・顔画像が無い / hint: 番号はあるが名前が空 */
    severity: 'warning' | 'hint';
    message: string;
}

export interface RefInfo {
    /** 番号の直後に薄く出す文字。出さないときは undefined。 */
    hint?: string;
    /** ホバーの見出し。例: 「スイッチ 0079」 */
    title: string;
    /** ホバーの本文(1要素1行)。 */
    lines: string[];
    problem?: Problem;
}

/** 範囲指定(1-10)でホバーに並べる上限。多すぎる範囲は残りを件数だけ出す。 */
const RANGE_LINES = 10;

/** データベースの外にある手がかり。分からないものは渡さない(そのぶん確かめずに済ませる)。 */
export interface Lookups {
    /** 顔画像がプロジェクトにあるか。 */
    exists?: (faceName: string) => boolean;
    /** テキストのマップにあるイベント。 */
    events?: EventLookup;
    /** アイコン画像(IconSet)にあるアイコンの数。 */
    iconCount?: number;
}

/** マップ上のイベント1つ。 */
export interface MapEvent {
    /** 名前が無ければ空文字。 */
    name: string;
    x: number;
    y: number;
    selfSwitches?: string[];
    pages?: number;
    pageSummaries?: PageSummary[];
    /** ページごとに、コマンドが1つも書かれていないか。 */
    pageEmpty?: boolean[];
}

/** テキストのマップにあるイベント。コモンイベントのテキストなど、マップが決まらなければ渡さない。 */
export interface EventLookup {
    mapId: number;
    /** 添字がイベント ID。無いイベントは null か undefined。 */
    events: Array<MapEvent | null | undefined>;
}

/** 「宝箱 (8,11)」。どのイベントか、名前と置いてある座標で分かるように。 */
export function eventLabel(e: MapEvent): string {
    return `${e.name || tr('(名前なし)', '(no name)')} (${e.x},${e.y})`;
}

export function describeRef(db: GameDatabase, ref: RefLike, lookups: Lookups = {}): RefInfo {
    if (ref.kind === 'face') return describeFace(db, ref, lookups);
    if (ref.kind === 'event') return describeEvent(db, ref, lookups.events);
    if (ref.kind === 'icon') return describeIcon(db, ref, lookups.iconCount);
    const kind = ref.kind as DbKind;
    const label = db.label(kind);
    const last = ref.endId !== undefined && ref.endId > ref.id ? ref.endId : ref.id;
    if (last === ref.id) return describeOne(db, kind, ref.id);

    const title = `${label} ${padId(ref.id)}〜${padId(last)}`;
    const lines: string[] = [];
    const missing: number[] = [];
    for (let id = ref.id; id <= last; id++) {
        const r = db.lookup(kind, id);
        if (r.status === 'missing') missing.push(id);
        if (lines.length < RANGE_LINES) lines.push(`${padId(id)} ${nameOf(r)}`);
    }
    const count = last - ref.id + 1;
    if (count > RANGE_LINES) lines.push(tr(`…ほか ${count - RANGE_LINES}件`, `…and ${count - RANGE_LINES} more`));
    const first = db.lookup(kind, ref.id);
    const hint = first.status === 'missing' ? undefined : tr(`${nameOf(first)}…(${count}件)`, `${nameOf(first)}… (${count})`);
    const problem: Problem | undefined = missing.length
        ? { severity: 'warning', message: tr(`${label} ${missing.map(padId).join(', ')} はデータベースにありません(${rangeText(db, kind)})`, `${label} ${missing.map(padId).join(', ')} not in the database (${rangeText(db, kind)})`) }
        : undefined;
    return { hint, title, lines, problem };
}

function describeOne(db: GameDatabase, kind: DbKind, id: number): RefInfo {
    const label = db.label(kind);
    const title = `${label} ${padId(id)}`;
    const r = db.lookup(kind, id);
    if (r.status === 'missing') {
        const message = tr(`${label} ${padId(id)} はデータベースにありません(${rangeText(db, kind)})`, `${label} ${padId(id)} is not in the database (${rangeText(db, kind)})`);
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    if (r.status === 'unnamed') {
        return {
            hint: tr('(名前なし)', '(no name)'),
            title,
            lines: [tr('(名前なし)', '(no name)')],
            problem: { severity: 'hint', message: tr(`${label} ${padId(id)} には名前がありません`, `${label} ${padId(id)} has no name`) }
        };
    }
    const lines = [r.name];
    const same = db.sameName(kind, id);
    // 同じ名前の番号を並べる。名前だけ見て取り違えないように(実データでは1つの名前に4つ付いていた)。
    if (same.length) lines.push(tr(`同じ名前の${label}: ${same.map(padId).join(', ')}`, `${label} with the same name: ${same.map(padId).join(', ')}`));
    return { hint: r.name, title, lines };
}

function describeFace(db: GameDatabase, ref: RefLike, faces: Lookups): RefInfo {
    const name = ref.faceName || '';
    const title = tr(`顔 ${name} の ${ref.id}番`, `Face ${name}, number ${ref.id}`);
    if (ref.id < 0 || ref.id >= FACE_COLUMNS * FACE_ROWS) {
        const message = tr(`顔の番号は 0〜${FACE_COLUMNS * FACE_ROWS - 1} です(${ref.id})`, `A face number is 0 to ${FACE_COLUMNS * FACE_ROWS - 1} (${ref.id})`);
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    if (faces.exists && !faces.exists(name)) {
        const message = tr(`顔画像 ${name} が img/faces にありません`, `Face image ${name} is not in img/faces`);
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    const owner = db.faceOwner(name, ref.id);
    // 顔は文字で出しても意味が無いので hint は付けない(ホバーとプレビューで画像を出す)。
    return { title, lines: owner ? [tr(`${owner} の既定の顔`, `Default face of ${owner}`)] : [] };
}

/** アイコンを使っているデータベースの項目を、ホバーに並べる上限。 */
const ICON_USER_LINES = 5;

function describeIcon(db: GameDatabase, ref: RefLike, iconCount?: number): RefInfo {
    const title = tr(`アイコン ${ref.id}`, `Icon ${ref.id}`);
    if (iconCount !== undefined && (ref.id < 0 || ref.id >= iconCount)) {
        const message = iconCount
            ? tr(`アイコン ${ref.id} はアイコン画像(IconSet)にありません(0〜${iconCount - 1})`, `Icon ${ref.id} is not in the icon image (IconSet) (0 to ${iconCount - 1})`)
            : tr('アイコン画像(img/system/IconSet)がありません', 'There is no icon image (img/system/IconSet)');
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    // 画像はホバーで出す。文字では、そのアイコンを使っている項目を添える。
    const users = db.iconUsers(ref.id);
    const lines = users.slice(0, ICON_USER_LINES).map((u) => `${db.label(u.kind)} ${padId(u.id)} ${u.name || tr('(名前なし)', '(no name)')}`);
    if (users.length > ICON_USER_LINES) lines.push(tr(`…ほか ${users.length - ICON_USER_LINES}件`, `…and ${users.length - ICON_USER_LINES} more`));
    return { title, lines };
}

/** イベントはツクールと同じく EV015 の形で出す。 */
export function eventId(id: number): string {
    return 'EV' + String(id).padStart(3, '0');
}

function describeEvent(db: GameDatabase, ref: RefLike, events?: EventLookup): RefInfo {
    const title = tr(`イベント ${eventId(ref.id)}`, `Event ${eventId(ref.id)}`);
    if (!events) return { title, lines: [tr('このテキストのマップが決まらないので、イベントの名前は出せません', 'The map of this text is not known, so the event name cannot be shown')] };
    const map = db.lookup('map', events.mapId);
    const mapText = tr(`マップ ${padId(events.mapId)}${map.status === 'named' ? ' ' + map.name : ''}`, `Map ${padId(events.mapId)}${map.status === 'named' ? ' ' + map.name : ''}`);
    const e = events.events[ref.id];
    if (!e) {
        const message = tr(`イベント ${eventId(ref.id)} は${mapText}にありません`, `Event ${eventId(ref.id)} is not on ${mapText}`);
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    return { hint: eventLabel(e), title, lines: [e.name || tr('(名前なし)', '(no name)'), tr(`座標 (${e.x},${e.y})`, `Position (${e.x},${e.y})`), mapText] };
}

function nameOf(r: ReturnType<GameDatabase['lookup']>): string {
    if (r.status === 'named') return r.name;
    if (r.status === 'unnamed') return tr('(名前なし)', '(no name)');
    return tr('(データベースに無い)', '(not in the database)');
}

function rangeText(db: GameDatabase, kind: DbKind): string {
    const max = db.max(kind);
    return max ? tr(`${padId(1)}〜${padId(max)}`, `${padId(1)} to ${padId(max)}`) : tr(`${db.label(kind)}は1つもありません`, `There are no ${db.label(kind)}`);
}
