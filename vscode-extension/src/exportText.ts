import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    parseFrontMatter,
    loadModule,
    workspaceRootFor,
    mapPathFor,
    commonEventsPathFor,
    recordDataState,
    saveBaseSnapshot,
    baseSnapshotPath,
    snapshotKeyForTarget,
    historyKeep
} from './compiler';
import { noteWrite, withHistory } from './db/history';
import { loadCompiler } from './deploy';
import { placeFromMeta, placeKey } from './placeLabel';
import { reviewPull } from './reviewApply';
import { tr } from './db/lang';

/**
 * Export feature: read the RPG Maker data JSON and write it back out as a
 * Text2Frame text file (reverse of deploy), using Frame2Text.decompile().
 */

interface Frame2TextModule {
    decompile: (list: unknown[], englishTag: boolean, options?: { pretty?: boolean; translationOnly?: boolean; omitDefaults?: boolean }) => string;
    /**
     * The one place that turns "a target's commands" into "the text to write" — shared with the
     * plugin, the CLI and t2f-sync so all four behave identically. Handles the 3-way merge, the
     * front matter header, and the conflict-marker guards.
     *   skipped: refused (merge cannot cross unresolved markers); nothing should be written
     *   markers: written, but the text still carries unresolved markers -> do NOT advance BASE
     */
    buildPullText: (opts: {
        list: unknown[];
        englishTag?: boolean;
        omitDefaults?: boolean;
        strategy?: string;
        existingText?: string;
        baseText?: string;
        fallbackHeader?: string;
    }) => {
        text?: string;
        baseText?: string;
        conflicts?: number;
        markers?: boolean;
        skipped?: 'game' | 'text';
        /** ゲームへ書き戻すコマンド列。衝突したときは目印つきの両方が入る。 */
        writeBack?: { commands: unknown[] } | null;
    };
    /** テキストのフォルダを front matter で索引する。取り出しの書き先を既存のファイルに合わせるため。 */
    indexTexts?: (textDir: string) => { paths: { [key: string]: string }; duplicates: { [key: string]: string[] } };
    /** 取り出す対象。scope で範囲を絞る(既にテキストがあるものは範囲に関係なく入る)。 */
    enumerateTargets?: (dataDir: string, options?: { onlyFile?: string; scope?: string; index?: { paths: { [key: string]: string } } }) => PullTarget[];
    /** 新しく作るときのファイル名(ID + ツクールで付けた名前)。 */
    defaultFileName?: (target: PullTarget) => string;
    VERSION?: string;
}

interface Text2FrameModule {
    /** game->text merge (mirror of deploy): keeps translations, brings game changes, kept-both on conflict. */
    applyMergePull: (opts: { gameCommands: unknown[]; textBody: string; baseBody: string; englishTag: boolean }) => { text: string; conflicts: number; warnings: string[] };
    VERSION?: string;
}

/** 取り出す対象1件。Frame2Text の enumerateTargets が返すもの。 */
export interface PullTarget {
    kind: 'event' | 'common';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
    key: string;
    mapName?: string;
    name?: string;
}

export interface ExportTarget {
    kind: 'event' | 'common';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
    /** Where to write the text. */
    textPath: string;
    /** Reuse this file's existing front matter header if present. */
    frontMatterSource?: string;
    translationOnly?: boolean;
}

export interface ExportResult {
    ok: boolean;
    textPath?: string;
    error?: string;
    conflicts?: number;
    warnings?: string[];
    /** Refused: merge cannot cross the unresolved markers on that side. Nothing was written. */
    skipped?: 'game' | 'text';
    /** Written, but the text still carries unresolved markers (BASE was left alone). */
    markers?: boolean;
}

let outputChannel: vscode.OutputChannel | undefined;
function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame Export');
    }
    return outputChannel;
}

function loadFrame2Text(context: vscode.ExtensionContext, workspaceRoot: string | undefined): { mod?: Frame2TextModule; tried: string[] } {
    return loadModule<Frame2TextModule>(
        context,
        workspaceRoot,
        'Frame2Text.js',
        (m) => !!m && typeof (m as Frame2TextModule).decompile === 'function'
    );
}

function loadText2Frame(context: vscode.ExtensionContext, workspaceRoot: string | undefined): { mod?: Text2FrameModule; tried: string[] } {
    return loadModule<Text2FrameModule>(
        context,
        workspaceRoot,
        'Text2Frame.js',
        (m) => !!m && typeof (m as Text2FrameModule).applyMergePull === 'function'
    );
}

function englishTagSetting(): boolean {
    return vscode.workspace.getConfiguration('text2frame').get<boolean>('englishTag', true);
}

/**
 * Drop face/background/position tags that match what a deploy would fill in anyway.
 * Purely cosmetic: the compiler supplies the same values when the tags are absent, so the
 * game is unchanged either way. Off means every message carries its full tag line.
 */
function omitDefaultTagsSetting(): boolean {
    return vscode.workspace.getConfiguration('text2frame').get<boolean>('omitDefaultTags', true);
}

/** Build a minimal front matter header from a target. */
function renderFrontMatter(target: ExportTarget, version?: string): string {
    const lines = ['---'];
    // 来歴: 書き出しに使った変換スクリプトのバージョン(import 時は無視される)。
    lines.push(`generator: text2frame-mv@${version || 'unknown'}`);
    lines.push(`kind: ${target.kind}`);
    if (target.kind === 'common') {
        lines.push(`commonEventId: ${target.commonEventId}`);
    } else {
        if (target.mapId) {
            lines.push(`mapId: ${target.mapId}`);
        }
        lines.push(`eventId: ${target.eventId}`);
        lines.push(`pageId: ${target.pageId || '1'}`);
    }
    lines.push('---');
    return lines.join('\n') + '\n';
}

/** Read the event command list for a target from the workspace data JSON. */
function readEventList(workspaceRoot: string, target: ExportTarget): unknown[] {
    if (target.kind === 'common') {
        const cePath = commonEventsPathFor(workspaceRoot);
        const ce = JSON.parse(fs.readFileSync(cePath, 'utf8'));
        const entry = ce[Number(target.commonEventId)];
        if (!entry) {
            throw new Error(`CommonEvent ${target.commonEventId} not found in ${path.basename(cePath)}`);
        }
        return entry.list;
    }
    if (!target.mapId) {
        throw new Error('mapId is required to export an event');
    }
    const mapPath = mapPathFor(workspaceRoot, target.mapId);
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const event = map.events && map.events[Number(target.eventId)];
    if (!event) {
        throw new Error(`Event ${target.eventId} not found in ${path.basename(mapPath)}`);
    }
    const page = event.pages && event.pages[Number(target.pageId || '1') - 1];
    if (!page) {
        throw new Error(`Page ${target.pageId} not found for event ${target.eventId}`);
    }
    return page.list;
}

/**
 * 取り出しで書くテキストを、書き込まずに作る。書くのは commitPull。
 * mode 'overwrite' はゲームの内容でテキストを作り直す(書き出し・全部取り直す)。
 * mode 'merge' はテキストの編集を残してゲームの変更を取り込む(3-way。仕組みは mergePullToText の説明)。
 */
export interface PullPlan {
    target: ExportTarget;
    ok: boolean;
    error?: string;
    /** 書き込むテキスト。 */
    text?: string;
    /** 祖先にするテキスト(書き戻したなら、テキストに書いた内容。でなければゲーム側)。 */
    baseText?: string;
    /** ゲームへ書き戻すコマンド列(衝突したときは目印つき)。 */
    writeBack?: { commands: unknown[] } | null;
    conflicts?: number;
    markers?: boolean;
    skipped?: 'game' | 'text';
    /** 今のテキスト。ファイルが無ければ undefined。 */
    previous?: string;
    /** 材料(確かめたあとで変わっていないかを見る)。 */
    inputs: string[];
}

/** 履歴に控えるときのページの鍵(e:マップ:イベント:ページ / c:コモン)。 */
function pageKeyOf(target: ExportTarget): string[] | undefined {
    const place = placeFromMeta({
        kind: target.kind,
        mapId: target.mapId || '',
        eventId: target.eventId || '',
        pageId: target.pageId || '',
        commonEventId: target.commonEventId || ''
    });
    const key = place && placeKey(place);
    return key ? [key] : undefined;
}

function dataPathFor(workspaceRoot: string, target: ExportTarget): string | undefined {
    return target.kind === 'common'
        ? commonEventsPathFor(workspaceRoot)
        : (target.mapId ? mapPathFor(workspaceRoot, target.mapId) : undefined);
}

const frame2TextMissing = (): string => tr('Frame2Text.js を読み込めませんでした(詳細は出力 "Text2Frame Export")。設定 text2frame.modulePath で本体の場所を指定してください。', 'Could not load Frame2Text.js (see the "Text2Frame Export" output). Set its location in text2frame.modulePath.');

/**
 * テキストのフォルダの索引(front matter -> ファイルの場所)。
 * 取り出しは「同じ行き先のテキストが既にあればその場所へ書く」ので、利用者が付けた名前が保たれる。
 */
export function textIndexFor(context: vscode.ExtensionContext, workspaceRoot: string, textDir: string):
    { paths: { [key: string]: string }; duplicates: { [key: string]: string[] } } {
    const mod = frame2Text(context, workspaceRoot);
    if (!mod || !mod.indexTexts) {
        return { paths: {}, duplicates: {} };
    }
    try {
        return mod.indexTexts(textDir);
    } catch (e) {
        return { paths: {}, duplicates: {} };
    }
}

/**
 * 取り出す対象と、テキストのフォルダの索引。
 * 範囲(scope)は「新しく作るかどうか」だけを決め、既にあるテキストは必ず対象に入る。
 * 書き先は「同じ行き先のテキストがあればその場所、無ければ既定の名前」。
 */
export function pullTargetsFor(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    dataDir: string,
    textDir: string,
    scope: string
): { targets: PullTarget[]; index: { paths: { [key: string]: string }; duplicates: { [key: string]: string[] } }; pathOf: (t: PullTarget) => string } {
    const index = textIndexFor(context, workspaceRoot, textDir);
    const mod = frame2Text(context, workspaceRoot);
    const pathOf = (t: PullTarget): string =>
        index.paths[t.key] || path.join(textDir, mod && mod.defaultFileName ? mod.defaultFileName(t) : t.key + '.txt');
    if (!mod || !mod.enumerateTargets) {
        return { targets: [], index, pathOf };
    }
    const targets = mod.enumerateTargets(dataDir, { scope, index }).filter((t) => !index.duplicates[t.key]);
    return { targets, index, pathOf };
}

/**
 * 1件ぶんの取り出し先。既にその行き先のテキストがあればその場所、無ければ既定の名前
 * (ID にツクールで付けた名前を添えたもの)。データは対象のファイルだけ読む。
 */
export function newTextPathFor(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    dataDir: string,
    textDir: string,
    target: ExportTarget
): string {
    const key = target.kind === 'common'
        ? `common${String(target.commonEventId).padStart(3, '0')}`
        : `map${String(target.mapId).padStart(3, '0')}_event${String(target.eventId).padStart(3, '0')}_page${target.pageId || '1'}`;
    const index = textIndexFor(context, workspaceRoot, textDir);
    if (index.paths[key]) {
        return index.paths[key];
    }
    const mod = frame2Text(context, workspaceRoot);
    const fallback = path.join(textDir, key + '.txt');
    if (!mod || !mod.enumerateTargets || !mod.defaultFileName) {
        return fallback;
    }
    const onlyFile = target.kind === 'common'
        ? 'CommonEvents.json'
        : `Map${String(target.mapId).padStart(3, '0')}.json`;
    try {
        const hit = mod.enumerateTargets(dataDir, { onlyFile, scope: 'all' }).find((t) => t.key === key);
        return hit ? path.join(textDir, mod.defaultFileName(hit)) : fallback;
    } catch (e) {
        return fallback;
    }
}

function frame2Text(context: vscode.ExtensionContext, workspaceRoot: string): Frame2TextModule | undefined {
    const { mod, tried } = loadFrame2Text(context, workspaceRoot);
    if (!mod) {
        const out = getOutput();
        out.appendLine('[export] Frame2Text could not be loaded. Candidates:');
        tried.forEach((t) => out.appendLine('  - ' + t));
        out.show(true);
    }
    return mod;
}

export function planPull(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    target: ExportTarget,
    mode: 'merge' | 'overwrite'
): PullPlan {
    const baseP = baseSnapshotPath(workspaceRoot, snapshotIdFor(workspaceRoot, target).key);
    const plan: PullPlan = { target, ok: false, inputs: [target.textPath, dataPathFor(workspaceRoot, target) || '', baseP].filter(Boolean) };
    const mod = frame2Text(context, workspaceRoot);
    if (!mod) {
        plan.error = frame2TextMissing();
        return plan;
    }
    // buildPullText resolves Text2Frame itself for the 3-way, but load it here too: it primes the
    // shared global and lets us report the extension's modulePath candidates when it is missing.
    if (mode === 'merge' && !loadText2Frame(context, workspaceRoot).mod) {
        plan.error = tr('Text2Frame.js を読み込めませんでした。設定 text2frame.modulePath を確認してください。', 'Could not load Text2Frame.js. Check the setting text2frame.modulePath.');
        return plan;
    }
    try {
        const list = readEventList(workspaceRoot, target); // ours
        if (fs.existsSync(target.textPath)) plan.previous = fs.readFileSync(target.textPath, 'utf8');
        // The whole 3-way/decompile/guard logic lives in the shared core (Frame2Text.buildPullText),
        // so CLI, plugin, t2f-sync and this extension all behave identically.
        const built = mode === 'merge'
            ? mod.buildPullText({
                list,
                englishTag: englishTagSetting(),
                omitDefaults: omitDefaultTagsSetting(),
                strategy: 'merge',
                existingText: plan.previous || '',
                baseText: fs.existsSync(baseP) ? fs.readFileSync(baseP, 'utf8') : '',
                fallbackHeader: renderFrontMatter(target, mod.VERSION)
            })
            : mod.buildPullText({
                list,
                englishTag: englishTagSetting(),
                omitDefaults: omitDefaultTagsSetting(),
                strategy: 'overwrite',
                // The header comes from whatever the caller is replacing (the open document, or the
                // file on disk for a batch overwrite); buildPullText falls back when there is none.
                existingText: target.frontMatterSource || '',
                fallbackHeader: renderFrontMatter(target, mod.VERSION)
            });
        Object.assign(plan, {
            ok: true,
            text: built.text,
            baseText: built.baseText,
            writeBack: built.writeBack,
            conflicts: mode === 'merge' ? built.conflicts : undefined,
            markers: built.markers,
            skipped: built.skipped
        });
    } catch (e) {
        plan.error = e instanceof Error ? e.message : String(e);
    }
    return plan;
}

/** planPull で作ったテキストを書き、データの状態と祖先を記録する。 */
export function commitPull(context: vscode.ExtensionContext, workspaceRoot: string, plan: PullPlan): ExportResult {
    const label = tr('ゲームから取り出す ', 'Pull from game ') + path.relative(workspaceRoot, plan.target.textPath).split(path.sep).join('/');
    return withHistory(workspaceRoot, 'pull', label, { keep: historyKeep() }, () => commitPullNow(context, workspaceRoot, plan));
}

function commitPullNow(context: vscode.ExtensionContext, workspaceRoot: string, plan: PullPlan): ExportResult {
    const target = plan.target;
    if (!plan.ok) return { ok: false, error: plan.error };
    // Merging across unresolved markers would re-merge the markers themselves and double them.
    if (plan.skipped) return { ok: true, textPath: target.textPath, skipped: plan.skipped };
    try {
        /* 先にゲームへ書く。書けなければテキストも祖先も触らない(反映の鏡写し)。
         * 衝突したときは目印つきの両方がゲームへ入り、テキストはテキスト側の版のまま。 */
        if (plan.writeBack) {
            const dataPath = dataPathFor(workspaceRoot, target);
            const { mod } = loadCompiler(context, workspaceRoot);
            if (!mod || !mod.applyCommandsToData) {
                return { ok: false, error: tr('ゲームへ書き戻せませんでした。Text2Frame.js を読み込めません(設定 text2frame.modulePath)。', 'Could not write back to the game. Text2Frame.js cannot be loaded (setting text2frame.modulePath).') };
            }
            if (dataPath) noteWrite(dataPath, 'data', pageKeyOf(target));
            const wrote = mod.applyCommandsToData({
                kind: target.kind,
                mapId: target.mapId,
                eventId: target.eventId,
                pageId: target.pageId,
                commonEventId: target.commonEventId,
                mapPath: target.kind === 'event' ? dataPath : undefined,
                commonEventPath: target.kind === 'common' ? dataPath : undefined,
                commands: plan.writeBack.commands
            });
            if (!wrote.ok) {
                return { ok: false, error: tr('ゲームへ書き戻せませんでした: ', 'Could not write back to the game: ') + (wrote.error || '') };
            }
        }
        writeTextFile(target.textPath, plan.text as string);
        // Record the data baseline: after a pull, text matches data, so a later
        // deploy should not flag this data file as externally changed.
        recordDataStateFor(context, workspaceRoot, target);
        // The game side becomes the new common ancestor — even when the merge conflicted.
        // BASE means "the text has seen the game up to here", not "the two agreed": the game's
        // changes are in the text, between the markers. Holding it back would make the same
        // conflict come back on the game side after the user resolves the text.
        // The one exception is an ancestor that itself carries markers (overwrite pull), which
        // the next 3-way would merge again.
        if (!plan.markers) {
            saveBaseFor(workspaceRoot, target, plan.baseText as string);
        }
        return { ok: true, textPath: target.textPath, conflicts: plan.conflicts, markers: plan.markers };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/** Core export: data JSON -> text file. */
export function exportToTextFile(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    target: ExportTarget
): ExportResult {
    if (!target.translationOnly) {
        return commitPull(context, workspaceRoot, planPull(context, workspaceRoot, target, 'overwrite'));
    }
    const mod = frame2Text(context, workspaceRoot);
    if (!mod) {
        return { ok: false, error: frame2TextMissing() };
    }
    // The conversation-only sidecar is a lossy extract, not a deployable file: it never
    // routes, never becomes an ancestor, and buildPullText has no translationOnly mode.
    try {
        const body = mod.decompile(readEventList(workspaceRoot, target), englishTagSetting(), {
            pretty: true,
            translationOnly: true,
            omitDefaults: omitDefaultTagsSetting()
        });
        writeTextFile(target.textPath, renderFrontMatter(target, mod.VERSION) + '\n' + body + '\n');
        return { ok: true, textPath: target.textPath };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/** ゲームのコマンドを、取り出しと同じ設定でテキストにする(差分の確認で使う)。 */
export function renderCommands(context: vscode.ExtensionContext, workspaceRoot: string, list: unknown[] | undefined): string {
    const mod = list ? loadFrame2Text(context, workspaceRoot).mod : undefined;
    return mod && list ? mod.decompile(list, englishTagSetting(), { pretty: true, omitDefaults: omitDefaultTagsSetting() }) : '';
}

/**
 * テキストを書く。中身が今と同じなら書かない(控えも取らない)。
 * すべて取り出すときに、変わらない何千ものファイルを書き直すと、ファイルの変化を見張る
 * ほかの拡張(git など)がいっせいに動き、VS Code が落ちることがあるため。
 */
function writeTextFile(textPath: string, contents: string): void {
    if (sameAsFile(textPath, contents)) return;
    noteWrite(textPath, 'text');
    const dir = path.dirname(textPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(textPath, contents, 'utf8');
}

function sameAsFile(file: string, contents: string): boolean {
    try {
        return fs.readFileSync(file, 'utf8') === contents;
    } catch (e) {
        return false;
    }
}

function snapshotIdFor(workspaceRoot: string, target: ExportTarget): { key: string } {
    const meta: { [key: string]: string } = { kind: target.kind };
    if (target.mapId) { meta.mapId = target.mapId; }
    if (target.eventId) { meta.eventId = target.eventId; }
    if (target.pageId) { meta.pageId = target.pageId; }
    if (target.commonEventId) { meta.commonEventId = target.commonEventId; }
    return { key: snapshotKeyForTarget(workspaceRoot, target.textPath, meta) };
}

/**
 * BASE は「テキストとゲームが実際に一致していた地点」。取り出しで書き換えるのはテキストなので、
 * 祖先には書き換えなかった側 = ゲーム(buildPullText の baseText)を入れる。マージ結果を入れると
 * ゲームが到達していない状態が祖先になり、次の反映で 3-way が「ゲームが消した」と誤読して、
 * 取り出し前にテキストへ書いた内容が黙って消える。
 */
function saveBaseFor(workspaceRoot: string, target: ExportTarget, gameSideText: string): void {
    saveBaseSnapshot(workspaceRoot, snapshotIdFor(workspaceRoot, target).key, gameSideText);
}

function recordDataStateFor(context: vscode.ExtensionContext, workspaceRoot: string, target: ExportTarget): void {
    const dataPath = dataPathFor(workspaceRoot, target);
    if (dataPath) {
        recordDataState(context, dataPath);
    }
}

/**
 * Merge-pull: bring the game's content into text/<language>/ WITHOUT clobbering existing
 * translations. This is the mirror image of deploy — the same 3-way merge, but the merged
 * result is written back out as TEXT (via decompile) instead of into the game JSON.
 *   ours   = the game's current commands
 *   theirs = the existing text (translations)
 *   base   = the last-synced ancestor snapshot
 * A line translated only in text is kept; a line changed only in the game is brought in;
 * the same spot changed on both sides is kept as BOTH with the plain marker comments.
 * When the text file does not exist yet, this simply writes the game's content (initial pull).
 */
export function mergePullToText(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    target: ExportTarget
): ExportResult {
    return commitPull(context, workspaceRoot, planPull(context, workspaceRoot, target, 'merge'));
}

/** Build an ExportTarget from a text document's front matter. */
function targetFromDocument(document: vscode.TextDocument): ExportTarget {
    const { meta, hasFrontMatter } = parseFrontMatter(document.getText());
    if (!hasFrontMatter) {
        throw new Error(tr('ファイルの先頭に宛先のメモ(--- で囲んだ部分)が無いため、ゲームのどこから取り出すか分かりません。', 'This text has no destination note (the part between --- at the top), so where it comes from in the game is unknown.'));
    }
    const kind = (String(meta.kind || 'event').toLowerCase() === 'common') ? 'common' : 'event';
    return {
        kind,
        mapId: meta.mapId,
        eventId: meta.eventId,
        pageId: meta.pageId || '1',
        commonEventId: meta.commonEventId,
        textPath: document.uri.fsPath,
        frontMatterSource: document.getText()
    };
}

/**
 * Command: pull this file's content from the game, merging (keeps your edits, brings in
 * game-side changes). Use "全部取り直す" (overwrite) when you want to discard and re-pull.
 */
export async function exportCurrentFile(context: vscode.ExtensionContext): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage(tr('Text2Frame: アクティブなエディタがありません。', 'Text2Frame: No active editor.'));
        return;
    }
    const workspaceRoot = workspaceRootFor(editor.document);
    if (!workspaceRoot) {
        vscode.window.showErrorMessage(tr('Text2Frame: ワークスペースフォルダが見つかりません。', 'Text2Frame: No workspace folder was found.'));
        return;
    }
    let target: ExportTarget;
    try {
        target = targetFromDocument(editor.document);
    } catch (e) {
        vscode.window.showErrorMessage('Text2Frame: ' + (e instanceof Error ? e.message : String(e)));
        return;
    }
    const reviewed = await reviewPull(workspaceRoot, () => [planPull(context, workspaceRoot, target, 'merge')], tr('このファイルの取り出し', 'Pull this file'));
    if (!reviewed) {
        vscode.window.setStatusBarMessage(tr('Text2Frame: 取り出しをやめました。', 'Text2Frame: Stopped pulling.'), 4000);
        return;
    }
    const result = commitPull(context, workspaceRoot, reviewed.plans[0]);
    if (result.ok && reviewed.unchanged && !result.skipped) {
        vscode.window.showInformationMessage(tr('Text2Frame: テキストは変わりませんでした。', 'Text2Frame: The text did not change.'));
    } else if (result.ok && result.skipped === 'game') {
        vscode.window.showWarningMessage(tr('Text2Frame: ゲーム側に未解決の衝突の目印が残っているため統合できません。ツクールで衝突の目印を消すか、「全部取り直す」で目印ごと取り出してテキスト側で解決してください。', 'Text2Frame: Cannot merge: unresolved conflict markers remain in the game. Remove them in RPG Maker, or Re-pull (overwrite) to bring them into the text and resolve them there.'));
    } else if (result.ok && result.skipped) {
        vscode.window.showWarningMessage(tr('Text2Frame: テキストに未解決の衝突の目印が残っているため統合できません。衝突の目印を消して残す方を決めたあと、反映してください。', 'Text2Frame: Cannot merge: unresolved conflict markers remain in the text. Choose what to keep, remove the markers, then apply.'));
    } else if (result.ok) {
        const c = result.conflicts || 0;
        vscode.window.showInformationMessage(tr(`Text2Frame: ゲームから取り出しました${c ? `（${c} 件の衝突は両方残しました。確認してください）` : ''}`, `Text2Frame: Pulled from the game${c ? ` (both versions of ${c} conflicts were kept; check them)` : ''}`));
    } else {
        vscode.window.showErrorMessage(tr('Text2Frame: 取り出し失敗 - ', 'Text2Frame: Could not pull - ') + (result.error || ''));
    }
}

/** Command: export the active file as a conversation-only text beside it (lossy sidecar). */
export function exportConversationOnly(context: vscode.ExtensionContext): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage(tr('Text2Frame: アクティブなエディタがありません。', 'Text2Frame: No active editor.'));
        return;
    }
    const workspaceRoot = workspaceRootFor(editor.document);
    if (!workspaceRoot) {
        vscode.window.showErrorMessage(tr('Text2Frame: ワークスペースフォルダが見つかりません。', 'Text2Frame: No workspace folder was found.'));
        return;
    }
    let target: ExportTarget;
    try {
        target = targetFromDocument(editor.document);
    } catch (e) {
        vscode.window.showErrorMessage('Text2Frame: ' + (e instanceof Error ? e.message : String(e)));
        return;
    }
    // Lossy extraction: write beside the source as *.conversation.txt, never overwrite the editable file.
    const srcPath = editor.document.uri.fsPath;
    const ext = path.extname(srcPath);
    target.textPath = srcPath.slice(0, srcPath.length - ext.length) + '.conversation' + (ext || '.txt');
    target.translationOnly = true;
    const label = tr('会話のみ書き出し ', 'Pull conversation only ') + path.relative(workspaceRoot, target.textPath).split(path.sep).join('/');
    const result = withHistory(workspaceRoot, 'conversation', label, { keep: historyKeep() }, () => exportToTextFile(context, workspaceRoot, target));
    if (result.ok) {
        vscode.window.showInformationMessage(tr('Text2Frame: 会話のみテキストを書き出しました: ', 'Text2Frame: Wrote the conversation-only text: ') + path.basename(result.textPath || ''));
        vscode.workspace.openTextDocument(result.textPath as string).then((doc) => vscode.window.showTextDocument(doc, { preview: true }));
    } else {
        vscode.window.showErrorMessage(tr('Text2Frame: 会話のみ書き出しに失敗しました - ', 'Text2Frame: Could not write the conversation-only text - ') + (result.error || ''));
    }
}
