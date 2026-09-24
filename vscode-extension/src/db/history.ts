import * as fs from 'fs';
import * as path from 'path';

/**
 * 反映・取り出しの履歴。ファイルを書き換える直前に元の中身を控えて、あとから戻せるようにする。
 * VS Code に依存しないので、テストから直接使える。
 *
 * 置き場所は <ゲームのフォルダ>/.t2f-history/<操作の名前>/。
 *   entry.json   … 操作の名前・時刻・控えたファイルの一覧
 *   files/<相対パス> … 元の中身(操作の前に無かったファイルは置かない)
 */

export const HISTORY_DIR = '.t2f-history';
const ENTRY_FILE = 'entry.json';
const FILES_DIR = 'files';

export type HistoryFileKind = 'data' | 'text' | 'base';

export interface HistoryFile {
    /** ゲームのフォルダからの相対パス(区切りは /)。 */
    path: string;
    /** 操作の前にあったか。無かったものは、戻すときにも消さない。 */
    existed: boolean;
    kind: HistoryFileKind;
    /** データのファイルのとき、その操作で触ったページ(e:マップ:イベント:ページ / c:番号)。 */
    pages?: string[];
}

export interface HistoryEntry {
    id: string;
    /** 最後に書き足した時刻(ミリ秒)。 */
    time: number;
    /** 始めた時刻。 */
    started: number;
    op: string;
    label: string;
    files: HistoryFile[];
    /** 保存時の反映のように、続けて起きたものを1つにまとめるための目印。 */
    mergeKey?: string;
    /** 控えの大きさ(バイト)。 */
    bytes?: number;
}

/** 控えの合計の上限。超えたら、古い操作から消す(いちばん新しい操作は残す)。 */
export const MAX_HISTORY_BYTES = 300 * 1024 * 1024;

export interface HistoryOptions {
    /** 残す操作の数。0 なら記録しない。 */
    keep?: number;
    /** 同じ目印の操作が、この時間の中で続いたら1つにまとめる。 */
    mergeKey?: string;
    mergeWindowMs?: number;
    now?: () => number;
}

/** 履歴が増えた・減ったときに知らせる先(履歴の欄が描き直すため)。 */
const listeners = new Set<(root: string) => void>();

export function onHistoryChange(listener: (root: string) => void): { dispose: () => void } {
    listeners.add(listener);
    return { dispose: () => { listeners.delete(listener); } };
}

function changed(root: string): void {
    listeners.forEach((listener) => {
        try { listener(root); } catch (e) { /* 知らせる先の失敗は、記録には関係ない */ }
    });
}

const toRel = (root: string, abs: string): string => path.relative(root, abs).split(path.sep).join('/');
/** 履歴が持つ相対パスを、実際の場所に戻す。 */
export const absolutePath = (root: string, rel: string): string => path.join(root, ...rel.split('/'));

export function historyRoot(root: string): string {
    return path.join(root, HISTORY_DIR);
}

function entryDir(root: string, id: string): string {
    return path.join(historyRoot(root), id);
}

/** 控えの中身の置き場所。 */
export function snapshotFile(root: string, id: string, rel: string): string {
    return path.join(entryDir(root, id), FILES_DIR, ...rel.split('/'));
}

/** 控えのフォルダの中か(開いて保存しても、反映しないようにするため)。 */
export function isHistoryCopy(fsPath: string): boolean {
    return path.resolve(fsPath).split(path.sep).includes(HISTORY_DIR);
}

function ensureRoot(root: string): void {
    const dir = historyRoot(root);
    fs.mkdirSync(dir, { recursive: true });
    const ignore = path.join(dir, '.gitignore');
    // ゲームのフォルダが git で管理されていても、控えが入らないように(利用者の .gitignore は触らない)。
    if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n', 'utf8');
}

function readEntryFile(root: string, id: string): HistoryEntry | undefined {
    try {
        const entry = JSON.parse(fs.readFileSync(path.join(entryDir(root, id), ENTRY_FILE), 'utf8')) as HistoryEntry;
        return entry && entry.id === id && Array.isArray(entry.files) ? entry : undefined;
    } catch (e) {
        return undefined;
    }
}

function writeEntryFile(root: string, entry: HistoryEntry): void {
    fs.mkdirSync(entryDir(root, entry.id), { recursive: true });
    fs.writeFileSync(path.join(entryDir(root, entry.id), ENTRY_FILE), JSON.stringify(entry, null, 1), 'utf8');
}

/** 残っている操作(新しい順)。 */
export function listEntries(root: string): HistoryEntry[] {
    let names: string[];
    try {
        names = fs.readdirSync(historyRoot(root));
    } catch (e) {
        return [];
    }
    const out: HistoryEntry[] = [];
    for (const name of names) {
        if (name.startsWith('.')) continue;
        const entry = readEntryFile(root, name);
        if (entry) out.push(entry);
    }
    return out.sort((a, b) => b.time - a.time || (a.id < b.id ? 1 : -1));
}

export function readEntry(root: string, id: string): HistoryEntry | undefined {
    return readEntryFile(root, id);
}

/** 残す数・合計の大きさを超えた古い操作を消す(消すのは、ここで作った控えだけ)。 */
export function prune(root: string, keep: number, maxBytes = MAX_HISTORY_BYTES): string[] {
    const removed: string[] = [];
    const entries = listEntries(root);
    let total = 0;
    entries.forEach((entry, i) => {
        total += entry.bytes || 0;
        if (i < Math.max(1, keep) && (i === 0 || total <= maxBytes)) return;
        fs.rmSync(entryDir(root, entry.id), { recursive: true, force: true });
        removed.push(entry.id);
    });
    return removed;
}

let sequence = 0;

function newId(now: number): string {
    const d = new Date(now);
    const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
    sequence = (sequence + 1) % 1000;
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}-${pad(sequence, 3)}`;
}

const readOrUndefined = (file: string): Buffer | undefined => {
    try {
        return fs.readFileSync(file);
    } catch (e) {
        return undefined;
    }
};

/** 1つの操作の記録係。書く前に noteBeforeWrite を呼び、終わったら finish を呼ぶ。 */
export class HistoryRecorder {
    private entry: HistoryEntry;
    private readonly known = new Map<string, HistoryFile>();
    /**
     * 書く前の中身(この操作で初めて触ったもの)。写しは、終わって変わっていたものだけ書く。
     * 変わらない何千ものファイルの写しを作っては消すと、ファイルの変化を見張るほかの拡張
     * (git など)がいっせいに動いてしまうため、ディスクには書かずに持っておく。
     */
    private readonly before = new Map<string, Buffer>();
    private readonly now: () => number;
    private started = false;

    constructor(private readonly root: string, op: string, label: string, private readonly options: HistoryOptions = {}) {
        this.now = options.now || Date.now;
        const now = this.now();
        const last = options.mergeKey ? listEntries(root)[0] : undefined;
        const window = options.mergeWindowMs ?? 5 * 60 * 1000;
        if (last && last.mergeKey === options.mergeKey && now - last.time <= window) {
            // 続けて起きた同じ操作。前の控え(いちばん最初の中身)に書き足す。
            this.entry = last;
            this.started = true;
            for (const file of last.files) this.known.set(file.path, file);
        } else {
            this.entry = { id: newId(now), time: now, started: now, op, label, files: [], mergeKey: options.mergeKey };
        }
    }

    get id(): string {
        return this.entry.id;
    }

    setLabel(label: string): void {
        this.entry.label = label;
    }

    /** これから書き換えるファイル。同じ操作の中では、最初の1回だけ控える。 */
    noteBeforeWrite(absPath: string, kind: HistoryFileKind, pages?: string[]): void {
        if ((this.options.keep ?? 1) <= 0) return;
        const rel = toRel(this.root, absPath);
        if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || rel.split('/')[0] === HISTORY_DIR) return;
        const known = this.known.get(rel);
        if (known) {
            if (pages) known.pages = Array.from(new Set((known.pages || []).concat(pages)));
            return;
        }
        this.started = true;
        let existed = false;
        try {
            this.before.set(rel, fs.readFileSync(absPath));
            existed = true;
        } catch (e) {
            existed = false;
        }
        const file: HistoryFile = { path: rel, existed, kind };
        if (pages && pages.length) file.pages = Array.from(new Set(pages));
        this.known.set(rel, file);
        this.entry.files.push(file);
    }

    /** 変わらなかったファイルを外して、書き残す。何も変わっていなければ、操作ごと残さない。 */
    finish(): HistoryEntry | undefined {
        if (!this.started) return undefined;
        const kept: HistoryFile[] = [];
        for (const file of this.entry.files) {
            const abs = absolutePath(this.root, file.path);
            const copy = snapshotFile(this.root, this.entry.id, file.path);
            const held = this.before.get(file.path);
            const now = readOrUndefined(abs);
            // 前の中身: この操作で読んだもの。まとめた操作の、前からある分は写しにある。
            const was = held !== undefined ? held : file.existed ? readOrUndefined(copy) : undefined;
            const changed = file.existed ? !(now && was && now.equals(was)) : now !== undefined;
            if (!changed) {
                if (held === undefined && file.existed) fs.rmSync(copy, { force: true });
                continue;
            }
            if (held !== undefined) {
                fs.mkdirSync(path.dirname(copy), { recursive: true });
                fs.writeFileSync(copy, held);
            }
            kept.push(file);
        }
        this.before.clear();
        this.entry.files = kept;
        /* 何も変わっていない操作と、祖先(.t2f-base)だけが変わった操作は残さない。
         * 祖先は行に出さないので、残しても中身の無い行になり、戻しても目に見えるものは
         * 変わらない。祖先だけが動くのは、ゲームの命令は同じでテキストのコメント行などだけが
         * 変わったときで、3-way は祖先を命令に直してから見るので、戻せなくても影響しない。 */
        if (!kept.some((file) => file.kind !== 'base')) {
            if (fs.existsSync(entryDir(this.root, this.entry.id))) fs.rmSync(entryDir(this.root, this.entry.id), { recursive: true, force: true });
            return undefined;
        }
        ensureRoot(this.root);
        this.entry.time = this.now();
        this.entry.bytes = kept.reduce((sum, file) => {
            if (!file.existed) return sum;
            try { return sum + fs.statSync(snapshotFile(this.root, this.entry.id, file.path)).size; } catch (e) { return sum; }
        }, 0);
        writeEntryFile(this.root, this.entry);
        if (this.options.keep !== undefined) prune(this.root, this.options.keep);
        changed(this.root);
        return this.entry;
    }
}

/** 今の操作の記録係。書き込む関数は、これがあれば控えを取る。 */
let current: HistoryRecorder | undefined;

/**
 * 操作を記録しながら動かす。すでに別の操作を記録している途中なら、その操作に含める
 * (まとめて取り出す中の1ファイルの取り出しなど)。
 */
export function withHistory<T>(root: string | undefined, op: string, label: string, options: HistoryOptions, fn: (recorder?: HistoryRecorder) => T): T {
    if (current || !root || (options.keep ?? 1) <= 0) return fn(current);
    const recorder = new HistoryRecorder(root, op, label, options);
    current = recorder;
    let result: T;
    try {
        result = fn(recorder);
    } catch (e) {
        current = undefined;
        recorder.finish();
        throw e;
    }
    if (result && typeof (result as unknown as Promise<unknown>).then === 'function') {
        return (result as unknown as Promise<unknown>).finally(() => {
            if (current === recorder) current = undefined;
            recorder.finish();
        }) as unknown as T;
    }
    current = undefined;
    recorder.finish();
    return result;
}

/** 書き込む直前に呼ぶ。記録していなければ何もしない。 */
export function noteWrite(absPath: string, kind: HistoryFileKind, pages?: string[]): void {
    if (current) current.noteBeforeWrite(absPath, kind, pages);
}

/** 戻したい時点。履歴の行(操作)そのものを指す。 */
export type HistoryPoint = { started: number; id: string };

/**
 * 巻き戻しで取り消される操作(選んだ操作と、それ以降)。
 * 時点は操作そのもの(時刻と id)で決める。時刻だけで比べると、同じミリ秒に入った1つ前の操作まで
 * 巻き戻ってしまう(id の末尾は操作ごとに増える連番なので、同じ時刻でも順番が付く)。
 */
export const undoneBy = (entries: HistoryEntry[], from: HistoryPoint): HistoryEntry[] =>
    entries.filter((e) => e.started > from.started || (e.started === from.started && e.id >= from.id));

/**
 * ある時点へ戻す計画。その操作以降(その操作を含む)で書き換わったファイルを、すべてその時点の中身に戻す。
 * 同じファイルを何度も書き換えていたときは、いちばん古い控え(＝その時点の中身)を使う。
 * その時点より後にできたファイルは、消さずに残して名前だけ返す。
 */
export function planRestoreTo(entries: HistoryEntry[], from: HistoryPoint): {
    files: { path: string; kind: HistoryFileKind; pages?: string[]; entryId: string }[];
    created: string[];
    removed: string[];
} {
    const files: { path: string; kind: HistoryFileKind; pages?: string[]; entryId: string }[] = [];
    const created: string[] = [];
    const removed: string[] = [];
    const seen = new Set<string>();
    // 古い順に見て、そのファイルを最初に書き換えた操作の控えを採る。
    const wanted = undoneBy(entries, from).sort((a, b) => a.started - b.started || (a.id < b.id ? -1 : 1));
    for (const entry of wanted) {
        for (const file of entry.files) {
            if (seen.has(file.path)) continue;
            seen.add(file.path);
            if (!file.existed) {
                /* その時点には無かった祖先(.t2f-base)は消す。残すと、テキストを戻したあとも
                 * 祖先が新しいままになり、次の 3-way が「テキストは変わっていない」と読んで
                 * ゲームの側で上書きしてしまう。祖先が無ければ初回反映と同じ扱いになり、
                 * テキストが残る側に転ぶ。消す前の中身は控えるので、この巻き戻しごと戻せる。 */
                if (file.kind === 'base') removed.push(file.path);
                else created.push(file.path);
                continue;
            }
            files.push({ path: file.path, kind: file.kind, pages: file.pages, entryId: entry.id });
        }
    }
    return { files, created, removed };
}

/** ある時点へ戻す。計画(planRestoreTo)のとおりに控えを書き戻す。 */
export function restoreTo(root: string, entries: HistoryEntry[], from: HistoryPoint): { restored: string[]; created: string[]; removed: string[]; missing: string[] } {
    const plan = planRestoreTo(entries, from);
    const restored: string[] = [];
    const missing: string[] = [];
    const removed: string[] = [];
    for (const rel of plan.removed) {
        const abs = absolutePath(root, rel);
        if (!fs.existsSync(abs)) continue;
        noteWrite(abs, 'base');
        fs.rmSync(abs, { force: true });
        removed.push(rel);
    }
    for (const file of plan.files) {
        const copy = snapshotFile(root, file.entryId, file.path);
        if (!fs.existsSync(copy)) {
            missing.push(file.path);
            continue;
        }
        const abs = absolutePath(root, file.path);
        noteWrite(abs, file.kind, file.pages);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.copyFileSync(copy, abs);
        restored.push(file.path);
    }
    return { restored, created: plan.created, removed, missing };
}
