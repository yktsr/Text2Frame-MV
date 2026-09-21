import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFrontMatter, isDeployable, isAncestorCopy, ancestorCopyMessage, loadModule, workspaceRootFor, frontMatterBody, resolveTarget, dataChangedExternally, recordDataState, baseSnapshotPath, hasBaseSnapshot, saveBaseSnapshot, snapshotKeyFor, historyKeep } from './compiler';
import { noteWrite, withHistory } from './db/history';
import { placeFromMeta, placeKey } from './placeLabel';
import { mergePullToText, renderCommands, ExportTarget } from './exportText';
import { reviewEnabled } from './review';
import { reviewDeploy, busy, Decision, DeployCandidate, DeploySort } from './reviewApply';
import { eachSlowly } from './db/slowly';
import { PageRef, tryApply } from './dryRun';
import { tr } from './db/lang';

export { isDeployable };

/**
 * Text2Frame "deploy" feature: compile the current text file back into the
 * RPG Maker data JSON (Map###.json / CommonEvents.json), in-process via the
 * compiler's exported applyTextFile().
 *
 * The deploy target is derived from the YAML front matter at the top of the
 * text file (kind / mapId / eventId / pageId / commonEventId).
 */

interface ApplyResult {
    ok: boolean;
    textPath: string;
    kind?: string;
    target?: { [key: string]: string | undefined };
    dataPath?: string;
    warnings: string[];
    conflicts?: number;
    error?: string;
    errorLine?: number;
    errorLineText?: string;
    /** 差分を確かめたとき、ゲームが何も変わらなかった。 */
    unchanged?: boolean;
}

function pageRef(meta: { [key: string]: string }): PageRef {
    return meta.kind === 'common'
        ? { kind: 'common', commonEventId: meta.commonEventId }
        : { kind: 'event', mapId: meta.mapId, eventId: meta.eventId, pageId: meta.pageId || '1' };
}

function candidateFor(textPath: string, meta: { [key: string]: string }, applyOpts: { [key: string]: unknown }, dataPath: string): DeployCandidate {
    const basePath = typeof applyOpts.basePath === 'string' ? applyOpts.basePath : undefined;
    return {
        textPath,
        step: { applyOpts, dataPath, ref: pageRef(meta) },
        inputs: [textPath, dataPath, ...(basePath ? [basePath] : [])]
    };
}

export interface T2FModule {
    applyTextFile: (opts: { [key: string]: unknown }) => ApplyResult;
    /** コマンド列を、そのままゲームのデータへ書く(取り出しの書き戻しで使う)。 */
    applyCommandsToData?: (opts: { [key: string]: unknown }) => { ok: boolean; dataPath?: string; error?: string };
    /** opts.lineMap を渡すと { commands, lineMap } を返す(古いコンパイラは無視して配列を返す)。 */
    compile?: (text: string, opts?: { lineMap?: boolean }) => unknown;
}

let outputChannel: vscode.OutputChannel | undefined;

function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame Deploy');
    }
    return outputChannel;
}

/**
 * Identity of the 3-way BASE snapshot for a single file: the text's path relative to the
 * workspace root. Kept consistent with the batch commands so single-file and batch deploys
 * share the same ancestor.
 */
function snapshotIdFor(workspaceRoot: string, textPath: string): { key: string } {
    return { key: snapshotKeyFor(workspaceRoot, textPath) };
}

/**
 * 反映のあと、祖先(.t2f-base)を進める。
 * 統合の反映では、書き戻しも祖先の保存もコンパイラが済ませている(祖先はゲームに書いたほう)。
 * ここでは、何が起きたかを出力に書くだけ。
 * 上書き・追記の反映では、反映したテキストを祖先にする。
 */
export function writeBackAndRefreshBase(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    meta: { [key: string]: string },
    textPath: string,
    originalText: string,
    result: { warnings: string[]; conflicts?: number; writtenBack?: boolean },
    snap: { key: string },
    mergeLike: boolean
): void {
    if (mergeLike) {
        if ((result.conflicts || 0) > 0) {
            getOutput().appendLine(`    conflicts -> ${path.basename(textPath)} (resolve them in the text; the game keeps its own version)`);
        } else if (result.writtenBack) {
            getOutput().appendLine(`    write-back -> ${path.basename(textPath)}`);
        }
        return;
    }
    saveBaseSnapshot(workspaceRoot, snap.key, originalText);
}

/** Locate and load the compiler module that exports applyTextFile(). */
export function loadCompiler(context: vscode.ExtensionContext, workspaceRoot: string | undefined): { mod?: T2FModule; tried: string[] } {
    return loadModule<T2FModule>(
        context,
        workspaceRoot,
        'Text2Frame.js',
        (m) => !!m && typeof (m as T2FModule).applyTextFile === 'function'
    );
}

/** Deploy a single document. Returns the structured result (or undefined when skipped). */
/**
 * 反映の直前に、書き換わるもの(データ・テキスト・祖先)を履歴に控える。
 * テキストは反映の中で書き戻されることがあり、祖先はコンパイラが書き直す。
 */
export function noteApply(workspaceRoot: string, textPath: string, dataPath: string | undefined, meta: { [key: string]: string }): void {
    const place = placeFromMeta(meta);
    const key = place ? placeKey(place) : undefined;
    if (dataPath) noteWrite(dataPath, 'data', key ? [key] : undefined);
    noteWrite(textPath, 'text');
    noteWrite(baseSnapshotPath(workspaceRoot, snapshotKeyFor(workspaceRoot, textPath)), 'base');
}

const relativeLabel = (workspaceRoot: string, file: string): string => path.relative(workspaceRoot, file).split(path.sep).join('/');

export function deployDocument(
    document: vscode.TextDocument,
    context: vscode.ExtensionContext,
    deployDiagnostics: vscode.DiagnosticCollection,
    options: { review?: boolean; onSave?: boolean } = {}
): Promise<ApplyResult | undefined> {
    const root = workspaceRootFor(document);
    const file = document.uri.fsPath;
    const label = (options.onSave ? tr('保存時の反映 ', 'Apply on save ') : tr('ゲームに反映 ', 'Apply to game ')) + (root ? relativeLabel(root, file) : path.basename(file));
    // 保存時の反映は、同じテキストで5分以内に続いたら1つにまとめる(保存のたびに履歴が並ばないように)。
    const history = { keep: historyKeep(), mergeKey: options.onSave ? 'save:' + file : undefined };
    return withHistory(root, options.onSave ? 'applyOnSave' : 'apply', label, history,
        () => deployDocumentNow(document, context, deployDiagnostics, options));
}

async function deployDocumentNow(
    document: vscode.TextDocument,
    context: vscode.ExtensionContext,
    deployDiagnostics: vscode.DiagnosticCollection,
    options: { review?: boolean; onSave?: boolean }
): Promise<ApplyResult | undefined> {
    if (isAncestorCopy(document.uri.fsPath)) {
        vscode.window.showWarningMessage(ancestorCopyMessage());
        return undefined;
    }
    const workspaceRoot = workspaceRootFor(document);
    if (!workspaceRoot) {
        vscode.window.showErrorMessage(tr('Text2Frame: ワークスペースフォルダが見つかりません。', 'Text2Frame: No workspace folder was found.'));
        return undefined;
    }

    const { meta, hasFrontMatter } = parseFrontMatter(document.getText());
    if (!hasFrontMatter) {
        vscode.window.showWarningMessage(tr('Text2Frame: ファイルの先頭に宛先のメモ(--- で囲んだ部分)が無いため、ゲームのどこに反映するか分かりません。', 'Text2Frame: This text has no destination note (the part between --- at the top), so where it goes in the game is unknown.'));
        return undefined;
    }

    const { mod, tried } = loadCompiler(context, workspaceRoot);
    if (!mod) {
        vscode.window.showErrorMessage(
            tr('Text2Frame: コンパイラ (Text2Frame.js) が見つかりません。設定 text2frame.modulePath にパスを指定するか、ワークスペース直下に Text2Frame.js を配置してください。', 'Text2Frame: The compiler (Text2Frame.js) was not found. Set its path in text2frame.modulePath, or put Text2Frame.js at the top of the workspace.')
        );
        getOutput().appendLine('[deploy] compiler not found. tried:\n  ' + tried.join('\n  '));
        return undefined;
    }

    let resolved;
    try {
        resolved = resolveTarget(meta, workspaceRoot);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage('Text2Frame: ' + msg);
        setDeployDiagnostic(deployDiagnostics, document, msg);
        return { ok: false, textPath: document.uri.fsPath, warnings: [], error: msg };
    }

    const config = vscode.workspace.getConfiguration('text2frame');
    let strategy = config.get<string>('strategy') || 'merge';
    // overwrite replaces the JSON wholesale; merge preserves external JSON edits.
    const isOverwriteLike = (s: string): boolean => s === 'overwrite';
    const dataPath = (resolved.opts.mapPath || resolved.opts.commonEventPath) as string;
    const out = getOutput();
    const time = new Date().toLocaleTimeString();

    // Data-change guard: the JSON changed externally since we last wrote/pulled it.
    // Only overwrite-like strategies can lose those edits; merge preserves them, so we
    // only prompt when the configured strategy would overwrite.
    if (dataPath && isOverwriteLike(strategy) && dataChangedExternally(context, dataPath)) {
        const safe = tr('安全に反映する(おすすめ)', 'Apply safely (recommended)');
        const overwrite = tr('全部上書きする', 'Overwrite everything');
        const pull = tr('ゲームの内容を取り込む', 'Bring in the game\'s contents');
        const choice = await vscode.window.showWarningMessage(
            tr(`Text2Frame: ${path.basename(dataPath)} はゲーム側で変更されています。テキストで全部上書きすると、その変更が失われる可能性があります。`, `Text2Frame: ${path.basename(dataPath)} was changed in the game. Overwriting everything from the text may lose those changes.`),
            { modal: true },
            safe,
            overwrite,
            pull
        );
        if (choice === safe) {
            // Switch this deploy to the non-destructive smart merge, keeping external JSON edits.
            strategy = 'merge';
        } else if (choice === pull) {
            const pullTarget: ExportTarget = {
                kind: meta.kind === 'common' ? 'common' : 'event',
                mapId: meta.mapId,
                eventId: meta.eventId,
                pageId: meta.pageId || '1',
                commonEventId: meta.commonEventId,
                textPath: document.uri.fsPath,
                frontMatterSource: document.getText()
            };
            const ex = mergePullToText(context, workspaceRoot, pullTarget);
            recordDataState(context, dataPath);
            if (ex.ok) {
                vscode.window.showInformationMessage(tr('Text2Frame: ゲームの内容を取り込みました(編集は残しました)。内容を確認して保存し直してください。', 'Text2Frame: Brought in the game\'s contents (your edits stay). Check the text and save it again.'));
            } else {
                vscode.window.showErrorMessage(tr('Text2Frame: 取り込み失敗 - ', 'Text2Frame: Could not bring it in - ') + (ex.error || ''));
            }
            return undefined;
        } else if (choice === overwrite) {
            // Proceed with the overwrite as asked.
        } else {
            out.appendLine(`[${time}] CANCELLED (external change) ${path.basename(dataPath)}`);
            return undefined;
        }
    }

    // Default to 3-way merge: attach the BASE snapshot (common ancestor) when present so a
    // merge deploy reconciles writer text edits with external JSON edits, instead of overlaying.
    const mergeLike = strategy !== 'overwrite' && strategy !== 'import';
    const snap = snapshotIdFor(workspaceRoot, document.uri.fsPath);
    const applyOpts: { [key: string]: unknown } = {
        textPath: document.uri.fsPath,
        ...resolved.opts,
        strategy,
        // 祖先(.t2f-base)の置き場所。渡さないとコンパイラは process.cwd() を使い、拡張ホストでは
        // それが / なので保存できない。拡張の祖先(baseSnapshotPath)と同じ場所・同じ鍵になる。
        baseRoot: workspaceRoot
    };
    if (mergeLike && hasBaseSnapshot(workspaceRoot, snap.key)) {
        applyOpts.basePath = baseSnapshotPath(workspaceRoot, snap.key);
    }
    let decision: Decision | undefined;
    if (options.review) {
        decision = await reviewDeploy(context, workspaceRoot, mod, [candidateFor(document.uri.fsPath, meta, applyOpts, dataPath)], tr('このファイルの反映', 'Apply this file'));
        if (decision === 'cancel') {
            out.appendLine(`[${time}] CANCELLED (review) ${resolved.label}  <- ${path.basename(document.uri.fsPath)}`);
            vscode.window.setStatusBarMessage(tr('Text2Frame: 反映をやめました。', 'Text2Frame: Stopped applying.'), 4000);
            return undefined;
        }
    }
    noteApply(workspaceRoot, document.uri.fsPath, dataPath, meta);
    const result = mod.applyTextFile(applyOpts);
    if (decision === 'unchanged') result.unchanged = true;

    if (result.ok) {
        recordDataState(context, dataPath);
        deployDiagnostics.delete(document.uri);
        out.appendLine(`[${time}] OK  ${resolved.label}  <- ${path.basename(document.uri.fsPath)}` +
            (result.warnings.length ? `  (${result.warnings.length} warnings)` : ''));
        result.warnings.forEach((w) => out.appendLine('    warn: ' + w));
        if (result.warnings.length) {
            vscode.window.showWarningMessage(tr(`Text2Frame: ゲームに反映しました(警告 ${result.warnings.length} 件)`, `Text2Frame: Applied to the game (${result.warnings.length} warnings)`), tr('詳細', 'Details'))
                .then((pick) => { if (pick) { out.show(true); } });
        }
        // Optionally write the merged result back to the text, then refresh the 3-way BASE.
        writeBackAndRefreshBase(context, workspaceRoot, meta, document.uri.fsPath, document.getText(), result, snap, mergeLike);
    } else {
        out.appendLine(`[${time}] FAIL  ${resolved.label}  <- ${path.basename(document.uri.fsPath)}  ${result.error}`);
        setDeployDiagnostic(deployDiagnostics, document, result.error || 'deploy failed', result.errorLineText);
        const firstLine = (result.error || 'deploy failed').split('\n')[0];
        vscode.window.showErrorMessage(tr('Text2Frame: ゲームに反映できませんでした - ', 'Text2Frame: Could not apply to the game - ') + firstLine);
    }
    return result;
}

/**
 * Place an error diagnostic. When the compiler reports the offending line text
 * (errorLineText), underline that exact line in the document; otherwise fall
 * back to line 0. Line-text search is robust against the front-matter offset.
 */
function setDeployDiagnostic(
    collection: vscode.DiagnosticCollection,
    document: vscode.TextDocument,
    message: string,
    errorLineText?: string
): void {
    let lineNo = 0;
    if (errorLineText && errorLineText.trim() !== '') {
        for (let i = 0; i < document.lineCount; i++) {
            if (document.lineAt(i).text === errorLineText) {
                lineNo = i;
                break;
            }
        }
    }
    const lineLen = document.lineAt(lineNo).text.length;
    const range = new vscode.Range(lineNo, 0, lineNo, Math.max(1, lineLen));
    const diag = new vscode.Diagnostic(range, 'Text2Frame deploy: ' + message, vscode.DiagnosticSeverity.Error);
    collection.set(document.uri, [diag]);
}

/**
 * Deploy a text file on disk (no editor needed). Used by the tree view and
 * batch. Returns the structured result, or undefined if it cannot be attempted.
 */
interface PreparedFile {
    mod: T2FModule;
    meta: { [key: string]: string };
    text: string;
    applyOpts: { [key: string]: unknown };
    dataPath: string;
    snap: { key: string };
    mergeLike: boolean;
}

function prepareFile(context: vscode.ExtensionContext, workspaceRoot: string, filePath: string): PreparedFile | ApplyResult {
    if (isAncestorCopy(filePath)) {
        return { ok: false, textPath: filePath, warnings: [], error: ancestorCopyMessage() };
    }
    let text: string;
    try {
        text = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        return { ok: false, textPath: filePath, warnings: [], error: 'cannot read ' + filePath };
    }
    const { meta, hasFrontMatter } = parseFrontMatter(text);
    if (!hasFrontMatter) {
        return { ok: false, textPath: filePath, warnings: [], error: 'no front matter' };
    }
    const { mod } = loadCompiler(context, workspaceRoot);
    if (!mod) {
        return { ok: false, textPath: filePath, warnings: [], error: 'Text2Frame.js not found' };
    }
    let resolved;
    try {
        resolved = resolveTarget(meta, workspaceRoot);
    } catch (e) {
        return { ok: false, textPath: filePath, warnings: [], error: e instanceof Error ? e.message : String(e) };
    }
    const strategy = vscode.workspace.getConfiguration('text2frame').get<string>('strategy') || 'merge';
    // Default to 3-way merge: attach the BASE snapshot (common ancestor) when present.
    const mergeLike = strategy !== 'overwrite' && strategy !== 'import';
    const snap = snapshotIdFor(workspaceRoot, filePath);
    const applyOpts: { [key: string]: unknown } = {
        textPath: filePath,
        ...resolved.opts,
        strategy,
        baseRoot: workspaceRoot // 祖先の置き場所(上の deployDocument と同じ)
    };
    if (mergeLike && hasBaseSnapshot(workspaceRoot, snap.key)) {
        applyOpts.basePath = baseSnapshotPath(workspaceRoot, snap.key);
    }
    const dataPath = (resolved.opts.mapPath || resolved.opts.commonEventPath) as string;
    return { mod, meta, text, applyOpts, dataPath, snap, mergeLike };
}

export function deployFile(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    filePath: string
): ApplyResult | undefined {
    return withHistory(workspaceRoot, 'apply', tr('ゲームに反映 ', 'Apply to game ') + relativeLabel(workspaceRoot, filePath), { keep: historyKeep() },
        () => deployFileNow(context, workspaceRoot, filePath));
}

function deployFileNow(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    filePath: string
): ApplyResult | undefined {
    const prepared = prepareFile(context, workspaceRoot, filePath);
    if (!('mod' in prepared)) return prepared;
    const { mod, meta, text, applyOpts, dataPath, snap, mergeLike } = prepared;
    noteApply(workspaceRoot, filePath, dataPath, meta);
    const result = mod.applyTextFile(applyOpts);
    if (result && result.ok) {
        if (dataPath) {
            recordDataState(context, dataPath);
        }
        // Optionally write the merged result back to the text, then refresh the 3-way BASE.
        writeBackAndRefreshBase(context, workspaceRoot, meta, filePath, text, result, snap, mergeLike);
    }
    return result;
}

/** ゲームに反映されていない変更があるテキスト(反映すると、ゲームが変わるもの)。 */
export function unappliedFiles(context: vscode.ExtensionContext, workspaceRoot: string, files: string[]): Set<string> {
    const out = new Set<string>();
    findUnapplied(context, workspaceRoot, files, out);
    return out;
}

/** 同じことを少しずつ行う。1回ごとに手を離すので、たくさんのテキストでも VS Code が固まらない。 */
export async function unappliedFilesSlowly(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    files: string[],
    options: { chunk?: number; onProgress?: (done: number, total: number) => void; cancelled?: () => boolean } = {}
): Promise<Set<string>> {
    const chunk = options.chunk || 40;
    const out = new Set<string>();
    for (let at = 0; at < files.length; at += chunk) {
        if (options.cancelled && options.cancelled()) return out;
        findUnapplied(context, workspaceRoot, files.slice(at, at + chunk), out);
        if (options.onProgress) options.onProgress(Math.min(at + chunk, files.length), files.length);
        await new Promise((r) => setTimeout(r, 0));
    }
    return out;
}

function findUnapplied(context: vscode.ExtensionContext, workspaceRoot: string, files: string[], out: Set<string>): void {
    const { mod } = loadCompiler(context, workspaceRoot);
    if (!mod) return;
    const candidates: DeployCandidate[] = [];
    for (const file of files) {
        const prepared = prepareFile(context, workspaceRoot, file);
        if ('mod' in prepared) candidates.push(candidateFor(file, prepared.meta, prepared.applyOpts, prepared.dataPath));
    }
    tryApply(mod, candidates.map((c) => c.step)).forEach((trial, i) => {
        if (!trial.result.ok) return;
        // ほとんどのページは変わらない。まず中身をそのまま比べて、違うときだけテキストに直して比べる
        // (同じ内容でも書き方が違うことがあるので、最後はテキストで比べる)。
        if (JSON.stringify(trial.before) === JSON.stringify(trial.after)) return;
        if (renderCommands(context, workspaceRoot, trial.before) !== renderCommands(context, workspaceRoot, trial.after)) out.add(candidates[i].textPath);
    });
}

/**
 * 反映する前に、変わる所を差分で確かめる(設定が OFF なら確かめない)。
 * 用意できないファイル(宛先のメモが無いなど)は確かめに入れない。反映のときに今までどおり失敗を知らせる。
 */
/**
 * sort を渡すと、確かめない設定でも写しで試して、ゲームが変わるテキストと反映できないテキストを集める
 * (まとめて反映するときに、変わらないテキストまで書き直さないため)。
 */
export async function reviewFiles(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    files: string[],
    scope: string,
    sort?: DeploySort
): Promise<Decision> {
    const show = reviewEnabled();
    if (!show && !sort) return 'accept';
    const { mod } = loadCompiler(context, workspaceRoot);
    if (!mod) return 'accept';
    const candidates: DeployCandidate[] = [];
    const add = (file: string): void => {
        if (!addCandidate(context, workspaceRoot, file, candidates)) sort?.failed.add(file);
    };
    if (files.length <= 1) {
        for (const file of files) add(file);
    } else {
        // たくさんのテキストは、少しずつ読む(進み具合を出し、途中でやめられる)。
        const read = await busy(tr('Text2Frame: 反映するテキストを読んでいます…', 'Text2Frame: Reading the texts to apply…'), (slowly) => eachSlowly(files, add, slowly));
        if (!read) return 'cancel';
    }
    if (!candidates.length) return 'unchanged';
    const unreadable = sort ? Array.from(sort.failed) : [];
    const decision = await reviewDeploy(context, workspaceRoot, mod, candidates, scope, { sort, show });
    // 読めなかったテキストは、反映のときに理由を知らせるので、失敗の組に戻しておく。
    unreadable.forEach((file) => sort?.failed.add(file));
    return decision;
}

function addCandidate(context: vscode.ExtensionContext, workspaceRoot: string, file: string, out: DeployCandidate[]): boolean {
    const prepared = prepareFile(context, workspaceRoot, file);
    if (!('mod' in prepared)) return false;
    out.push(candidateFor(file, prepared.meta, prepared.applyOpts, prepared.dataPath));
    return true;
}

/** Command: compile the active text file and show the resulting event JSON in a preview. */
export function showCompiledJson(context: vscode.ExtensionContext): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage(tr('Text2Frame: アクティブなエディタがありません。', 'Text2Frame: No active editor.'));
        return;
    }
    const workspaceRoot = workspaceRootFor(editor.document);
    const { mod } = loadCompiler(context, workspaceRoot);
    if (!mod || typeof mod.compile !== 'function') {
        vscode.window.showErrorMessage(tr('Text2Frame: コンパイラ (Text2Frame.js) が見つかりません。', 'Text2Frame: The compiler (Text2Frame.js) was not found.'));
        return;
    }
    try {
        const commands = mod.compile(frontMatterBody(editor.document.getText()));
        const json = JSON.stringify(commands, null, 2);
        vscode.workspace.openTextDocument({ language: 'json', content: json })
            .then((doc) => vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside }));
    } catch (e) {
        const msg = e instanceof Error ? e.message.split('\n')[0] : String(e);
        vscode.window.showErrorMessage(tr('Text2Frame: コンパイルエラー - ', 'Text2Frame: Compile error - ') + msg);
    }
}

/** Wire up commands, status bar, and deploy-on-save. Called from activate(). */
export function registerDeployFeature(context: vscode.ExtensionContext): void {
    const deployDiagnostics = vscode.languages.createDiagnosticCollection('text2frame-deploy');

    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.command = 'text2frame.toggleDeployOnSave';

    const stateKey = 'text2frame.deployOnSave';
    const isOn = (): boolean => context.workspaceState.get<boolean>(stateKey, false);

    let revertTimer: NodeJS.Timeout | undefined;
    const renderBase = (): void => {
        if (isOn()) {
            statusBar.text = '$(eye) T2F: watching';
            statusBar.tooltip = tr('保存時に自動反映: ON (クリックで切り替え)', 'Apply on save: ON (click to switch)');
        } else {
            statusBar.text = '$(circle-outline) T2F: off';
            statusBar.tooltip = tr('保存時に自動反映: OFF (クリックで切り替え)', 'Apply on save: OFF (click to switch)');
        }
        statusBar.show();
    };
    const flashResult = (result: ApplyResult | undefined): void => {
        if (!result) {
            return;
        }
        if (revertTimer) {
            clearTimeout(revertTimer);
        }
        const time = new Date().toLocaleTimeString();
        if (result.ok) {
            const w = result.warnings.length ? ` (${result.warnings.length} warn)` : '';
            statusBar.text = `$(check) T2F ok${w}`;
            statusBar.tooltip = `${time} ${result.dataPath ? path.basename(result.dataPath) : ''}` +
                (result.warnings.length ? '\n' + result.warnings.join('\n') : '');
        } else {
            statusBar.text = '$(error) T2F fail';
            statusBar.tooltip = `${time} ${result.error || ''}`;
        }
        statusBar.show();
        revertTimer = setTimeout(renderBase, 5000);
    };
    renderBase();

    // Per-uri debounce for save-triggered deploys.
    const timers = new Map<string, NodeJS.Timeout>();
    // ボタンで反映するときの保存。差分を確かめている間に、保存時の自動反映が先に書き込まないようにする。
    const manualSaves = new Set<string>();
    const scheduleDeploy = (document: vscode.TextDocument): void => {
        const key = document.uri.toString();
        const existing = timers.get(key);
        if (existing) {
            clearTimeout(existing);
        }
        timers.set(key, setTimeout(() => {
            timers.delete(key);
            deployDocument(document, context, deployDiagnostics, { onSave: true }).then(flashResult);
        }, 250));
    };

    context.subscriptions.push(
        statusBar,
        deployDiagnostics,
        vscode.commands.registerCommand('text2frame.deployCurrentFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage(tr('Text2Frame: アクティブなエディタがありません。', 'Text2Frame: No active editor.'));
                return;
            }
            const review = reviewEnabled();
            const key = editor.document.uri.toString();
            if (review) manualSaves.add(key);
            editor.document.save().then(() => {
                deployDocument(editor.document, context, deployDiagnostics, { review }).then((result) => {
                    flashResult(result);
                    // Explicit command: confirm a clean success with a toast (deployDocument
                    // already toasts on warnings/errors; deploy-on-save stays quiet).
                    if (result && result.ok && result.warnings.length === 0) {
                        vscode.window.showInformationMessage(result.unchanged ? tr('Text2Frame: ゲームは変わりませんでした。', 'Text2Frame: The game did not change.') : tr('Text2Frame: ゲームに反映しました。', 'Text2Frame: Applied to the game.'));
                    }
                }).finally(() => manualSaves.delete(key));
            }, () => manualSaves.delete(key));
        }),
        vscode.commands.registerCommand('text2frame.toggleDeployOnSave', () => {
            const next = !isOn();
            context.workspaceState.update(stateKey, next);
            renderBase();
            vscode.window.showInformationMessage(tr('Text2Frame: 保存時の自動反映を ', 'Text2Frame: Turned apply on save ') + (next ? 'ON' : 'OFF') + tr(' にしました。', '.'));
        }),
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (!isOn()) {
                return;
            }
            if (!isDeployable(document) || manualSaves.has(document.uri.toString())) {
                return;
            }
            scheduleDeploy(document);
        })
    );
}
