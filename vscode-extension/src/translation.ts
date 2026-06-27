import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFrontMatter, resolveTarget, workspaceRootFor, loadModule, dataDirFor } from './compiler';
import { exportToTextFile, ExportTarget } from './exportText';
import { walkTextFiles } from './batch';

/**
 * VS Code-only translation flow:
 *   1. "Create Translation Set" — seed text/<targetLocale>/ from the data JSON
 *      (same body as the source, front matter carries locale/sourceLocale).
 *      Existing files are kept, so re-running never clobbers translations.
 *   2. Translate the text/<targetLocale>/*.txt files.
 *   3. "Deploy Translation" — import only text/<targetLocale>/ back into the data.
 */

interface T2FModule {
    applyTextFile: (opts: { [key: string]: unknown }) => { ok: boolean; warnings: string[]; error?: string };
}

let outputChannel: vscode.OutputChannel | undefined;
function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame Translation');
    }
    return outputChannel;
}

function cfg(key: string, def: string): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>(key, def) || def;
}
const sourceLocaleSetting = (): string => cfg('sourceLocale', 'ja');
const targetLocaleSetting = (): string => cfg('targetLocale', 'en');
const textBaseSetting = (): string => cfg('textBaseDir', 'text');
const strategySetting = (): string => cfg('strategy', 'diff');

interface DataItem {
    kind: 'event' | 'common';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
    key: string;
}

/** Enumerate every non-empty event/page and common event in the data dir. */
function enumerateDataTargets(dataDir: string): DataItem[] {
    const items: DataItem[] = [];
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
                    return;
                }
                const eventId = String(eventIndex);
                const pageId = String(pageIndex + 1);
                const key = `map${mapId.padStart(3, '0')}_event${eventId.padStart(3, '0')}_page${pageId}`;
                items.push({ kind: 'event', mapId, eventId, pageId, key });
            });
        });
    }
    const cePath = path.join(dataDir, 'CommonEvents.json');
    if (fs.existsSync(cePath)) {
        try {
            const ce = JSON.parse(fs.readFileSync(cePath, 'utf8'));
            ce.forEach((entry: { list?: unknown[] }, index: number) => {
                if (!entry || !Array.isArray(entry.list) || entry.list.length <= 1) {
                    return;
                }
                items.push({ kind: 'common', commonEventId: String(index), key: `common${String(index).padStart(3, '0')}` });
            });
        } catch (e) {
            // ignore malformed CommonEvents.json
        }
    }
    return items;
}

/**
 * Command: seed text/<targetLocale>/ from the source data JSON. The body is the
 * source content (a starting point for translation); the front matter records
 * locale/sourceLocale. Existing files are skipped so translations are preserved.
 */
export function createTranslationSet(context: vscode.ExtensionContext): void {
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
    const source = sourceLocaleSetting();
    const target = targetLocaleSetting();
    if (source === target) {
        vscode.window.showErrorMessage(`Text2Frame: sourceLocale と targetLocale が同じ (${source}) です。設定 text2frame.targetLocale を変更してください。`);
        return;
    }
    const outDir = path.join(root, textBaseSetting(), target);
    const out = getOutput();
    out.appendLine(`=== Create Translation Set: ${source} -> ${target} (${path.relative(root, outDir)}) ===`);

    const items = enumerateDataTargets(dataDir);
    let created = 0;
    let skipped = 0;
    let fail = 0;
    for (const it of items) {
        const textPath = path.join(outDir, it.key + '.txt');
        if (fs.existsSync(textPath)) {
            skipped++; // 既存の翻訳を上書きしない
            continue;
        }
        const exportTarget: ExportTarget = {
            kind: it.kind,
            mapId: it.mapId,
            eventId: it.eventId,
            pageId: it.pageId,
            commonEventId: it.commonEventId,
            textPath,
            locale: target,
            sourceLocale: source
        };
        const res = exportToTextFile(context, root, exportTarget);
        if (res.ok) {
            created++;
            out.appendLine(`NEW  ${path.relative(root, textPath)}`);
        } else {
            fail++;
            out.appendLine(`FAIL ${path.relative(root, textPath)}  ${res.error}`);
        }
    }
    out.appendLine(`=== done: ${created} created, ${skipped} skipped (existing), ${fail} fail ===`);
    const msg = `Text2Frame: 翻訳セット作成 (${source}→${target}) — ${created} 新規 / ${skipped} 既存維持 / ${fail} 失敗`;
    if (fail > 0) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}

/** Command: deploy only text/<targetLocale>/ back into the data JSON. */
export function deployTranslationSet(context: vscode.ExtensionContext): void {
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
    const target = targetLocaleSetting();
    const dir = path.join(root, textBaseSetting(), target);
    const files = walkTextFiles(dir).filter((f) => parseFrontMatter(fs.readFileSync(f, 'utf8')).hasFrontMatter);
    if (files.length === 0) {
        vscode.window.showInformationMessage(`Text2Frame: ${path.relative(root, dir)} に翻訳ファイルがありません。先に「翻訳セットを作成」を実行してください。`);
        return;
    }
    const strategy = strategySetting();
    const out = getOutput();
    out.appendLine(`=== Deploy Translation (${target}): ${files.length} files, strategy=${strategy} ===`);
    let ok = 0;
    let fail = 0;
    let warn = 0;
    for (const file of files) {
        try {
            const { meta } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
            const { opts, label } = resolveTarget(meta, root);
            const res = mod.applyTextFile({ textPath: file, ...opts, strategy, overwrite: strategy === 'import', backup: true });
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
    const msg = `Text2Frame: 翻訳デプロイ完了 (${target}) — ${ok} 成功 / ${fail} 失敗`;
    if (fail > 0) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}
