import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
}

interface T2FModule {
    applyTextFile: (opts: { [key: string]: unknown }) => ApplyResult;
}

interface FrontMatter {
    meta: { [key: string]: string };
    hasFrontMatter: boolean;
}

let outputChannel: vscode.OutputChannel | undefined;

function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame Deploy');
    }
    return outputChannel;
}

/** Parse the YAML-ish front matter block (same rules as the compiler). */
function parseFrontMatter(text: string): FrontMatter {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normalized.indexOf('---\n') !== 0) {
        return { meta: {}, hasFrontMatter: false };
    }
    const endIndex = normalized.indexOf('\n---\n', 4);
    if (endIndex < 0) {
        return { meta: {}, hasFrontMatter: false };
    }
    const header = normalized.slice(4, endIndex);
    const meta: { [key: string]: string } = {};
    header.split('\n').forEach((line) => {
        const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (!m) {
            return;
        }
        const raw = m[2].trim();
        meta[m[1]] = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    });
    return { meta, hasFrontMatter: true };
}

/** A document is "deployable" when it carries Text2Frame front matter. */
export function isDeployable(document: vscode.TextDocument): boolean {
    if (document.uri.scheme !== 'file') {
        return false;
    }
    return parseFrontMatter(document.getText()).hasFrontMatter;
}

/** Locate and load the compiler module that exports applyTextFile(). */
function loadCompiler(context: vscode.ExtensionContext, workspaceRoot: string | undefined): { mod?: T2FModule; tried: string[] } {
    const config = vscode.workspace.getConfiguration('text2frame');
    const configured = config.get<string>('modulePath');
    const extDir = context.extensionPath;

    const candidates: string[] = [];
    if (configured && configured.trim() !== '') {
        candidates.push(path.isAbsolute(configured) || !workspaceRoot ? configured : path.join(workspaceRoot, configured));
    }
    // Prefer the RAW Text2Frame.js: it is the Node entry (exports applyTextFile)
    // and works under require(). The bundled .cjs.js is browser-oriented and
    // does not resolve Node builtins (require('path')) when run outside a bundler.
    // Bundled copy (created at package time).
    candidates.push(path.join(extDir, 'lib', 'Text2Frame.js'));
    // Monorepo sibling (dev: extension lives at <repo>/vscode-extension).
    candidates.push(path.join(extDir, '..', 'Text2Frame.js'));
    // Fallback: the opened workspace itself.
    if (workspaceRoot) {
        candidates.push(path.join(workspaceRoot, 'Text2Frame.js'));
        candidates.push(path.join(workspaceRoot, 'js', 'plugins', 'Text2Frame.js'));
    }

    for (const candidate of candidates) {
        if (!candidate || !fs.existsSync(candidate)) {
            continue;
        }
        try {
            const resolved = require.resolve(candidate);
            delete require.cache[resolved];
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require(resolved) as T2FModule;
            if (mod && typeof mod.applyTextFile === 'function') {
                return { mod, tried: candidates };
            }
        } catch (e) {
            // Try the next candidate.
        }
    }
    return { tried: candidates };
}

/** Resolve the deploy target (data file + ids) from front matter, against the workspace. */
function resolveTarget(meta: { [key: string]: string }, workspaceRoot: string): { opts: { [key: string]: unknown }; label: string } {
    const dataDir = path.join(workspaceRoot, 'data');
    const kind = String(meta.kind || 'event').toLowerCase();

    if (kind === 'common') {
        const commonEventId = meta.commonEventId;
        if (!commonEventId) {
            throw new Error('commonEventId is missing in front matter');
        }
        const commonEventPath = meta.commonEventPath
            ? path.resolve(workspaceRoot, meta.commonEventPath)
            : path.join(dataDir, 'CommonEvents.json');
        return {
            opts: { kind: 'common', commonEventId, commonEventPath },
            label: `CommonEvent ${commonEventId}`
        };
    }

    // event
    const mapId = meta.mapId;
    const eventId = meta.eventId;
    const pageId = meta.pageId || '1';
    if (!eventId) {
        throw new Error('eventId is missing in front matter');
    }
    let mapPath: string;
    if (meta.mapPath) {
        mapPath = path.resolve(workspaceRoot, meta.mapPath);
    } else if (mapId) {
        mapPath = path.join(dataDir, 'Map' + ('000' + String(mapId)).slice(-3) + '.json');
    } else {
        throw new Error('mapId or mapPath is missing in front matter');
    }
    return {
        opts: { kind: 'event', mapId, eventId, pageId, mapPath },
        label: `Map ${mapId || '?'} / Event ${eventId} / Page ${pageId}`
    };
}

/** Deploy a single document. Returns the structured result (or undefined when skipped). */
export function deployDocument(
    document: vscode.TextDocument,
    context: vscode.ExtensionContext,
    deployDiagnostics: vscode.DiagnosticCollection
): ApplyResult | undefined {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspaceRoot = folder ? folder.uri.fsPath : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
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
    } else {
        out.appendLine(`[${time}] FAIL  ${resolved.label}  <- ${path.basename(document.uri.fsPath)}  ${result.error}`);
        setDeployDiagnostic(deployDiagnostics, document, result.error || 'deploy failed');
        vscode.window.showErrorMessage('Text2Frame: デプロイ失敗 - ' + (result.error || ''));
    }
    return result;
}

function setDeployDiagnostic(collection: vscode.DiagnosticCollection, document: vscode.TextDocument, message: string): void {
    const range = new vscode.Range(0, 0, 0, Math.max(1, document.lineAt(0).text.length));
    const diag = new vscode.Diagnostic(range, 'Text2Frame deploy: ' + message, vscode.DiagnosticSeverity.Error);
    collection.set(document.uri, [diag]);
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
