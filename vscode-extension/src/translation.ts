import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { workspaceRootFor, dataDirFor } from './compiler';
import { exportToTextFile, ExportTarget } from './exportText';

/**
 * "Add a language": seed text/<language>/ from the game data JSON so a translator has a
 * starting point (same content as the game). Existing files are kept, so re-running never
 * clobbers in-progress edits. Everything else (deploy / export) is the plain, direction-based
 * flow that works on the current language folder; there is no separate "translation" concept.
 */

let outputChannel: vscode.OutputChannel | undefined;
function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame');
    }
    return outputChannel;
}

function cfg(key: string, def: string): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>(key, def) || def;
}
/** The single "working language" setting (folder text/<language>/). */
function languageSetting(): string {
    const c = vscode.workspace.getConfiguration('text2frame');
    return c.get<string>('locale') || c.get<string>('targetLocale') || 'ja';
}
const textBaseSetting = (): string => cfg('textBaseDir', 'text');

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
 * Command: "Add a language" — seed text/<language>/ from the game data as a starting point.
 * Existing files are skipped (safe to re-run). The export also records the common ancestor
 * so the first later "Apply to game" is already a proper 3-way.
 */
export function seedLocale(context: vscode.ExtensionContext): void {
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
    const language = languageSetting();
    const outDir = path.join(root, textBaseSetting(), language);
    const out = getOutput();
    out.appendLine(`=== 言語を追加: ${language} (${path.relative(root, outDir)}) ===`);

    const items = enumerateDataTargets(dataDir);
    let created = 0;
    let skipped = 0;
    let fail = 0;
    for (const it of items) {
        const textPath = path.join(outDir, it.key + '.txt');
        if (fs.existsSync(textPath)) {
            skipped++; // 既存のファイルは上書きしない
            continue;
        }
        const exportTarget: ExportTarget = {
            kind: it.kind,
            mapId: it.mapId,
            eventId: it.eventId,
            pageId: it.pageId,
            commonEventId: it.commonEventId,
            textPath,
            locale: language
        };
        // exportToTextFile also records the ancestor snapshot for this file.
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
    const msg = `Text2Frame: 言語を追加 (${language}) — ${created} 新規 / ${skipped} 既存維持 / ${fail} 失敗`;
    if (fail > 0) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}
