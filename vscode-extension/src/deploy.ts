import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFrontMatter, isDeployable, loadModule, workspaceRootFor, frontMatterBody, resolveTarget, dataChangedExternally, recordDataState, baseSnapshotPath, hasBaseSnapshot, saveBaseSnapshot } from './compiler';
import { exportToTextFile, mergePullToText, ExportTarget } from './exportText';

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
    error?: string;
    errorLine?: number;
    errorLineText?: string;
}

interface T2FModule {
    applyTextFile: (opts: { [key: string]: unknown }) => ApplyResult;
    compile?: (text: string) => unknown[];
}

let outputChannel: vscode.OutputChannel | undefined;

function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame Deploy');
    }
    return outputChannel;
}

/**
 * Identity of the 3-way BASE snapshot for a single file: locale from front matter (or the
 * parent folder name as a fallback), key from the file name. Kept consistent with the
 * locale/key used by Seed Locale / Deploy Locale so single-file deploys share the same ancestor.
 */
function snapshotIdFor(meta: { [key: string]: string }, textPath: string): { locale: string; key: string } {
    const key = path.basename(textPath, path.extname(textPath));
    const locale = meta.locale || path.basename(path.dirname(textPath)) || 'default';
    return { locale, key };
}

/**
 * After a successful merge deploy, optionally write the merged JSON back into the text file
 * (so 3-way kept-both conflicts surface for the writer), then refresh the BASE snapshot so the
 * next deploy is a clean 3-way. Controlled by `text2frame.writeBackAfterMerge`:
 *   - off       : never write back
 *   - onConflict: write back only when the merge kept conflicts (default)
 *   - always    : write back after every successful deploy (text mirrors JSON)
 * The BASE is set to the final text (written-back if any, else the just-deployed text).
 */
export function writeBackAndRefreshBase(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    meta: { [key: string]: string },
    textPath: string,
    originalText: string,
    result: { warnings: string[] },
    snap: { locale: string; key: string },
    mergeLike: boolean
): void {
    const mode = vscode.workspace.getConfiguration('text2frame').get<string>('writeBackAfterMerge', 'onConflict');
    const hadConflict = result.warnings.some((w) => /conflict|衝突/i.test(w));
    const shouldWriteBack = mergeLike && (mode === 'always' || (mode === 'onConflict' && hadConflict));
    let finalText = originalText;
    if (shouldWriteBack) {
        const target: ExportTarget = {
            kind: meta.kind === 'common' ? 'common' : 'event',
            mapId: meta.mapId,
            eventId: meta.eventId,
            pageId: meta.pageId || '1',
            commonEventId: meta.commonEventId,
            textPath,
            frontMatterSource: originalText
        };
        const ex = exportToTextFile(context, workspaceRoot, target);
        if (ex.ok) {
            try { finalText = fs.readFileSync(textPath, 'utf8'); } catch (e) { /* keep original */ }
            getOutput().appendLine(`    write-back -> ${path.basename(textPath)}${hadConflict ? ' (conflicts to resolve)' : ''}`);
        } else {
            getOutput().appendLine(`    write-back failed: ${ex.error}`);
        }
    }
    // overwrite の直後も text==game なので、merge と同じく祖先を更新する。
    saveBaseSnapshot(workspaceRoot, snap.locale, snap.key, finalText);
}

/** Locate and load the compiler module that exports applyTextFile(). */
function loadCompiler(context: vscode.ExtensionContext, workspaceRoot: string | undefined): { mod?: T2FModule; tried: string[] } {
    return loadModule<T2FModule>(
        context,
        workspaceRoot,
        'Text2Frame.js',
        (m) => !!m && typeof (m as T2FModule).applyTextFile === 'function'
    );
}

/** Deploy a single document. Returns the structured result (or undefined when skipped). */
export async function deployDocument(
    document: vscode.TextDocument,
    context: vscode.ExtensionContext,
    deployDiagnostics: vscode.DiagnosticCollection
): Promise<ApplyResult | undefined> {
    const workspaceRoot = workspaceRootFor(document);
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        return undefined;
    }

    const { meta, hasFrontMatter } = parseFrontMatter(document.getText());
    if (!hasFrontMatter) {
        vscode.window.showWarningMessage('Text2Frame: フロントマターが無いためデプロイ先を特定できません。');
        return undefined;
    }

    const { mod, tried } = loadCompiler(context, workspaceRoot);
    if (!mod) {
        vscode.window.showErrorMessage(
            'Text2Frame: コンパイラ (Text2Frame.js) が見つかりません。設定 text2frame.modulePath にパスを指定するか、ワークスペース直下に Text2Frame.js を配置してください。'
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
        const choice = await vscode.window.showWarningMessage(
            `Text2Frame: ${path.basename(dataPath)} はゲーム側で変更されています。テキストで全部上書きすると、その変更が失われる可能性があります。`,
            { modal: true },
            '安全に反映する(おすすめ)',
            '全部上書きする',
            'ゲームの内容を取り込む'
        );
        if (choice === '安全に反映する(おすすめ)') {
            // Switch this deploy to the non-destructive smart merge, keeping external JSON edits.
            strategy = 'merge';
        } else if (choice === 'ゲームの内容を取り込む') {
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
                vscode.window.showInformationMessage('Text2Frame: ゲームの内容を取り込みました(編集は残しました)。内容を確認して保存し直してください。');
            } else {
                vscode.window.showErrorMessage('Text2Frame: 取り込み失敗 - ' + (ex.error || ''));
            }
            return undefined;
        } else if (choice === '全部上書きする') {
            // Snapshot the about-to-be-overwritten data so it can be recovered.
            try {
                fs.copyFileSync(dataPath, dataPath + '.conflict.bak');
                out.appendLine(`[${time}] saved conflict backup: ${path.basename(dataPath)}.conflict.bak`);
            } catch (e) {
                // best effort
            }
        } else {
            out.appendLine(`[${time}] CANCELLED (external change) ${path.basename(dataPath)}`);
            return undefined;
        }
    }

    // Default to 3-way merge: attach the BASE snapshot (common ancestor) when present so a
    // merge deploy reconciles writer text edits with external JSON edits, instead of overlaying.
    const mergeLike = strategy !== 'overwrite' && strategy !== 'import';
    const snap = snapshotIdFor(meta, document.uri.fsPath);
    const applyOpts: { [key: string]: unknown } = {
        textPath: document.uri.fsPath,
        ...resolved.opts,
        strategy,
        backup: true
    };
    if (mergeLike && hasBaseSnapshot(workspaceRoot, snap.locale, snap.key)) {
        applyOpts.basePath = baseSnapshotPath(workspaceRoot, snap.locale, snap.key);
    }
    const result = mod.applyTextFile(applyOpts);

    if (result.ok) {
        recordDataState(context, dataPath);
        deployDiagnostics.delete(document.uri);
        out.appendLine(`[${time}] OK  ${resolved.label}  <- ${path.basename(document.uri.fsPath)}` +
            (result.warnings.length ? `  (${result.warnings.length} warnings)` : ''));
        result.warnings.forEach((w) => out.appendLine('    warn: ' + w));
        if (result.warnings.length) {
            vscode.window.showWarningMessage(`Text2Frame: デプロイ完了 (${result.warnings.length} 件の警告)`, '詳細')
                .then((pick) => { if (pick) { out.show(true); } });
        }
        // Optionally write the merged result back to the text, then refresh the 3-way BASE.
        writeBackAndRefreshBase(context, workspaceRoot, meta, document.uri.fsPath, document.getText(), result, snap, mergeLike);
    } else {
        out.appendLine(`[${time}] FAIL  ${resolved.label}  <- ${path.basename(document.uri.fsPath)}  ${result.error}`);
        setDeployDiagnostic(deployDiagnostics, document, result.error || 'deploy failed', result.errorLineText);
        const firstLine = (result.error || 'deploy failed').split('\n')[0];
        vscode.window.showErrorMessage('Text2Frame: デプロイ失敗 - ' + firstLine);
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
export function deployFile(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    filePath: string
): ApplyResult | undefined {
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
    const snap = snapshotIdFor(meta, filePath);
    const applyOpts: { [key: string]: unknown } = {
        textPath: filePath,
        ...resolved.opts,
        strategy,
        backup: true
    };
    if (mergeLike && hasBaseSnapshot(workspaceRoot, snap.locale, snap.key)) {
        applyOpts.basePath = baseSnapshotPath(workspaceRoot, snap.locale, snap.key);
    }
    const result = mod.applyTextFile(applyOpts);
    if (result && result.ok) {
        const dataPath = (resolved.opts.mapPath || resolved.opts.commonEventPath) as string;
        if (dataPath) {
            recordDataState(context, dataPath);
        }
        // Optionally write the merged result back to the text, then refresh the 3-way BASE.
        writeBackAndRefreshBase(context, workspaceRoot, meta, filePath, text, result, snap, mergeLike);
    }
    return result;
}

/** Command: compile the active text file and show the resulting event JSON in a preview. */
export function showCompiledJson(context: vscode.ExtensionContext): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Text2Frame: アクティブなエディタがありません。');
        return;
    }
    const workspaceRoot = workspaceRootFor(editor.document);
    const { mod } = loadCompiler(context, workspaceRoot);
    if (!mod || typeof mod.compile !== 'function') {
        vscode.window.showErrorMessage('Text2Frame: コンパイラ (Text2Frame.js) が見つかりません。');
        return;
    }
    try {
        const commands = mod.compile(frontMatterBody(editor.document.getText()));
        const json = JSON.stringify(commands, null, 2);
        vscode.workspace.openTextDocument({ language: 'json', content: json })
            .then((doc) => vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside }));
    } catch (e) {
        const msg = e instanceof Error ? e.message.split('\n')[0] : String(e);
        vscode.window.showErrorMessage('Text2Frame: コンパイルエラー - ' + msg);
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
            statusBar.tooltip = '保存時に自動デプロイ: ON (クリックで切替)';
        } else {
            statusBar.text = '$(circle-outline) T2F: off';
            statusBar.tooltip = '保存時に自動デプロイ: OFF (クリックで切替)';
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
    const scheduleDeploy = (document: vscode.TextDocument): void => {
        const key = document.uri.toString();
        const existing = timers.get(key);
        if (existing) {
            clearTimeout(existing);
        }
        timers.set(key, setTimeout(() => {
            timers.delete(key);
            deployDocument(document, context, deployDiagnostics).then(flashResult);
        }, 250));
    };

    context.subscriptions.push(
        statusBar,
        deployDiagnostics,
        vscode.commands.registerCommand('text2frame.deployCurrentFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Text2Frame: アクティブなエディタがありません。');
                return;
            }
            editor.document.save().then(() => {
                deployDocument(editor.document, context, deployDiagnostics).then((result) => {
                    flashResult(result);
                    // Explicit command: confirm a clean success with a toast (deployDocument
                    // already toasts on warnings/errors; deploy-on-save stays quiet).
                    if (result && result.ok && result.warnings.length === 0) {
                        vscode.window.showInformationMessage('Text2Frame: ゲームに反映しました。');
                    }
                });
            });
        }),
        vscode.commands.registerCommand('text2frame.toggleDeployOnSave', () => {
            const next = !isOn();
            context.workspaceState.update(stateKey, next);
            renderBase();
            vscode.window.showInformationMessage('Text2Frame: 保存時の自動デプロイを ' + (next ? 'ON' : 'OFF') + ' にしました。');
        }),
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (!isOn()) {
                return;
            }
            if (!isDeployable(document)) {
                return;
            }
            scheduleDeploy(document);
        })
    );
}
