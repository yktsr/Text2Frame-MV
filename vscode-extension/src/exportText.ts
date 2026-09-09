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
    snapshotKeyFor
} from './compiler';

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
    }) => { text?: string; baseText?: string; conflicts?: number; markers?: boolean; skipped?: 'game' | 'text' };
    VERSION?: string;
}

interface Text2FrameModule {
    /** game->text merge (mirror of deploy): keeps translations, brings game changes, kept-both on conflict. */
    applyMergePull: (opts: { gameCommands: unknown[]; textBody: string; baseBody: string; englishTag: boolean }) => { text: string; conflicts: number; warnings: string[] };
    VERSION?: string;
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

/** Core export: data JSON -> text file. */
export function exportToTextFile(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    target: ExportTarget
): ExportResult {
    const { mod, tried } = loadFrame2Text(context, workspaceRoot);
    if (!mod) {
        const out = getOutput();
        out.appendLine('[export] Frame2Text could not be loaded. Candidates:');
        tried.forEach((t) => out.appendLine('  - ' + t));
        out.show(true);
        const msg = 'Frame2Text.js を読み込めませんでした(詳細は出力 "Text2Frame Export")。設定 text2frame.modulePath で本体の場所を指定してください。';
        return { ok: false, error: msg };
    }
    try {
        const list = readEventList(workspaceRoot, target);

        // The conversation-only sidecar is a lossy extract, not a deployable file: it never
        // routes, never becomes an ancestor, and buildPullText has no translationOnly mode.
        if (target.translationOnly) {
            const body = mod.decompile(list, englishTagSetting(), {
                pretty: true,
                translationOnly: true,
                omitDefaults: omitDefaultTagsSetting()
            });
            writeTextFile(target.textPath, renderFrontMatter(target, mod.VERSION) + '\n' + body + '\n');
            return { ok: true, textPath: target.textPath };
        }

        const built = mod.buildPullText({
            list,
            englishTag: englishTagSetting(),
            omitDefaults: omitDefaultTagsSetting(),
            strategy: 'overwrite',
            // The header comes from whatever the caller is replacing (the open document, or the
            // file on disk for a batch overwrite); buildPullText falls back when there is none.
            existingText: target.frontMatterSource || '',
            fallbackHeader: renderFrontMatter(target, mod.VERSION)
        });
        const written = built.text as string;
        writeTextFile(target.textPath, written);
        // Record the data baseline: after a pull, text matches data, so a later
        // deploy should not flag this data file as externally changed.
        recordDataStateFor(context, workspaceRoot, target);
        // Establish the 3-way common ancestor (BASE) from this export, so the first
        // subsequent merge deploy is already a true 3-way. Mirrors deploy's snapshot id derivation.
        // Not when the text still carries unresolved markers — an ancestor with markers in it
        // makes the next 3-way merge them again.
        if (!built.markers) {
            saveBaseFor(workspaceRoot, target, built.baseText as string);
        }
        return { ok: true, textPath: target.textPath, markers: built.markers };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

function writeTextFile(textPath: string, contents: string): void {
    const dir = path.dirname(textPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(textPath, contents, 'utf8');
}

function snapshotIdFor(workspaceRoot: string, target: ExportTarget): { key: string } {
    return { key: snapshotKeyFor(workspaceRoot, target.textPath) };
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
    const dataPath = target.kind === 'common'
        ? commonEventsPathFor(workspaceRoot)
        : (target.mapId ? mapPathFor(workspaceRoot, target.mapId) : undefined);
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
    const { mod, tried } = loadFrame2Text(context, workspaceRoot);
    if (!mod) {
        const out = getOutput();
        out.appendLine('[export] Frame2Text could not be loaded. Candidates:');
        tried.forEach((t) => out.appendLine('  - ' + t));
        out.show(true);
        return { ok: false, error: 'Frame2Text.js を読み込めませんでした(詳細は出力 "Text2Frame Export")。設定 text2frame.modulePath で本体の場所を指定してください。' };
    }
    // buildPullText resolves Text2Frame itself for the 3-way, but load it here too: it primes the
    // shared global and lets us report the extension's modulePath candidates when it is missing.
    if (!loadText2Frame(context, workspaceRoot).mod) {
        return { ok: false, error: 'Text2Frame.js を読み込めませんでした。設定 text2frame.modulePath を確認してください。' };
    }
    try {
        const gameCommands = readEventList(workspaceRoot, target); // ours
        const id = snapshotIdFor(workspaceRoot, target);

        let existingText = '';
        if (fs.existsSync(target.textPath)) {
            existingText = fs.readFileSync(target.textPath, 'utf8');
        }
        let baseText = '';
        const baseP = baseSnapshotPath(workspaceRoot, id.key);
        if (fs.existsSync(baseP)) {
            baseText = fs.readFileSync(baseP, 'utf8');
        }

        // The whole 3-way/decompile/guard logic lives in the shared core (Frame2Text.buildPullText),
        // so CLI, plugin, t2f-sync and this extension all behave identically.
        const built = mod.buildPullText({
            list: gameCommands,
            englishTag: englishTagSetting(),
            omitDefaults: omitDefaultTagsSetting(),
            strategy: 'merge',
            existingText,
            baseText,
            fallbackHeader: renderFrontMatter(target, mod.VERSION)
        });
        // Merging across unresolved markers would re-merge the markers themselves and double them.
        if (built.skipped) {
            return { ok: true, textPath: target.textPath, skipped: built.skipped };
        }
        const written = built.text as string;
        writeTextFile(target.textPath, written);
        recordDataStateFor(context, workspaceRoot, target);
        // The game side becomes the new common ancestor — even when the merge conflicted.
        // BASE means "the text has seen the game up to here", not "the two agreed": the game's
        // changes are in the text, between the markers. Holding it back would make the same
        // conflict come back on the game side after the user resolves the text.
        // The one exception is an ancestor that itself carries markers (overwrite pull), which
        // the next 3-way would merge again.
        if (!built.markers) {
            saveBaseFor(workspaceRoot, target, built.baseText as string);
        }
        return { ok: true, textPath: target.textPath, conflicts: built.conflicts, markers: built.markers };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/** Build an ExportTarget from a text document's front matter. */
function targetFromDocument(document: vscode.TextDocument): ExportTarget {
    const { meta, hasFrontMatter } = parseFrontMatter(document.getText());
    if (!hasFrontMatter) {
        throw new Error('フロントマターが無いため書き出し元を特定できません。');
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
export function exportCurrentFile(context: vscode.ExtensionContext): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Text2Frame: アクティブなエディタがありません。');
        return;
    }
    const workspaceRoot = workspaceRootFor(editor.document);
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        return;
    }
    let target: ExportTarget;
    try {
        target = targetFromDocument(editor.document);
    } catch (e) {
        vscode.window.showErrorMessage('Text2Frame: ' + (e instanceof Error ? e.message : String(e)));
        return;
    }
    const result = mergePullToText(context, workspaceRoot, target);
    if (result.ok && result.skipped === 'game') {
        vscode.window.showWarningMessage('Text2Frame: ゲーム側に未解決の衝突の目印が残っているため統合できません。ツクールで目印3行を消すか、「全部取り直す」で目印ごと取り出してテキスト側で解決してください。');
    } else if (result.ok && result.skipped) {
        vscode.window.showWarningMessage('Text2Frame: テキストに未解決の衝突の目印が残っているため統合できません。目印3行を消して残す方を決めたあと、反映してください。');
    } else if (result.ok) {
        const c = result.conflicts || 0;
        vscode.window.showInformationMessage(`Text2Frame: ゲームから取り出しました${c ? `（${c} 件の競合は両方残しました。確認してください）` : ''}`);
    } else {
        vscode.window.showErrorMessage('Text2Frame: 取り出し失敗 - ' + (result.error || ''));
    }
}

/** Command: export the active file as a conversation-only text beside it (lossy sidecar). */
export function exportConversationOnly(context: vscode.ExtensionContext): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Text2Frame: アクティブなエディタがありません。');
        return;
    }
    const workspaceRoot = workspaceRootFor(editor.document);
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
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
    const result = exportToTextFile(context, workspaceRoot, target);
    if (result.ok) {
        vscode.window.showInformationMessage('Text2Frame: 会話のみテキストを書き出しました: ' + path.basename(result.textPath || ''));
        vscode.workspace.openTextDocument(result.textPath as string).then((doc) => vscode.window.showTextDocument(doc, { preview: true }));
    } else {
        vscode.window.showErrorMessage('Text2Frame: 書き出し失敗 - ' + (result.error || ''));
    }
}
