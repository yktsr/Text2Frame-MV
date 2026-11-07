import * as vscode from 'vscode';
import * as path from 'path';
import { LiveService, LiveSession } from './live';
import { SaveSlot } from './liveState';
import { savesOnDisk } from './db/saves';
import { loadMessage, slotLine } from './saveWording';
import { tr } from './db/lang';

/**
 * ツクールのセーブを使ってテストプレイする。
 *
 * ツクール本体のテストプレイで作ったセーブは、ゲームのフォルダの `save/` にある。
 * VS Code のテストプレイは別の置き場所を使うので、そのままでは続きから試せない。
 * 自分で発生条件を整えたセーブで試すのが、いちばんよく使う確かめ方なので、ここで繋ぐ。
 *
 *   ツクールのセーブを取り込む: `save/` のぶんをテストプレイ側へ入れる
 *   セーブから再開する:         在るセーブを選んで、そこから続ける
 *
 * ファイルの見分け方は借りている層(db/saves)が持っている。MCP の道具も同じものを使う。
 */

const CONNECT_WAIT = 40000;
const ANSWER_WAIT = 10000;

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function until<T>(check: () => T | undefined, ms: number): Promise<T | undefined> {
    const end = Date.now() + ms;
    for (;;) {
        const hit = check();
        if (hit) return hit;
        if (Date.now() >= end) return undefined;
        await wait(200);
    }
}

/* 一覧の文字と答えの言い換えは、vscode に依存しない src/saveWording.ts が持っている
 * (テストから突き合わせられるように)。ここはそれを QuickPick の形に移すだけ。 */
const slotLabel = (one: SaveSlot): vscode.QuickPickItem & { slot: number } => slotLine(one);

export function registerSaveFiles(context: vscode.ExtensionContext, live: LiveService): void {
    const connected = (): LiveSession | undefined => {
        const session = live.current();
        return session && session.state.received() && session.state.connected(Date.now()) ? session : undefined;
    };

    /** テストプレイが動いていなければ始めて、繋がるまで待つ。 */
    const reach = async (): Promise<LiveSession | undefined> => {
        const already = connected();
        if (already) return already;
        await vscode.commands.executeCommand('text2frame.testPlay');
        const session = await until(connected, CONNECT_WAIT);
        if (!session) {
            vscode.window.showErrorMessage(tr('Text2Frame: テストプレイのゲームとつながりませんでした。', 'Text2Frame: Could not connect to the test play.'));
        }
        return session;
    };

    /** 届いたことを確かめてから送る。0 なら聞いているゲームが無い。 */
    const sent = (session: LiveSession, command: Parameters<LiveSession['send']>[0]): boolean => {
        if (session.send(command) > 0) return true;
        vscode.window.showWarningMessage(tr('Text2Frame: ゲームに届きませんでした。テストプレイの画面を読み込み直してください。', 'Text2Frame: Could not reach the game. Reload the test play page.'));
        return false;
    };

    /** 在るセーブを聞く。答えは入れ替わるので、前と違うものが来るまで待つ。 */
    const listSaves = async (session: LiveSession): Promise<SaveSlot[] | undefined> => {
        const before = session.state.saves;
        if (!sent(session, { saves: true })) return undefined;
        return until(() => {
            const now = session.state.saves;
            return now && now !== before ? now : undefined;
        }, ANSWER_WAIT);
    };

    /**
     * `save/` のぶんを取り込む。入れた件数を返す。
     * 同じ番号のセーブは置き換わるので、黙って入れずに件数を言って聞く。
     */
    const importFromDisk = async (session: LiveSession, ask: boolean): Promise<number | undefined> => {
        const rows = savesOnDisk(session.gameRoot);
        const big = rows.filter((one) => one.tooBig);
        const ready = rows.filter((one) => !one.tooBig && one.data !== undefined);
        big.forEach((one) => {
            vscode.window.showWarningMessage(tr(`Text2Frame: ${one.name} は大きすぎるので飛ばしました。`, `Text2Frame: ${one.name} is too big, so it was skipped.`));
        });
        if (!ready.length) {
            vscode.window.showInformationMessage(tr(
                `Text2Frame: ${path.join('save')} に取り込めるセーブがありません。ツクールでテストプレイしてセーブすると、ここにできます。`,
                `Text2Frame: There are no saves to bring in from ${path.join('save')}. Test play in RPG Maker and save, and they appear there.`));
            return undefined;
        }
        if (ask) {
            const go = tr('取り込む', 'Bring them in');
            const answer = await vscode.window.showWarningMessage(tr(
                `Text2Frame: ツクールのセーブ ${ready.length} 件を取り込みます。テストプレイ側にある同じ番号のセーブは置き換わります。`,
                `Text2Frame: Bringing in ${ready.length} saves from RPG Maker. Saves with the same number on the test play side are replaced.`),
            { modal: true }, go);
            if (answer !== go) return undefined;
        }
        const before = session.state.lastImport;
        if (!sent(session, { importSaves: ready.map((one) => ({ name: one.name, data: one.data as string })) })) return undefined;
        const answer = await until(() => {
            const now = session.state.lastImport;
            return now && (!before || now.at > before.at) ? now : undefined;
        }, ANSWER_WAIT);
        if (!answer) {
            vscode.window.showWarningMessage(tr('Text2Frame: 取り込みの返事が来ませんでした。', 'Text2Frame: The game did not answer about bringing them in.'));
            return undefined;
        }
        if (answer.failed) {
            vscode.window.showWarningMessage(tr(
                `Text2Frame: ${answer.done} 件を取り込みました(${answer.failed} 件は入れられませんでした)。`,
                `Text2Frame: Brought in ${answer.done} saves (${answer.failed} could not be stored).`));
        }
        return answer.done;
    };

    const importSaves = async (): Promise<void> => {
        const session = await reach();
        if (!session) return;
        const done = await importFromDisk(session, true);
        if (done === undefined) return;
        const resume = tr('セーブから再開する', 'Resume from a save');
        const answer = await vscode.window.showInformationMessage(
            tr(`Text2Frame: ツクールのセーブ ${done} 件を取り込みました。`, `Text2Frame: Brought in ${done} saves from RPG Maker.`), resume);
        if (answer === resume) await vscode.commands.executeCommand('text2frame.loadSave');
    };

    const loadSave = async (): Promise<void> => {
        const session = await reach();
        if (!session) return;
        let saves = await listSaves(session);
        if (!saves) {
            vscode.window.showWarningMessage(tr('Text2Frame: セーブの一覧が返りませんでした。', 'Text2Frame: The game did not answer with its saves.'));
            return;
        }
        if (!saves.length) {
            /* 取り込めるものが在るなら、空だと言って終わらずに取り込みを勧める
             * (ツクールで遊んだぶんは、テストプレイ側からは見えていない)。 */
            const bring = tr('ツクールのセーブを取り込む', 'Bring in the RPG Maker saves');
            const answer = await vscode.window.showInformationMessage(
                tr('Text2Frame: このテストプレイにセーブはありません。', 'Text2Frame: This test play has no saves.'), bring);
            if (answer !== bring) return;
            if ((await importFromDisk(session, false)) === undefined) return;
            saves = await listSaves(session);
            if (!saves || !saves.length) {
                vscode.window.showInformationMessage(tr('Text2Frame: 再開できるセーブがありません。', 'Text2Frame: There is no save to resume from.'));
                return;
            }
        }
        const pick = await vscode.window.showQuickPick(saves.map(slotLabel), {
            placeHolder: tr('どのセーブから再開しますか', 'Which save should it resume from?')
        });
        if (!pick) return;
        const before = session.state.lastLoad;
        if (!sent(session, { load: pick.slot })) return;
        const answer = await until(() => {
            const now = session.state.lastLoad;
            return now && (!before || now.at > before.at) ? now : undefined;
        }, ANSWER_WAIT);
        if (!answer) {
            vscode.window.showWarningMessage(tr('Text2Frame: 再開の返事が来ませんでした。', 'Text2Frame: The game did not answer about resuming.'));
            return;
        }
        const told = loadMessage(answer.result, answer.why);
        if (told.ok) vscode.window.setStatusBarMessage('Text2Frame: ' + told.text, 4000);
        else vscode.window.showWarningMessage('Text2Frame: ' + told.text);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.importSaves', importSaves),
        vscode.commands.registerCommand('text2frame.loadSave', loadSave)
    );
}
