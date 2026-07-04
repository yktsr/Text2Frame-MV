import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFrontMatter, resolveTarget, workspaceRootFor, loadModule, dataDirFor, baseSnapshotPath, hasBaseSnapshot } from './compiler';
import { exportToTextFile, mergePullToText, ExportTarget } from './exportText';
import { writeBackAndRefreshBase } from './deploy';

/**
 * Batch operations, scoped to the chosen language folder text/<language>/:
 *   - ゲームに反映(すべて): push every text file into the game (safe merge).
 *   - ゲームから取り出す(すべて): pull the game into text, merging (keeps your edits).
 *   - 全部取り直す: pull the game into text, overwriting (discard edits).
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
    const c = vscode.workspace.getConfiguration('text2frame');
    return c.get<string>('locale') || c.get<string>('targetLocale') || 'ja';
}
function textBaseSetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('textBaseDir', 'text');
}
function strategySetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('strategy', 'merge');
}

const LAST_LANG_KEY = 'text2frame.lastLanguage';

/**
 * Ask which language folder to work on. Lists existing text/<lang>/ folders plus an option
 * to type a new language. Defaults to the last-used language, else the `locale` setting (ja).
 */
async function languagePick(context: vscode.ExtensionContext, root: string, purpose: string): Promise<string | undefined> {
    const base = path.join(root, textBaseSetting());
    let existing: string[] = [];
    if (fs.existsSync(base)) {
        existing = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    }
    const def = context.workspaceState.get<string>(LAST_LANG_KEY) || localeSetting();
    const ordered = [def, ...existing.filter((l) => l !== def)];
    const NEW = '＋ 新しい言語を入力…';
    const items: vscode.QuickPickItem[] = ordered.map((l) => ({ label: l, description: l === def ? '既定' : '' }));
    items.push({ label: NEW });
    const pick = await vscode.window.showQuickPick(items, { placeHolder: `言語を選択（${purpose}）` });
    if (!pick) {
        return undefined;
    }
    let lang = pick.label;
    if (lang === NEW) {
        const input = await vscode.window.showInputBox({ prompt: '言語コードを入力（例: en, zh, ko）', validateInput: (v) => (v && v.trim() ? undefined : '言語コードを入力してください') });
        if (!input) {
            return undefined;
        }
        lang = input.trim();
    }
    await context.workspaceState.update(LAST_LANG_KEY, lang);
    return lang;
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
        } else if (entry.isFile() && entry.name.endsWith('.txt') && !entry.name.endsWith('.conversation.txt') && !entry.name.endsWith('.translation.txt')) {
            result.push(full);
        }
    }
    return result;
}

interface DataItem {
    kind: 'event' | 'common';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
    key: string;
}

/** Enumerate every non-empty event/page and common event in the data dir. */
export function enumerateDataTargets(dataDir: string): DataItem[] {
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

/** ゲームに反映(すべて): push every text file in the chosen language folder into the game. */
export async function deployAll(context: vscode.ExtensionContext): Promise<void> {
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
    const language = await languagePick(context, root, 'ゲームに反映');
    if (!language) {
        return;
    }
    const textDir = path.join(root, textBaseSetting(), language);
    const files = walkTextFiles(textDir).filter((f) => parseFrontMatter(fs.readFileSync(f, 'utf8')).hasFrontMatter);
    if (files.length === 0) {
        vscode.window.showInformationMessage(`Text2Frame: ${path.relative(root, textDir)} に反映対象がありません。先に「ゲームから取り出す」で用意してください。`);
        return;
    }

    const out = getOutput();
    out.appendLine(`=== ゲームに反映(すべて) ${language}: ${files.length} files ===`);
    let ok = 0;
    let fail = 0;
    let warn = 0;
    const strategy = strategySetting();
    const mergeLike = strategy !== 'overwrite' && strategy !== 'import';
    for (const file of files) {
        try {
            const fileText = fs.readFileSync(file, 'utf8');
            const { meta } = parseFrontMatter(fileText);
            const { opts, label } = resolveTarget(meta, root);
            const key = path.basename(file, path.extname(file));
            const locale = meta.locale || path.basename(path.dirname(file)) || 'default';
            const applyOpts: { [k: string]: unknown } = { textPath: file, ...opts, strategy, backup: true };
            if (mergeLike && hasBaseSnapshot(root, locale, key)) {
                applyOpts.basePath = baseSnapshotPath(root, locale, key);
            }
            const res = mod.applyTextFile(applyOpts);
            if (res.ok) {
                ok++;
                warn += res.warnings.length;
                writeBackAndRefreshBase(context, root, meta, file, fileText, res, { locale, key }, mergeLike);
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
    const msg = `Text2Frame: ゲームに反映 完了 (${language}) — ${ok} 成功 / ${fail} 失敗`;
    if (fail > 0) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}

/** Shared pull-all core. mode 'merge' keeps edits; mode 'overwrite' discards them. */
async function pullAll(context: vscode.ExtensionContext, mode: 'merge' | 'overwrite'): Promise<void> {
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
    const purpose = mode === 'merge' ? 'ゲームから取り出す' : '全部取り直す';
    const language = await languagePick(context, root, purpose);
    if (!language) {
        return;
    }
    if (mode === 'overwrite') {
        const yes = await vscode.window.showWarningMessage(
            `Text2Frame: ${language} のテキストをゲームの内容で全部上書きします。編集内容は失われます。よろしいですか？`,
            { modal: true }, '全部取り直す'
        );
        if (yes !== '全部取り直す') {
            return;
        }
    }
    const outDir = path.join(root, textBaseSetting(), language);
    const out = getOutput();
    out.appendLine(`=== ${purpose} ${language} -> ${path.relative(root, outDir)} ===`);

    let written = 0;
    let fail = 0;
    let conflicts = 0;
    for (const it of enumerateDataTargets(dataDir)) {
        const target: ExportTarget = {
            kind: it.kind,
            mapId: it.mapId,
            eventId: it.eventId,
            pageId: it.pageId,
            commonEventId: it.commonEventId,
            textPath: path.join(outDir, it.key + '.txt'),
            locale: language
        };
        if (mode === 'overwrite' && fs.existsSync(target.textPath)) {
            target.frontMatterSource = fs.readFileSync(target.textPath, 'utf8');
        }
        const res = mode === 'merge'
            ? mergePullToText(context, root, target)
            : exportToTextFile(context, root, target);
        if (res.ok) {
            written++;
            conflicts += res.conflicts || 0;
            out.appendLine(`OK   ${path.relative(root, target.textPath)}` + (res.conflicts ? `  (${res.conflicts} 競合)` : ''));
        } else {
            fail++;
            out.appendLine(`FAIL ${path.relative(root, target.textPath)}  ${res.error}`);
        }
    }
    out.appendLine(`=== done: ${written} written, ${fail} fail, ${conflicts} conflicts ===`);
    const msg = `Text2Frame: ${purpose} 完了 (${language}) — ${written} 件` + (fail ? ` / ${fail} 失敗` : '') + (conflicts ? ` / ${conflicts} 競合(両方残し)` : '');
    if (fail > 0 || conflicts > 0) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}

/** ゲームから取り出す(すべて): pull the game into text, merging (keeps your edits). */
export function exportAll(context: vscode.ExtensionContext): Promise<void> {
    return pullAll(context, 'merge');
}

/** 全部取り直す: pull the game into text, overwriting (discard edits). Advanced. */
export function repullAllOverwrite(context: vscode.ExtensionContext): Promise<void> {
    return pullAll(context, 'overwrite');
}
