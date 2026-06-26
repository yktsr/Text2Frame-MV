import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFrontMatter, isDeployable, loadModule, workspaceRootFor, frontMatterBody, resolveTarget } from './compiler';
import { exportToTextFile, ExportTarget } from './exportText';

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
export function deployDocument(
    document: vscode.TextDocument,
    context: vscode.ExtensionContext,
    deployDiagnostics: vscode.DiagnosticCollection
): ApplyResult | undefined {
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
    const strategy = config.get<string>('strategy') || 'diff';

    const result = mod.applyTextFile({
        textPath: document.uri.fsPath,
        ...resolved.opts,
        strategy,
        overwrite: strategy === 'import',
        backup: true
    });

    const out = getOutput();
    const time = new Date().toLocaleTimeString();
    if (result.ok) {
        deployDiagnostics.delete(document.uri);
        out.appendLine(`[${time}] OK  ${resolved.label}  <- ${path.basename(document.uri.fsPath)}` +
            (result.warnings.length ? `  (${result.warnings.length} warnings)` : ''));
        result.warnings.forEach((w) => out.appendLine('    warn: ' + w));
        if (result.warnings.length) {
            vscode.window.showWarningMessage(`Text2Frame: デプロイ完了 (${result.warnings.length} 件の警告)`, '詳細')
                .then((pick) => { if (pick) { out.show(true); } });
        }
        // Sync-back: re-export the merged data to text (normalize), keeping front matter.
        if (vscode.workspace.getConfiguration('text2frame').get<boolean>('syncOnSave', false)) {
            const syncTarget: ExportTarget = {
                kind: meta.kind === 'common' ? 'common' : 'event',
                mapId: meta.mapId,
                eventId: meta.eventId,
                pageId: meta.pageId || '1',
                commonEventId: meta.commonEventId,
                textPath: document.uri.fsPath,
                frontMatterSource: document.getText()
            };
            const ex = exportToTextFile(context, workspaceRoot, syncTarget);
            if (ex.ok) {
                out.appendLine(`[${time}] SYNC -> ${path.basename(document.uri.fsPath)}`);
            } else {
                out.appendLine(`[${time}] SYNC failed: ${ex.error}`);
            }
        }
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
    const strategy = vscode.workspace.getConfiguration('text2frame').get<string>('strategy') || 'diff';
    return mod.applyTextFile({
        textPath: filePath,
        ...resolved.opts,
        strategy,
        overwrite: strategy === 'import',
        backup: true
    });
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
            flashResult(deployDocument(document, context, deployDiagnostics));
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
                flashResult(deployDocument(editor.document, context, deployDiagnostics));
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
