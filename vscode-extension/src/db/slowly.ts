/**
 * たくさんのものを、少しずつ処理する。一定の時間ごとに手を離して、VS Code が固まらないようにする。
 * VS Code に依存しないので、テストから直接使える。
 */

export interface SlowlyOptions {
    /** 手を離すまでに続けて処理する時間(ミリ秒)。 */
    sliceMs?: number;
    /** 進み具合。手を離すたびと、最後に呼ぶ。 */
    onProgress?: (done: number, total: number) => void;
    /** やめるか。手を離すたびに確かめる。 */
    cancelled?: () => boolean;
    now?: () => number;
}

export const SLICE_MS = 50;

const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** 1つずつ処理する。途中でやめたら false。 */
export async function eachSlowly<T>(items: T[], work: (item: T, index: number) => void, options: SlowlyOptions = {}): Promise<boolean> {
    const now = options.now || Date.now;
    const slice = options.sliceMs ?? SLICE_MS;
    let started = now();
    for (let i = 0; i < items.length; i++) {
        if (now() - started >= slice) {
            if (options.onProgress) options.onProgress(i, items.length);
            await breathe();
            if (options.cancelled && options.cancelled()) return false;
            started = now();
        }
        work(items[i], i);
    }
    if (options.onProgress) options.onProgress(items.length, items.length);
    return true;
}

/** 1つずつ作る。途中でやめたら undefined。 */
export async function mapSlowly<T, U>(items: T[], make: (item: T, index: number) => U, options: SlowlyOptions = {}): Promise<U[] | undefined> {
    const out: U[] = [];
    const done = await eachSlowly(items, (item, i) => { out.push(make(item, i)); }, options);
    return done ? out : undefined;
}
