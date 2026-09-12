import { GameDatabase, DbKind, padId } from './database';
import { RefKind } from './commandRefs';
import { FACE_COLUMNS, FACE_ROWS } from './faces';

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

export interface FaceLookup {
    /** 顔画像がプロジェクトにあるか。 */
    exists: (faceName: string) => boolean;
}

export function describeRef(db: GameDatabase, ref: RefLike, faces?: FaceLookup): RefInfo {
    if (ref.kind === 'face') return describeFace(db, ref, faces);
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
    if (count > RANGE_LINES) lines.push(`…ほか ${count - RANGE_LINES}件`);
    const first = db.lookup(kind, ref.id);
    const hint = first.status === 'missing' ? undefined : `${nameOf(first)}…(${count}件)`;
    const problem: Problem | undefined = missing.length
        ? { severity: 'warning', message: `${label} ${missing.map(padId).join(', ')} はデータベースにありません(${rangeText(db, kind)})` }
        : undefined;
    return { hint, title, lines, problem };
}

function describeOne(db: GameDatabase, kind: DbKind, id: number): RefInfo {
    const label = db.label(kind);
    const title = `${label} ${padId(id)}`;
    const r = db.lookup(kind, id);
    if (r.status === 'missing') {
        const message = `${label} ${padId(id)} はデータベースにありません(${rangeText(db, kind)})`;
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    if (r.status === 'unnamed') {
        return {
            hint: '(名前なし)',
            title,
            lines: ['(名前なし)'],
            problem: { severity: 'hint', message: `${label} ${padId(id)} には名前がありません` }
        };
    }
    const lines = [r.name];
    const same = db.sameName(kind, id);
    // 同じ名前の番号を並べる。名前だけ見て取り違えないように(実データでは1つの名前に4つ付いていた)。
    if (same.length) lines.push(`同じ名前の${label}: ${same.map(padId).join(', ')}`);
    return { hint: r.name, title, lines };
}

function describeFace(db: GameDatabase, ref: RefLike, faces?: FaceLookup): RefInfo {
    const name = ref.faceName || '';
    const title = `顔 ${name} の ${ref.id}番`;
    if (ref.id < 0 || ref.id >= FACE_COLUMNS * FACE_ROWS) {
        const message = `顔の番号は 0〜${FACE_COLUMNS * FACE_ROWS - 1} です(${ref.id})`;
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    if (faces && !faces.exists(name)) {
        const message = `顔画像 ${name} が img/faces にありません`;
        return { title, lines: [message], problem: { severity: 'warning', message } };
    }
    const owner = db.faceOwner(name, ref.id);
    // 顔は文字で出しても意味が無いので hint は付けない(ホバーとプレビューで画像を出す)。
    return { title, lines: owner ? [`${owner} の既定の顔`] : [] };
}

function nameOf(r: ReturnType<GameDatabase['lookup']>): string {
    if (r.status === 'named') return r.name;
    if (r.status === 'unnamed') return '(名前なし)';
    return '(データベースに無い)';
}

function rangeText(db: GameDatabase, kind: DbKind): string {
    const max = db.max(kind);
    return max ? `${padId(1)}〜${padId(max)}` : `${db.label(kind)}は1つもありません`;
}
