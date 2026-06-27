import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    parseFrontMatter,
    loadModule,
    workspaceRootFor,
    mapPathFor,
    commonEventsPathFor,
    recordDataState
} from './compiler';

/**
 * Export feature: read the RPG Maker data JSON and write it back out as a
 * Text2Frame text file (reverse of deploy), using Frame2Text.decompile().
 */

interface Frame2TextModule {
    decompile: (list: unknown[], englishTag: boolean, options?: { pretty?: boolean; translationOnly?: boolean }) => string;
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

function englishTagSetting(): boolean {
    return vscode.workspace.getConfiguration('text2frame').get<boolean>('englishTag', true);
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

/** Keep the existing front matter header (through the closing `---`) if present. */
function existingFrontMatterHeader(text: string): string | undefined {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normalized.indexOf('---\n') !== 0) {
        return undefined;
    }
    const endIndex = normalized.indexOf('\n---\n', 4);
    if (endIndex < 0) {
        return undefined;
    }
    return normalized.slice(0, endIndex + 5); // includes trailing "\n---\n"
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
        const body = mod.decompile(list, englishTagSetting(), { pretty: true, translationOnly: !!target.translationOnly });

        let header: string | undefined;
        if (!target.translationOnly && target.frontMatterSource) {
            header = existingFrontMatterHeader(target.frontMatterSource);
        }
        if (!header) {
            header = renderFrontMatter(target, mod.VERSION);
        }

        const dir = path.dirname(target.textPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(target.textPath, header + '\n' + body + '\n', 'utf8');
        // Record the data baseline: after a pull, text matches data, so a later
        // deploy should not flag this data file as externally changed.
        const dataPath = target.kind === 'common'
            ? commonEventsPathFor(workspaceRoot)
            : (target.mapId ? mapPathFor(workspaceRoot, target.mapId) : undefined);
        if (dataPath) {
            recordDataState(context, dataPath);
        }
        return { ok: true, textPath: target.textPath };
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

/** Command: re-export the active text file from its data source (pull from data). */
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
    const result = exportToTextFile(context, workspaceRoot, target);
    if (result.ok) {
        vscode.window.showInformationMessage('Text2Frame: データからテキストへ書き出しました。');
    } else {
        vscode.window.showErrorMessage('Text2Frame: 書き出し失敗 - ' + (result.error || ''));
    }
}

/** Command: export the active file as a translation-only (conversation) text beside it. */
export function exportCurrentFileForTranslation(context: vscode.ExtensionContext): void {
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
    // Lossy extraction: write beside the source as *.translation.txt, never overwrite the editable file.
    const srcPath = editor.document.uri.fsPath;
    const ext = path.extname(srcPath);
    target.textPath = srcPath.slice(0, srcPath.length - ext.length) + '.translation' + (ext || '.txt');
    target.translationOnly = true;
    const result = exportToTextFile(context, workspaceRoot, target);
    if (result.ok) {
        vscode.window.showInformationMessage('Text2Frame: 翻訳用テキスト(会話のみ)を書き出しました: ' + path.basename(result.textPath || ''));
        vscode.workspace.openTextDocument(result.textPath as string).then((doc) => vscode.window.showTextDocument(doc, { preview: true }));
    } else {
        vscode.window.showErrorMessage('Text2Frame: 書き出し失敗 - ' + (result.error || ''));
    }
}
