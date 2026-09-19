import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { eachSlowly, SlowlyOptions } from './db/slowly';

/**
 * 反映を、ゲームのデータの写しで試す。VS Code に依存しない。
 * 本物のデータ(Map###.json / CommonEvents.json)にも祖先(.t2f-base)にも書かない。
 * 反映はその後に祖先を保存するので、祖先の置き場所(baseRoot)も一時フォルダに向ける。
 * 読む祖先は、呼ぶ側が渡す basePath(本物)のまま。
 */

export interface TrialResult {
    ok: boolean;
    warnings: string[];
    conflicts?: number;
    error?: string;
}

export interface ApplyModule {
    applyTextFile: (opts: { [key: string]: unknown }) => TrialResult;
}

export interface PageRef {
    kind: 'event' | 'common';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
}

export interface TrialStep {
    /** 本物の反映に渡すのと同じもの(mapPath / commonEventPath は写しに置き換える)。 */
    applyOpts: { [key: string]: unknown };
    dataPath: string;
    ref: PageRef;
}

export interface TrialPage {
    step: TrialStep;
    result: TrialResult;
    /** ゲームの今のコマンド。ページが無ければ undefined。 */
    before?: unknown[];
    /** 反映したあとのコマンド。反映に失敗したら undefined。 */
    after?: unknown[];
}

function readJson(file: string): unknown {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return undefined;
    }
}

export function pageList(json: unknown, ref: PageRef): unknown[] | undefined {
    if (ref.kind === 'common') {
        const entry = Array.isArray(json) ? json[Number(ref.commonEventId)] : undefined;
        return entry && Array.isArray(entry.list) ? entry.list : undefined;
    }
    const events = json && typeof json === 'object' ? (json as { events?: unknown }).events : undefined;
    const event = Array.isArray(events) ? events[Number(ref.eventId)] : undefined;
    const page = event && Array.isArray(event.pages) ? event.pages[Number(ref.pageId || '1') - 1] : undefined;
    return page && Array.isArray(page.list) ? page.list : undefined;
}

/** 順に反映を試す。同じデータのページは、同じ写しに重ねていく(本物のまとめて反映と同じ)。 */
export function tryApply(mod: ApplyModule, steps: TrialStep[]): TrialPage[] {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-trial-'));
    try {
        const copies = new Map<string, string>();
        const originals = new Map<string, unknown>();
        const results: TrialResult[] = [];
        for (const step of steps) {
            let copy = copies.get(step.dataPath);
            if (!copy) {
                copy = path.join(dir, String(copies.size), path.basename(step.dataPath));
                fs.mkdirSync(path.dirname(copy), { recursive: true });
                if (fs.existsSync(step.dataPath)) fs.copyFileSync(step.dataPath, copy);
                copies.set(step.dataPath, copy);
                originals.set(step.dataPath, readJson(step.dataPath));
            }
            const opts: { [key: string]: unknown } = { ...step.applyOpts, baseRoot: path.join(dir, 'base') };
            if (step.ref.kind === 'common') opts.commonEventPath = copy;
            else opts.mapPath = copy;
            // テキストも写しで試す。衝突すると、コンパイラはテキストに目印を書き込むため。
            const textPath = step.applyOpts.textPath;
            if (typeof textPath === 'string' && fs.existsSync(textPath)) {
                const textCopy = path.join(dir, 'text', String(results.length), path.basename(textPath));
                fs.mkdirSync(path.dirname(textCopy), { recursive: true });
                fs.copyFileSync(textPath, textCopy);
                opts.textPath = textCopy;
            }
            let result: TrialResult;
            try {
                result = mod.applyTextFile(opts);
            } catch (e) {
                result = { ok: false, warnings: [], error: e instanceof Error ? e.message : String(e) };
            }
            results.push(result);
        }
        const finals = new Map<string, unknown>();
        copies.forEach((copy, dataPath) => finals.set(dataPath, readJson(copy)));
        return steps.map((step, i) => ({
            step,
            result: results[i],
            before: pageList(originals.get(step.dataPath), step.ref),
            after: results[i].ok ? pageList(finals.get(step.dataPath), step.ref) : undefined
        }));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * tryApply を少しずつ行う。同じデータのファイルのページはまとめて1回で試す(重ね方は tryApply と同じ)。
 * データのファイルごとに手を離す。途中でやめたら undefined。
 */
export async function tryApplySlowly(mod: ApplyModule, steps: TrialStep[], options: SlowlyOptions = {}): Promise<TrialPage[] | undefined> {
    const groups = new Map<string, number[]>();
    steps.forEach((step, i) => {
        const list = groups.get(step.dataPath) || [];
        list.push(i);
        groups.set(step.dataPath, list);
    });
    const out: TrialPage[] = new Array(steps.length);
    let done = 0;
    const finished = await eachSlowly(Array.from(groups.values()), (indices) => {
        tryApply(mod, indices.map((i) => steps[i])).forEach((trial, k) => { out[indices[k]] = trial; });
        done += indices.length;
    }, { ...options, onProgress: options.onProgress ? () => options.onProgress?.(done, steps.length) : undefined });
    return finished ? out : undefined;
}

/** ファイルの中身の指紋。確かめたあとで材料が変わっていないかを見る。 */
export function fingerprint(paths: Array<string | undefined>): string {
    const hash = crypto.createHash('sha1');
    const unique = Array.from(new Set(paths.filter((p): p is string => !!p))).sort();
    for (const p of unique) {
        hash.update(p);
        hash.update('\0');
        try {
            hash.update(fs.readFileSync(p));
        } catch (e) {
            hash.update('(none)');
        }
        hash.update('\0');
    }
    return hash.digest('hex');
}
