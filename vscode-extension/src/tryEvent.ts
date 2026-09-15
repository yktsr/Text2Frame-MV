import * as vscode from 'vscode';
import { DatabaseService } from './dbService';
import { LiveService, LiveSession } from './live';
import { parseFrontMatter, workspaceRootFor } from './compiler';
import { deployFile, reviewFiles, unappliedFiles } from './deploy';

/**
 * 「このイベントから試す」。テキストの先頭にリンクを出す。
 *   ▶ イベントの前に立つ: そのマップへ移動して、イベントの隣に立つ(話しかけるのは自分で)
 *   ▶ このページをすぐ実行: 移動して、このページの中身をすぐ動かす(出現条件は見ない)
 *   ▶ すぐ実行(コモンイベント): 今いる所で動かす
 * テストプレイが動いていなければ始め、タイトル画面なら新しいゲームを始める。
 * テキストがゲームに反映されていなければ、反映してゲームを読み直してから試すかを聞く。
 */

const SELECTOR: vscode.DocumentSelector = { language: 'text2frame' };
const CONNECT_WAIT = 40000;
const VISIT_WAIT = 35000;
type Mode = 'stand' | 'run' | 'common';

const RESULTS: Record<string, [boolean, string]> = {
    stood: [true, 'イベントの前に立ちました。話しかけるか、触れて試してください。'],
    ran: [true, '実行しました。'],
    noEvent: [false, 'ゲームのマップに、このイベントがありません。反映してから、ゲームを読み直してください。'],
    noPage: [false, 'ゲームのイベントに、このページがありません。反映してから、ゲームを読み直してください。'],
    failed: [false, 'コモンイベントを動かせませんでした。'],
    timeout: [false, '移動できませんでした。イベントの実行中などで、ゲームが動けなかったかもしれません。']
};

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function until<T>(check: () => T | undefined, ms: number): Promise<T | undefined> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        const hit = check();
        if (hit) return hit;
        await wait(200);
    }
    return undefined;
}

export function registerTryEvent(context: vscode.ExtensionContext, service: DatabaseService, live: LiveService): void {
    const lenses: vscode.CodeLensProvider = {
        provideCodeLenses(document) {
            const { meta, hasFrontMatter } = parseFrontMatter(document.getText());
            if (!hasFrontMatter) return [];
            const range = new vscode.Range(0, 0, 0, 0);
            const lens = (title: string, mode: Mode): vscode.CodeLens =>
                new vscode.CodeLens(range, { title, command: 'text2frame.tryEvent', arguments: [document.uri, mode], tooltip: 'テストプレイで試す' });
            if (meta.kind === 'common') return meta.commonEventId ? [lens('▶ すぐ実行', 'common')] : [];
            if (!meta.mapId || !meta.eventId) return [];
            return [lens('▶ イベントの前に立つ', 'stand'), lens('▶ このページをすぐ実行', 'run')];
        }
    };

    const connected = (): LiveSession | undefined => {
        const session = live.current();
        return session && session.state.received() && session.state.connected(Date.now()) ? session : undefined;
    };

    const tryEvent = async (uri: vscode.Uri, mode: Mode): Promise<void> => {
        const doc = await vscode.workspace.openTextDocument(uri);
        if (doc.isDirty) await doc.save();
        const ctx = service.forDocument(doc);
        const root = workspaceRootFor(doc);
        if (!ctx || !root) {
            vscode.window.showErrorMessage('Text2Frame: ツクールのプロジェクト(data/System.json)が見つかりません。');
            return;
        }
        const meta = parseFrontMatter(doc.getText()).meta;
        let visit: { mapId?: number; eventId?: number; pageId?: number; x?: number; y?: number; run?: boolean; common?: number };
        if (mode === 'common') {
            visit = { common: Number(meta.commonEventId) };
        } else {
            const mapId = Number(meta.mapId);
            const eventId = Number(meta.eventId);
            const ev = service.mapEvents(ctx, mapId)?.[eventId];
            if (!ev) {
                vscode.window.showErrorMessage('Text2Frame: このイベントは、ゲームのマップにありません。');
                return;
            }
            visit = { mapId, eventId, pageId: Number(meta.pageId || '1'), x: ev.x, y: ev.y, run: mode === 'run' };
        }

        let reload = false;
        if (unappliedFiles(context, root, [uri.fsPath]).size) {
            const choice = await vscode.window.showInformationMessage(
                'Text2Frame: このテキストには、ゲームに反映されていない変更があります。反映してから試しますか？', '反映して試す', 'このまま試す');
            if (!choice) return;
            if (choice === '反映して試す') {
                if (await reviewFiles(context, root, [uri.fsPath], '試す前の反映') === 'cancel') return;
                const result = deployFile(context, root, uri.fsPath);
                if (!result || !result.ok) {
                    vscode.window.showErrorMessage('Text2Frame: 反映できませんでした - ' + ((result && result.error) || ''));
                    return;
                }
                reload = true;
            }
        }

        let session = connected();
        if (!session) {
            await vscode.window.showTextDocument(doc, { preserveFocus: false });
            await vscode.commands.executeCommand('text2frame.testPlay');
            session = await until(connected, CONNECT_WAIT);
            if (!session) {
                vscode.window.showErrorMessage('Text2Frame: テストプレイのゲームとつながりませんでした。');
                return;
            }
        } else if (reload) {
            const at = Date.now();
            session.send({ reload: true });
            await wait(1000);
            session = await until(() => {
                const s = connected();
                return s && s.state.lastSeen > at + 500 ? s : undefined;
            }, CONNECT_WAIT);
            if (!session) {
                vscode.window.showErrorMessage('Text2Frame: 読み直したゲームとつながりませんでした。');
                return;
            }
        }

        const sentAt = Date.now();
        const target = session;
        if (!target.send({ visit })) {
            vscode.window.showErrorMessage('Text2Frame: ゲームに届きませんでした。テストプレイのページを読み直してください。');
            return;
        }
        const answer = await until(() => (target.state.lastVisit && target.state.lastVisit.at >= sentAt ? target.state.lastVisit : undefined), VISIT_WAIT);
        const [ok, text] = answer ? (RESULTS[answer.result] || [false, answer.result]) : RESULTS.timeout;
        if (ok) vscode.window.setStatusBarMessage('Text2Frame: ' + text, 5000);
        else vscode.window.showWarningMessage('Text2Frame: ' + text);
    };

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(SELECTOR, lenses),
        vscode.commands.registerCommand('text2frame.tryEvent', tryEvent)
    );
}
