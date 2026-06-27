import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFrontMatter, resolveTarget, workspaceRootFor, loadModule, dataDirFor } from './compiler';
import { exportToTextFile, ExportTarget } from './exportText';

/**
 * Batch operations: deploy every text file into data, or export every data
 * event/common into text.
 */

interface T2FModule {
    applyTextFile: (opts: { [key: string]: unknown }) => { ok: boolean; warnings: string[]; error?: string };
}

let outputChannel: vscode.OutputChannel | undefined;
function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame Batch');
    }
    return outputChannel;
}

function localeSetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('locale', 'ja');
}
function textBaseSetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('textBaseDir', 'text');
}
function strategySetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('strategy', 'diff');
}

/** Recursively collect *.txt files under a directory. */
export function walkTextFiles(dir: string): string[] {
    const result: string[] = [];
    if (!fs.existsSync(dir)) {
        return result;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...walkTextFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.txt') && !entry.name.endsWith('.translation.txt')) {
            result.push(full);
        }
    }
    return result;
}

/** Deploy every text file (with front matter) under the text base dir into data JSON. */
export function deployAll(context: vscode.ExtensionContext): void {
    const root = workspaceRootFor();
    if (!root) {
        vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        return;
    }
    const { mod } = loadModule<T2FModule>(context, root, 'Text2Frame.js', (m) => !!m && typeof (m as T2FModule).applyTextFile === 'function');
    if (!mod) {
        vscode.window.showErrorMessage('Text2Frame: コンパイラ (Text2Frame.js) が見つかりません。');
        return;
    }
    const textDir = path.join(root, textBaseSetting());
    const files = walkTextFiles(textDir).filter((f) => parseFrontMatter(fs.readFileSync(f, 'utf8')).hasFrontMatter);
    if (files.length === 0) {
        vscode.window.showInformationMessage(`Text2Frame: ${path.relative(root, textDir)} にデプロイ対象(フロントマター付き .txt)がありません。`);
        return;
    }

    const out = getOutput();
    out.appendLine(`=== Deploy All (${files.length} files, strategy=${strategySetting()}) ===`);
    let ok = 0;
    let fail = 0;
    let warn = 0;
    for (const file of files) {
        try {
            const { meta } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
            const { opts, label } = resolveTarget(meta, root);
            const res = mod.applyTextFile({ textPath: file, ...opts, strategy: strategySetting(), overwrite: strategySetting() === 'import', backup: true });
            if (res.ok) {
                ok++;
                warn += res.warnings.length;
                out.appendLine(`OK   ${label}  <- ${path.relative(root, file)}` + (res.warnings.length ? `  (${res.warnings.length} warn)` : ''));
            } else {
                fail++;
                out.appendLine(`FAIL ${label}  <- ${path.relative(root, file)}  ${res.error}`);
            }
        } catch (e) {
            fail++;
            out.appendLine(`FAIL ${path.relative(root, file)}  ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    out.appendLine(`=== done: ${ok} ok, ${fail} fail, ${warn} warnings ===`);
    const msg = `Text2Frame: 一括デプロイ完了 — ${ok} 成功 / ${fail} 失敗`;
    if (fail > 0) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}

/** Export every non-empty event/page and common event from data into text files. */
export function exportAll(context: vscode.ExtensionContext): void {
    const root = workspaceRootFor();
    if (!root) {
        vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        return;
    }
    const dataDir = dataDirFor(root);
    if (!fs.existsSync(dataDir)) {
        vscode.window.showErrorMessage('Text2Frame: データフォルダが見つかりません: ' + dataDir);
        return;
    }
    const locale = localeSetting();
    const outDir = path.join(root, textBaseSetting(), locale);
    const out = getOutput();
    out.appendLine(`=== Export All -> ${path.relative(root, outDir)} ===`);

    let written = 0;
    let fail = 0;
    const targets: ExportTarget[] = [];

    // Map events / pages
    for (const file of fs.readdirSync(dataDir)) {
        const m = file.match(/^Map(\d+)\.json$/);
        if (!m) {
            continue;
        }
        const mapId = String(parseInt(m[1], 10));
        let map;
        try {
            map = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
        } catch (e) {
            continue;
        }
        if (!map.events || !Array.isArray(map.events)) {
            continue;
        }
        map.events.forEach((event: { pages?: { list?: unknown[] }[] }, eventIndex: number) => {
            if (!event || !event.pages) {
                return;
            }
            event.pages.forEach((page, pageIndex: number) => {
                if (!page || !Array.isArray(page.list) || page.list.length <= 1) {
                    return; // skip empty pages
                }
                const eventId = String(eventIndex);
                const pageId = String(pageIndex + 1);
                const key = `map${mapId.padStart(3, '0')}_event${eventId.padStart(3, '0')}_page${pageId}`;
                targets.push({
                    kind: 'event',
                    mapId,
                    eventId,
                    pageId,
                    textPath: path.join(outDir, key + '.txt')
                });
            });
        });
    }

    // Common events
    const cePath = path.join(dataDir, 'CommonEvents.json');
    if (fs.existsSync(cePath)) {
        try {
            const ce = JSON.parse(fs.readFileSync(cePath, 'utf8'));
            ce.forEach((entry: { list?: unknown[] }, index: number) => {
                if (!entry || !Array.isArray(entry.list) || entry.list.length <= 1) {
                    return;
                }
                const key = `common${String(index).padStart(3, '0')}`;
                targets.push({ kind: 'common', commonEventId: String(index), textPath: path.join(outDir, key + '.txt') });
            });
        } catch (e) {
            // ignore malformed CommonEvents.json
        }
    }

    for (const target of targets) {
        // Reuse the existing text file's front matter header when present.
        if (fs.existsSync(target.textPath)) {
            target.frontMatterSource = fs.readFileSync(target.textPath, 'utf8');
        }
        const res = exportToTextFile(context, root, target);
        if (res.ok) {
            written++;
            out.appendLine(`OK   ${path.relative(root, target.textPath)}`);
        } else {
            fail++;
            out.appendLine(`FAIL ${path.relative(root, target.textPath)}  ${res.error}`);
        }
    }
    out.appendLine(`=== done: ${written} written, ${fail} fail ===`);
    const msg = `Text2Frame: 一括書き出し完了 — ${written} 件出力 / ${fail} 失敗`;
    if (fail > 0) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}
