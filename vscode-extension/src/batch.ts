import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { baseSnapshotPath, dataDirFor, hasBaseSnapshot, historyKeep, loadModule, parseFrontMatter, resolveTarget, snapshotKeyForTarget, textBaseDirFor, workspaceRootFor } from './compiler';
import { isSidecarText } from './db/files';
import { withHistory } from './db/history';
import { commitPull, planPull, pullTargetsFor, ExportTarget, PullPlan } from './exportText';
import { writeBackAndRefreshBase, reviewFiles, noteApply } from './deploy';
import { reviewEnabled } from './review';
import { reviewPull, busy, DeploySort } from './reviewApply';
import { eachSlowly, mapSlowly, SlowlyOptions } from './db/slowly';
import { tr } from './db/lang';

/**
 * Batch operations over the text folder (text/ by default, `text2frame.textBaseDir`):
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

/** 取り出す範囲。既定は中身のあるものだけ。 */
export function exportScopeSetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('exportScope', 'nonempty');
}

function strategySetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('strategy', 'merge');
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
        } else if (entry.isFile() && entry.name.endsWith('.txt') && !isSidecarText(entry.name)) {
            result.push(full);
        }
    }
    return result;
}


/** ゲームに反映(すべて): push every text file under the text folder into the game. */
export async function deployAll(context: vscode.ExtensionContext): Promise<void> {
    const root = workspaceRootFor();
    if (!root) {
        vscode.window.showErrorMessage(tr('Text2Frame: ワークスペースフォルダが見つかりません。', 'Text2Frame: No workspace folder was found.'));
        return;
    }
    const { mod } = loadModule<T2FModule>(context, root, 'Text2Frame.js', (m) => !!m && typeof (m as T2FModule).applyTextFile === 'function');
    if (!mod) {
        vscode.window.showErrorMessage(tr('Text2Frame: コンパイラ (Text2Frame.js) が見つかりません。', 'Text2Frame: The compiler (Text2Frame.js) was not found.'));
        return;
    }
    const textDir = textBaseDirFor(root);
    const all = walkTextFiles(textDir);
    const files: string[] = [];
    const listed = await busy(tr('Text2Frame: 反映するテキストを探しています…', 'Text2Frame: Looking for texts to apply…'), (slowly) => eachSlowly(all, (f) => {
        if (parseFrontMatter(fs.readFileSync(f, 'utf8')).hasFrontMatter) files.push(f);
    }, slowly));
    if (!listed) {
        vscode.window.setStatusBarMessage(tr('Text2Frame: 反映をやめました。', 'Text2Frame: Stopped applying.'), 4000);
        return;
    }
    if (files.length === 0) {
        vscode.window.showInformationMessage(tr(`Text2Frame: ${path.relative(root, textDir)} に反映対象がありません。先に「ゲームから取り出す」で用意してください。`, `Text2Frame: Nothing to apply in ${path.relative(root, textDir)}. Use Pull from game first.`));
        return;
    }

    // 写しで試して、ゲームが変わるテキストだけを反映する。変わらないテキストまで反映すると、
    // 何千ものデータと祖先が書き直され、ファイルの変化を見張るほかの拡張がいっせいに動いてしまう。
    const sort: DeploySort = { changed: new Set(), failed: new Set() };
    const decision = await reviewFiles(context, root, files, tr('すべての反映', 'Apply all'), sort);
    if (decision === 'cancel') {
        vscode.window.setStatusBarMessage(tr('Text2Frame: 反映をやめました。', 'Text2Frame: Stopped applying.'), 4000);
        return;
    }
    const targets = files.filter((f) => sort.changed.has(f) || sort.failed.has(f));
    if (!targets.length) {
        vscode.window.showInformationMessage(tr(`Text2Frame: ゲームは変わりませんでした(${files.length} 件のテキストは、もう反映されています)。`, `Text2Frame: The game did not change (all ${files.length} texts are already applied).`));
        return;
    }
    const out = getOutput();
    out.appendLine(tr(`=== ゲームに反映(すべて) ${path.relative(root, textDir) || '.'}: ${targets.length} / ${files.length} files (変わらないものは飛ばす) ===`, `=== Apply to game (all) ${path.relative(root, textDir) || '.'}: ${targets.length} / ${files.length} files (unchanged ones skipped) ===`));
    let ok = 0;
    let fail = 0;
    let warn = 0;
    const strategy = strategySetting();
    const mergeLike = strategy !== 'overwrite' && strategy !== 'import';
    // 少しずつ反映して、そのたびに手を離す。やめても、済んだ分はそのまま(履歴から戻せる)。
    const finished = await busy(tr('Text2Frame: ゲームに反映しています…', 'Text2Frame: Applying to the game…'), (slowly: SlowlyOptions) =>
        withHistory(root, 'applyAll', tr('ゲームに反映(すべて)', 'Apply to game (all)'), { keep: historyKeep() }, async (recorder) => {
            const done = await eachSlowly(targets, (file) => {
                try {
                    const fileText = fs.readFileSync(file, 'utf8');
                    const { meta } = parseFrontMatter(fileText);
                    const { opts, label } = resolveTarget(meta, root);
                    const key = snapshotKeyForTarget(root, file, meta);
                    // baseRoot は祖先(.t2f-base)の置き場所。渡さないと拡張ホストの cwd(/)に落ちる。
                    const applyOpts: { [k: string]: unknown } = { textPath: file, ...opts, strategy, baseRoot: root };
                    if (mergeLike && hasBaseSnapshot(root, key)) {
                        applyOpts.basePath = baseSnapshotPath(root, key);
                    }
                    noteApply(root, file, (opts.mapPath || opts.commonEventPath) as string | undefined, meta);
                    const res = mod.applyTextFile(applyOpts);
                    if (res.ok) {
                        ok++;
                        warn += res.warnings.length;
                        writeBackAndRefreshBase(root, file, fileText, res, key, mergeLike);
                        out.appendLine(`OK   ${label}  <- ${path.relative(root, file)}` + (res.warnings.length ? `  (${res.warnings.length} warn)` : ''));
                    } else {
                        fail++;
                        out.appendLine(`FAIL ${label}  <- ${path.relative(root, file)}  ${res.error}`);
                    }
                } catch (e) {
                    fail++;
                    out.appendLine(`FAIL ${path.relative(root, file)}  ${e instanceof Error ? e.message : String(e)}`);
                }
            }, slowly);
            recorder?.setLabel(tr(`ゲームに反映(すべて) ${ok}件`, `Apply to game (all) ${ok}`));
            return done;
        }));
    out.appendLine(`=== ${finished ? 'done' : 'cancelled'}: ${ok} ok, ${fail} fail, ${warn} warnings ===`);
    const msg = finished
        ? tr(`Text2Frame: ゲームに反映 完了 — ${ok} 成功 / ${fail} 失敗`, `Text2Frame: Applied to the game — ${ok} ok / ${fail} failed`)
        : tr(`Text2Frame: ゲームに反映を途中でやめました — ${ok + fail} / ${targets.length} 件まで済んでいます(${ok} 成功 / ${fail} 失敗)。済んだ分は「履歴」から戻せます。`, `Text2Frame: Stopped applying partway — ${ok + fail} of ${targets.length} done (${ok} ok / ${fail} failed). You can undo the done ones from History.`);
    if (fail > 0 || !finished) {
        vscode.window.showWarningMessage(msg, tr('詳細', 'Details')).then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}

/** Shared pull-all core. mode 'merge' keeps edits; mode 'overwrite' discards them. */
async function pullAll(context: vscode.ExtensionContext, mode: 'merge' | 'overwrite'): Promise<void> {
    const root = workspaceRootFor();
    if (!root) {
        vscode.window.showErrorMessage(tr('Text2Frame: ワークスペースフォルダが見つかりません。', 'Text2Frame: No workspace folder was found.'));
        return;
    }
    const dataDir = dataDirFor(root);
    if (!fs.existsSync(dataDir)) {
        vscode.window.showErrorMessage(tr('Text2Frame: データフォルダが見つかりません: ', 'Text2Frame: The data folder was not found: ') + dataDir);
        return;
    }
    const repull = tr('全部取り直す', 'Re-pull (overwrite)');
    const purpose = mode === 'merge' ? tr('ゲームから取り出す', 'Pull from game') : repull;
    const outDir = textBaseDirFor(root);
    if (mode === 'overwrite' && !reviewEnabled()) {
        const yes = await vscode.window.showWarningMessage(
            tr(`Text2Frame: ${path.relative(root, outDir) || '.'} のテキストをゲームの内容で全部上書きします。編集内容は失われます。よろしいですか？`, `Text2Frame: Overwrite every text in ${path.relative(root, outDir) || '.'} with the game's contents? Your edits will be lost.`),
            { modal: true }, repull
        );
        if (yes !== repull) {
            return;
        }
    }
    /* 取り出す対象と書き先は、同梱の Frame2Text に合わせる(CLI・プラグインと同じ規則)。
     * 範囲は設定 text2frame.exportScope。見出し情報付きテキストは、範囲に関係なく必ず対象に入る。 */
    const { targets: dataTargets, pathOf } = pullTargetsFor(context, root, dataDir, outDir, exportScopeSetting());
    const makePlans = (slowly: SlowlyOptions): Promise<PullPlan[] | undefined> => mapSlowly(dataTargets, (it) => {
        const target: ExportTarget = {
            kind: it.kind,
            mapId: it.mapId,
            eventId: it.eventId,
            pageId: it.pageId,
            commonEventId: it.commonEventId,
            textPath: pathOf(it)
        };
        if (mode === 'overwrite' && fs.existsSync(target.textPath)) {
            target.frontMatterSource = fs.readFileSync(target.textPath, 'utf8');
        }
        return planPull(context, root, target, mode);
    }, slowly);
    const reviewed = await reviewPull(root, makePlans, mode === 'merge' ? tr('すべての取り出し', 'Pull all') : tr('全部取り直し', 'Re-pull all'));
    if (!reviewed) {
        vscode.window.setStatusBarMessage(tr('Text2Frame: 取り出しをやめました。', 'Text2Frame: Stopped pulling.'), 4000);
        return;
    }
    const out = getOutput();
    out.appendLine(`=== ${purpose} -> ${path.relative(root, outDir) || '.'} ===`);

    let written = 0;
    let fail = 0;
    let conflicts = 0;
    // 目印が未解決で統合を見送ったもの / 目印ごと書き出したもの(どちらも祖先は進まない)。
    let skipped = 0;
    let markers = 0;
    const finished = await busy(mode === 'merge' ? tr('Text2Frame: ゲームから取り出しています…', 'Text2Frame: Pulling from the game…') : tr('Text2Frame: 全部取り直しています…', 'Text2Frame: Re-pulling everything…'), (slowly: SlowlyOptions) =>
        withHistory(root, mode === 'merge' ? 'pullAll' : 'repullAll', purpose + (mode === 'merge' ? tr('(すべて)', ' (all)') : ''), { keep: historyKeep() }, async (recorder) => {
            const done = await eachSlowly(reviewed.plans, (plan) => {
                const target = plan.target;
                const res = commitPull(context, root, plan);
                if (res.ok && res.skipped) {
                    // 目印をまたぐ統合はできない。書いていないので written には数えない。
                    skipped++;
                    out.appendLine(tr(`SKIP ${path.relative(root, target.textPath)}  未解決の衝突の目印が${res.skipped === 'game' ? 'ゲーム側' : 'テキスト'}に残っています`, `SKIP ${path.relative(root, target.textPath)}  unresolved conflict markers remain in the ${res.skipped === 'game' ? 'game' : 'text'}`));
                } else if (res.ok) {
                    written++;
                    conflicts += res.conflicts || 0;
                    if (res.markers) {
                        markers++;
                    }
                    out.appendLine(`OK   ${path.relative(root, target.textPath)}`
                        + (res.conflicts ? tr(`  (${res.conflicts} 衝突)`, `  (${res.conflicts} conflicts)`) : '')
                        + (res.markers ? tr('  (目印ごと取り出し。祖先は据え置き)', '  (pulled with the markers; ancestor kept)') : ''));
                } else {
                    fail++;
                    out.appendLine(`FAIL ${path.relative(root, target.textPath)}  ${res.error}`);
                }
            }, slowly);
            recorder?.setLabel(purpose + (mode === 'merge' ? tr('(すべて)', ' (all)') : '') + tr(` ${written}件`, ` ${written}`));
            return done;
        }));
    out.appendLine(`=== ${finished ? 'done' : 'cancelled'}: ${written} written, ${fail} fail, ${conflicts} conflicts, ${skipped} skipped, ${markers} with markers ===`);
    if (skipped > 0) {
        out.appendLine(tr('SKIP したファイルは、衝突の目印を消すか「全部取り直す」で目印ごと取り出してテキスト側で解決してください。', 'For the skipped files, remove the conflict markers, or Re-pull (overwrite) to bring them into the text and resolve them there.'));
    }
    const msg = (finished ? tr(`Text2Frame: ${purpose} 完了 — ${written} 件`, `Text2Frame: ${purpose} done — ${written}`) : tr(`Text2Frame: ${purpose}を途中でやめました — ${written} 件まで書きました。済んだ分は「履歴」から戻せます`, `Text2Frame: ${purpose} stopped partway — wrote ${written}. You can undo the done ones from History`))
        + (fail ? tr(` / ${fail} 失敗`, ` / ${fail} failed`) : '')
        + (conflicts ? tr(` / ${conflicts} 衝突(両方残し)`, ` / ${conflicts} conflicts (both kept)`) : '')
        + (skipped ? tr(` / ${skipped} 件は目印が未解決で除外`, ` / ${skipped} skipped for unresolved markers`) : '');
    if (fail > 0 || conflicts > 0 || skipped > 0 || !finished) {
        vscode.window.showWarningMessage(msg, tr('詳細', 'Details')).then((p) => { if (p) { out.show(true); } });
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
