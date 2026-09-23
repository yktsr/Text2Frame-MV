import * as vscode from 'vscode';
import { registerDeployFeature, showCompiledJson } from './deploy';
import { registerReview } from './review';
import { registerNavigation } from './navigation';
import { registerEventLinks } from './eventLinks';
import { registerMapLinksView } from './mapLinksView';
import { registerMapGraph } from './mapGraph';
import { registerHistoryView } from './historyView';
import { registerQuickFixes, FIX } from './quickFixes';
import { registerSnippets } from './snippets';
import { basicProblems } from './db/checks';
import { registerMessageCheck } from './messageCheck';
import { registerProjectCheck } from './projectCheck';
import { registerAssetPicker } from './assetPicker';
import { registerTryEvent } from './tryEvent';
import { registerDebugger } from './debugSession';
import { exportCurrentFile, exportConversationOnly } from './exportText';
import { deployAll, exportAll, repullAllOverwrite } from './batch';
import { registerTreeView } from './tree';
import { registerCommandsView } from './commandsView';
import { parseFrontMatter } from './compiler';
import { DatabaseService } from './dbService';
import { registerDatabaseFeatures } from './dbFeatures';
import { registerDatabaseView } from './dbView';
import { registerPreview } from './preview';
import { registerColorSwatches } from './colorSwatches';
import { registerTestPlay } from './testPlay';
import { LiveService } from './live';
import { registerLiveView } from './liveView';
import { registerRunHighlight } from './runHighlight';
import { tagHelpText } from './tagHelp';
import { setJapanese, tr } from './db/lang';

/**
 * Treat a .txt file that carries Text2Frame front matter as the `text2frame`
 * language, so highlighting / completion / hover / diagnostics apply without
 * renaming files to .t2f. Only front-matter .txt files are affected.
 */
function maybeAssignLanguage(document: vscode.TextDocument): void {
    if (document.languageId === 'text2frame' || document.uri.scheme !== 'file') {
        return;
    }
    if (!document.fileName.toLowerCase().endsWith('.txt')) {
        return;
    }
    if (!parseFrontMatter(document.getText()).hasFrontMatter) {
        return;
    }
    vscode.languages.setTextDocumentLanguage(document, 'text2frame');
}

export function activate(context: vscode.ExtensionContext) {
    // 画面の言葉は VS Code の表示言語に合わせる(package.json の文字と同じ決め方)。
    setJapanese(vscode.env.language.toLowerCase().startsWith('ja'));

    // Watch & Deploy: compile the current text file back into the RPG Maker data JSON.
    registerDeployFeature(context);
    // 反映・取り出しの前の差分の確認。
    registerReview(context);
    // Activity Bar "Commands" panel (grouped, clickable actions).
    registerCommandsView(context);
    // データベースの名前を見せる(名前の薄い表示・ホバー・警告・名前から入力)。
    const database = new DatabaseService();
    const live = new LiveService();
    context.subscriptions.push(database, live);
    registerDatabaseFeatures(context, database, live);
    // サイドバーのデータベース一覧。
    registerDatabaseView(context, database, live);
    // 横のプレビュー(ツクールのイベント編集画面と同じ見た目)。
    const running = registerRunHighlight(context, database, live);
    registerPreview(context, database, running, live);
    // Activity Bar tree (Maps / Events / Pages / Common Events).
    registerTreeView(context, database, running, live);
    // 定義へ移動・参照の一覧・シンボル・アウトライン・折りたたみ。
    registerNavigation(context, database, running);
    // イベントのつながり(呼び出し階層)と、マップのつながりの欄。
    const eventLinks = registerEventLinks(context, database, running);
    registerMapLinksView(context, database, eventLinks, live);
    registerMapGraph(context, database, eventLinks);
    // 反映・取り出しの履歴(前の状態に戻す)。
    registerHistoryView(context);
    // クイックフィックス(電球)とスニペット。
    registerQuickFixes(context);
    registerSnippets(context);
    // メッセージのはみ出しと、プロジェクト全体の検査。
    registerMessageCheck(context, database);
    registerProjectCheck(context, database);
    // 顔画像・音声を見て選ぶ画面。
    registerAssetPicker(context, database);
    // このイベントから試す(テキストの先頭のリンク)。
    registerTryEvent(context, database, live);
    // ブレークポイント(VS Code の「実行とデバッグ」)。
    registerDebugger(context, database, live, running);
    // 色調・フラッシュの値の前に色見本。
    registerColorSwatches(context);
    // テストプレイ(ゲームを VS Code の中のブラウザで)。
    registerTestPlay(context, database, live);
    registerLiveView(context, database, live, running);

    // Auto-assign the text2frame language to front-matter .txt files (open now + later).
    vscode.workspace.textDocuments.forEach(maybeAssignLanguage);
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(maybeAssignLanguage),
        vscode.workspace.onDidSaveTextDocument(maybeAssignLanguage)
    );

    // Export / batch / preview commands.
    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.exportCurrentFile', () => exportCurrentFile(context)),
        vscode.commands.registerCommand('text2frame.exportConversationOnly', () => exportConversationOnly(context)),
        vscode.commands.registerCommand('text2frame.showCompiledJson', () => showCompiledJson(context)),
        vscode.commands.registerCommand('text2frame.deployAll', () => deployAll(context)),
        vscode.commands.registerCommand('text2frame.exportAll', () => exportAll(context)),
        vscode.commands.registerCommand('text2frame.repullOverwrite', () => repullAllOverwrite(context))
    );

    // Register completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'text2frame',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const completions: vscode.CompletionItem[] = [];

                // Message Display Settings
                const faceTag = new vscode.CompletionItem('Face: Actor1(0)', vscode.CompletionItemKind.Keyword);
                faceTag.detail = tr('顔グラフィック設定', 'Face graphic');
                faceTag.documentation = new vscode.MarkdownString(tr('顔グラフィックを設定します\n\n例: `<Face: Actor1(0)>`', 'Sets the face graphic\n\nExample: `<Face: Actor1(0)>`'));
                faceTag.insertText = new vscode.SnippetString('Face: ${1:Actor1(0)}');
                completions.push(faceTag);

                const wpTag = new vscode.CompletionItem('WindowPosition: Bottom', vscode.CompletionItemKind.Keyword);
                wpTag.detail = tr('ウィンドウ位置設定', 'Window position');
                wpTag.documentation = new vscode.MarkdownString(tr('ウィンドウ位置を設定します\n\n例: `<WindowPosition: Top|Middle|Bottom>`', 'Sets the window position\n\nExample: `<WindowPosition: Top|Middle|Bottom>`'));
                wpTag.insertText = new vscode.SnippetString('WindowPosition: ${1|Top,Middle,Bottom|}');
                completions.push(wpTag);

                const bgTag = new vscode.CompletionItem('Background: Window', vscode.CompletionItemKind.Keyword);
                bgTag.detail = tr('背景設定', 'Background');
                bgTag.documentation = new vscode.MarkdownString(tr('背景を設定します\n\n例: `<Background: Window|Dim|Transparent>`', 'Sets the window background\n\nExample: `<Background: Window|Dim|Transparent>`'));
                bgTag.insertText = new vscode.SnippetString('Background: ${1|Window,Dim,Transparent|}');
                completions.push(bgTag);

                const nameTag = new vscode.CompletionItem('Name:', vscode.CompletionItemKind.Keyword);
                nameTag.detail = tr('名前設定 (MZ用)', 'Speaker name (MZ)');
                nameTag.documentation = new vscode.MarkdownString(tr('名前を設定します\n\n例: `<Name: キャラクター名>`', 'Sets the speaker name\n\nExample: `<Name: Character name>`'));
                nameTag.insertText = new vscode.SnippetString('Name: $1');
                completions.push(nameTag);

                // Choice and Branching
                const choiceTag = new vscode.CompletionItem('ShowChoices', vscode.CompletionItemKind.Snippet);
                choiceTag.detail = tr('選択肢の表示', 'Show Choices');
                choiceTag.documentation = new vscode.MarkdownString(tr('選択肢を表示します\n\n例:\n```\n<ShowChoices>\n<When: はい>\n...\n<When: いいえ>\n...\n<End>\n```', 'Shows choices\n\nExample:\n```\n<ShowChoices>\n<When: Yes>\n...\n<When: No>\n...\n<End>\n```'));
                choiceTag.insertText = new vscode.SnippetString(tr('ShowChoices>\n<When: ${1:はい}>\n$2\n<When: ${3:いいえ}>\n$4\n<End', 'ShowChoices>\n<When: ${1:Yes}>\n$2\n<When: ${3:No}>\n$4\n<End'));
                completions.push(choiceTag);

                const whenTag = new vscode.CompletionItem('When:', vscode.CompletionItemKind.Keyword);
                whenTag.detail = tr('選択肢の分岐', 'Choice branch');
                whenTag.documentation = new vscode.MarkdownString(tr('選択肢の分岐を定義します\n\n例: `<When: はい>`', 'Starts the branch for one choice\n\nExample: `<When: Yes>`'));
                whenTag.insertText = new vscode.SnippetString('When: $1');
                completions.push(whenTag);

                const ifTag = new vscode.CompletionItem('If:', vscode.CompletionItemKind.Snippet);
                ifTag.detail = tr('条件分岐', 'If');
                ifTag.documentation = new vscode.MarkdownString(tr('条件分岐を設定します\n\n例:\n```\n<If: Switch[1], ON>\n...\n<Else>\n...\n<End>\n```', 'Starts a conditional branch\n\nExample:\n```\n<If: Switch[1], ON>\n...\n<Else>\n...\n<End>\n```'));
                ifTag.insertText = new vscode.SnippetString('If: ${1:Switch[1], ON}>\n$2\n<Else>\n$3\n<End');
                completions.push(ifTag);

                const elseTag = new vscode.CompletionItem('Else', vscode.CompletionItemKind.Keyword);
                elseTag.detail = tr('ELSE分岐', 'Else');
                elseTag.documentation = new vscode.MarkdownString(tr('条件分岐のELSE部分', 'The Else part of a conditional branch'));
                elseTag.insertText = 'Else';
                completions.push(elseTag);

                const endTag = new vscode.CompletionItem('End', vscode.CompletionItemKind.Keyword);
                endTag.detail = tr('分岐の終了', 'End');
                endTag.documentation = new vscode.MarkdownString(tr('分岐を終了します', 'Ends the branch'));
                endTag.insertText = 'End';
                completions.push(endTag);

                // Loop
                const loopTag = new vscode.CompletionItem('Loop', vscode.CompletionItemKind.Snippet);
                loopTag.detail = tr('ループ', 'Loop');
                loopTag.documentation = new vscode.MarkdownString(tr('ループ処理を開始します\n\n例:\n```\n<Loop>\n...\n<RepeatAbove>\n```', 'Starts a loop\n\nExample:\n```\n<Loop>\n...\n<RepeatAbove>\n```'));
                loopTag.insertText = new vscode.SnippetString('Loop>\n$0\n<RepeatAbove');
                completions.push(loopTag);

                const repeatTag = new vscode.CompletionItem('RepeatAbove', vscode.CompletionItemKind.Keyword);
                repeatTag.detail = tr('以上繰り返し', 'Repeat Above');
                repeatTag.documentation = new vscode.MarkdownString(tr('ループを終了します', 'Ends the loop'));
                repeatTag.insertText = 'RepeatAbove';
                completions.push(repeatTag);

                const breakLoopTag = new vscode.CompletionItem('BreakLoop', vscode.CompletionItemKind.Keyword);
                breakLoopTag.detail = tr('ループの中断', 'Break Loop');
                breakLoopTag.documentation = new vscode.MarkdownString(tr('ループを中断します', 'Breaks out of the loop'));
                breakLoopTag.insertText = 'BreakLoop';
                completions.push(breakLoopTag);

                // Switch and Variable Operations
                const switchTag = new vscode.CompletionItem('Switch: 1, ON', vscode.CompletionItemKind.Keyword);
                switchTag.detail = tr('スイッチの操作', 'Control Switches');
                switchTag.documentation = new vscode.MarkdownString(tr('スイッチを操作します\n\n例: `<Switch: 1, ON>` または `<Switch: 1-10, OFF>`', 'Turns switches on or off\n\nExample: `<Switch: 1, ON>` or `<Switch: 1-10, OFF>`'));
                switchTag.insertText = new vscode.SnippetString('Switch: ${1:1}, ${2|ON,OFF|}');
                completions.push(switchTag);

                const selfSwitchTag = new vscode.CompletionItem('SelfSwitch: A, ON', vscode.CompletionItemKind.Keyword);
                selfSwitchTag.detail = tr('セルフスイッチの操作', 'Control Self Switch');
                selfSwitchTag.documentation = new vscode.MarkdownString(tr('セルフスイッチを操作します\n\n例: `<SelfSwitch: A, ON>`', 'Turns a self switch on or off\n\nExample: `<SelfSwitch: A, ON>`'));
                selfSwitchTag.insertText = new vscode.SnippetString('SelfSwitch: ${1|A,B,C,D|}, ${2|ON,OFF|}');
                completions.push(selfSwitchTag);

                const setTag = new vscode.CompletionItem('Set: 1, 0', vscode.CompletionItemKind.Keyword);
                setTag.detail = tr('変数の操作（代入）', 'Control Variables (set)');
                setTag.documentation = new vscode.MarkdownString(tr('変数に値を代入します\n\n例: `<Set: 1, 2>` または `<Set: 1, V[20]>`', 'Sets a variable\n\nExample: `<Set: 1, 2>` or `<Set: 1, V[20]>`'));
                setTag.insertText = new vscode.SnippetString('Set: ${1:1}, ${2:0}');
                completions.push(setTag);

                const addTag = new vscode.CompletionItem('Add: 1, 1', vscode.CompletionItemKind.Keyword);
                addTag.detail = tr('変数の操作（加算）', 'Control Variables (add)');
                addTag.documentation = new vscode.MarkdownString(tr('変数に値を加算します\n\n例: `<Add: 1, 10>`', 'Adds to a variable\n\nExample: `<Add: 1, 10>`'));
                addTag.insertText = new vscode.SnippetString('Add: ${1:1}, ${2:1}');
                completions.push(addTag);

                const subTag = new vscode.CompletionItem('Sub: 1, 1', vscode.CompletionItemKind.Keyword);
                subTag.detail = tr('変数の操作（減算）', 'Control Variables (sub)');
                subTag.documentation = new vscode.MarkdownString(tr('変数から値を減算します\n\n例: `<Sub: 1, 10>`', 'Subtracts from a variable\n\nExample: `<Sub: 1, 10>`'));
                subTag.insertText = new vscode.SnippetString('Sub: ${1:1}, ${2:1}');
                completions.push(subTag);

                const mulTag = new vscode.CompletionItem('Mul: 1, 2', vscode.CompletionItemKind.Keyword);
                mulTag.detail = tr('変数の操作（乗算）', 'Control Variables (mul)');
                mulTag.documentation = new vscode.MarkdownString(tr('変数に値を乗算します\n\n例: `<Mul: 1, 2>`', 'Multiplies a variable\n\nExample: `<Mul: 1, 2>`'));
                mulTag.insertText = new vscode.SnippetString('Mul: ${1:1}, ${2:2}');
                completions.push(mulTag);

                const divTag = new vscode.CompletionItem('Div: 1, 2', vscode.CompletionItemKind.Keyword);
                divTag.detail = tr('変数の操作（除算）', 'Control Variables (div)');
                divTag.documentation = new vscode.MarkdownString(tr('変数を値で除算します\n\n例: `<Div: 1, 2>`', 'Divides a variable\n\nExample: `<Div: 1, 2>`'));
                divTag.insertText = new vscode.SnippetString('Div: ${1:1}, ${2:2}');
                completions.push(divTag);

                const modTag = new vscode.CompletionItem('Mod: 1, 2', vscode.CompletionItemKind.Keyword);
                modTag.detail = tr('変数の操作（剰余）', 'Control Variables (mod)');
                modTag.documentation = new vscode.MarkdownString(tr('変数の剰余を求めます\n\n例: `<Mod: 1, 2>`', 'Sets a variable to its remainder\n\nExample: `<Mod: 1, 2>`'));
                modTag.insertText = new vscode.SnippetString('Mod: ${1:1}, ${2:2}');
                completions.push(modTag);

                // Timer
                const timerTag = new vscode.CompletionItem('Timer: start, 1, 0', vscode.CompletionItemKind.Keyword);
                timerTag.detail = tr('タイマーの操作', 'Control Timer');
                timerTag.documentation = new vscode.MarkdownString(tr('タイマーを操作します\n\n例: `<Timer: start, 1, 30>` (1分30秒) または `<Timer: Stop>`', 'Starts or stops the timer\n\nExample: `<Timer: start, 1, 30>` (1 min 30 sec) or `<Timer: Stop>`'));
                timerTag.insertText = new vscode.SnippetString('Timer: ${1|start,Stop|}, ${2:1}, ${3:0}');
                completions.push(timerTag);

                // Label and Jump
                const labelTag = new vscode.CompletionItem('Label:', vscode.CompletionItemKind.Keyword);
                labelTag.detail = tr('ラベル', 'Label');
                labelTag.documentation = new vscode.MarkdownString(tr('ラベルを設定します\n\n例: `<Label: Start>`', 'Places a label\n\nExample: `<Label: Start>`'));
                labelTag.insertText = new vscode.SnippetString('Label: $1');
                completions.push(labelTag);

                const jumpTag = new vscode.CompletionItem('JumpToLabel:', vscode.CompletionItemKind.Keyword);
                jumpTag.detail = tr('ラベルジャンプ', 'Jump to Label');
                jumpTag.documentation = new vscode.MarkdownString(tr('指定したラベルにジャンプします\n\n例: `<JumpToLabel: Start>`', 'Jumps to the label\n\nExample: `<JumpToLabel: Start>`'));
                jumpTag.insertText = new vscode.SnippetString('JumpToLabel: $1');
                completions.push(jumpTag);

                const exitTag = new vscode.CompletionItem('ExitEventProcessing', vscode.CompletionItemKind.Keyword);
                exitTag.detail = tr('イベント処理の中断', 'Exit Event Processing');
                exitTag.documentation = new vscode.MarkdownString(tr('イベント処理を中断します', 'Stops the event'));
                exitTag.insertText = 'ExitEventProcessing';
                completions.push(exitTag);

                // Common Event
                const commonEventTag = new vscode.CompletionItem('CommonEvent:', vscode.CompletionItemKind.Keyword);
                commonEventTag.detail = tr('コモンイベント', 'Common Event');
                commonEventTag.documentation = new vscode.MarkdownString(tr('コモンイベントを実行します\n\n例: `<CommonEvent: 1>`', 'Runs a common event\n\nExample: `<CommonEvent: 1>`'));
                commonEventTag.insertText = new vscode.SnippetString('CommonEvent: ${1:1}');
                completions.push(commonEventTag);

                // Audio
                const bgmTag = new vscode.CompletionItem('PlayBGM:', vscode.CompletionItemKind.Keyword);
                bgmTag.detail = tr('BGMの演奏', 'Play BGM');
                bgmTag.documentation = new vscode.MarkdownString(tr('BGMを演奏します\n\n例: `<PlayBGM: Battle1>` または `<PlayBGM: Battle1, 90, 100, 0>`', 'Plays BGM\n\nExample: `<PlayBGM: Battle1>` or `<PlayBGM: Battle1, 90, 100, 0>`'));
                bgmTag.insertText = new vscode.SnippetString('PlayBGM: $1');
                completions.push(bgmTag);

                const fadeoutBGMTag = new vscode.CompletionItem('FadeoutBGM:', vscode.CompletionItemKind.Keyword);
                fadeoutBGMTag.detail = tr('BGMのフェードアウト', 'Fadeout BGM');
                fadeoutBGMTag.documentation = new vscode.MarkdownString(tr('BGMをフェードアウトします\n\n例: `<FadeoutBGM: 10>` (秒数)', 'Fades out the BGM\n\nExample: `<FadeoutBGM: 10>` (seconds)'));
                fadeoutBGMTag.insertText = new vscode.SnippetString('FadeoutBGM: ${1:10}');
                completions.push(fadeoutBGMTag);

                const saveBGMTag = new vscode.CompletionItem('saveBGM', vscode.CompletionItemKind.Keyword);
                saveBGMTag.detail = tr('BGMの保存', 'Save BGM');
                saveBGMTag.documentation = new vscode.MarkdownString(tr('現在のBGMを保存します', 'Saves the current BGM'));
                saveBGMTag.insertText = 'saveBGM';
                completions.push(saveBGMTag);

                const replayBGMTag = new vscode.CompletionItem('replaybgm', vscode.CompletionItemKind.Keyword);
                replayBGMTag.detail = tr('BGMの再開', 'Resume BGM');
                replayBGMTag.documentation = new vscode.MarkdownString(tr('保存したBGMを再開します', 'Resumes the saved BGM'));
                replayBGMTag.insertText = 'replaybgm';
                completions.push(replayBGMTag);

                const bgsTag = new vscode.CompletionItem('PlayBGS:', vscode.CompletionItemKind.Keyword);
                bgsTag.detail = tr('BGSの演奏', 'Play BGS');
                bgsTag.documentation = new vscode.MarkdownString(tr('BGSを演奏します\n\n例: `<PlayBGS: City>`', 'Plays BGS\n\nExample: `<PlayBGS: City>`'));
                bgsTag.insertText = new vscode.SnippetString('PlayBGS: $1');
                completions.push(bgsTag);

                const fadeoutBGSTag = new vscode.CompletionItem('FadeoutBGS: 10', vscode.CompletionItemKind.Keyword);
                fadeoutBGSTag.detail = tr('BGSのフェードアウト', 'Fadeout BGS');
                fadeoutBGSTag.documentation = new vscode.MarkdownString(tr('BGSをフェードアウトします\n\n例: `<FadeoutBGS: 10>`', 'Fades out the BGS\n\nExample: `<FadeoutBGS: 10>`'));
                fadeoutBGSTag.insertText = new vscode.SnippetString('FadeoutBGS: ${1:10}');
                completions.push(fadeoutBGSTag);

                const meTag = new vscode.CompletionItem('PlayME:', vscode.CompletionItemKind.Keyword);
                meTag.detail = tr('MEの演奏', 'Play ME');
                meTag.documentation = new vscode.MarkdownString(tr('MEを演奏します\n\n例: `<PlayME: Victory1>`', 'Plays an ME\n\nExample: `<PlayME: Victory1>`'));
                meTag.insertText = new vscode.SnippetString('PlayME: $1');
                completions.push(meTag);

                const seTag = new vscode.CompletionItem('PlaySE:', vscode.CompletionItemKind.Keyword);
                seTag.detail = tr('SEの演奏', 'Play SE');
                seTag.documentation = new vscode.MarkdownString(tr('SEを演奏します\n\n例: `<PlaySE: Attack1>`', 'Plays an SE\n\nExample: `<PlaySE: Attack1>`'));
                seTag.insertText = new vscode.SnippetString('PlaySE: $1');
                completions.push(seTag);

                const stopSETag = new vscode.CompletionItem('StopSE', vscode.CompletionItemKind.Keyword);
                stopSETag.detail = tr('SEの停止', 'Stop SE');
                stopSETag.documentation = new vscode.MarkdownString(tr('SEを停止します', 'Stops the SE'));
                stopSETag.insertText = 'StopSE';
                completions.push(stopSETag);

                // Picture
                const showPictureTag = new vscode.CompletionItem('ShowPicture: 1,', vscode.CompletionItemKind.Keyword);
                showPictureTag.detail = tr('ピクチャの表示', 'Show Picture');
                showPictureTag.documentation = new vscode.MarkdownString(tr('ピクチャを表示します\n\n例: `<ShowPicture: 1, Castle>`', 'Shows a picture\n\nExample: `<ShowPicture: 1, Castle>`'));
                showPictureTag.insertText = new vscode.SnippetString('ShowPicture: ${1:1}, $2');
                completions.push(showPictureTag);

                const movePictureTag = new vscode.CompletionItem('MovePicture: 1', vscode.CompletionItemKind.Keyword);
                movePictureTag.detail = tr('ピクチャの移動', 'Move Picture');
                movePictureTag.documentation = new vscode.MarkdownString(tr('ピクチャを移動します\n\n例: `<MovePicture: 1, Position[Center][200][300]>`', 'Moves a picture\n\nExample: `<MovePicture: 1, Position[Center][200][300]>`'));
                movePictureTag.insertText = new vscode.SnippetString('MovePicture: ${1:1}');
                completions.push(movePictureTag);

                const rotatePictureTag = new vscode.CompletionItem('RotatePicture: 1, -30', vscode.CompletionItemKind.Keyword);
                rotatePictureTag.detail = tr('ピクチャの回転', 'Rotate Picture');
                rotatePictureTag.documentation = new vscode.MarkdownString(tr('ピクチャを回転します\n\n例: `<RotatePicture: 1, -30>`', 'Rotates a picture\n\nExample: `<RotatePicture: 1, -30>`'));
                rotatePictureTag.insertText = new vscode.SnippetString('RotatePicture: ${1:1}, ${2:-30}');
                completions.push(rotatePictureTag);

                const tintPictureTag = new vscode.CompletionItem('TintPicture: 1', vscode.CompletionItemKind.Keyword);
                tintPictureTag.detail = tr('ピクチャの色調変更', 'Tint Picture');
                tintPictureTag.documentation = new vscode.MarkdownString(tr('ピクチャの色調を変更します\n\n例: `<TintPicture: 1, ColorTone[0][100][255][50]>`', 'Tints a picture\n\nExample: `<TintPicture: 1, ColorTone[0][100][255][50]>`'));
                tintPictureTag.insertText = new vscode.SnippetString('TintPicture: ${1:1}');
                completions.push(tintPictureTag);

                const erasePictureTag = new vscode.CompletionItem('ErasePicture: 1', vscode.CompletionItemKind.Keyword);
                erasePictureTag.detail = tr('ピクチャの消去', 'Erase Picture');
                erasePictureTag.documentation = new vscode.MarkdownString(tr('ピクチャを消去します\n\n例: `<ErasePicture: 1>`', 'Erases a picture\n\nExample: `<ErasePicture: 1>`'));
                erasePictureTag.insertText = new vscode.SnippetString('ErasePicture: ${1:1}');
                completions.push(erasePictureTag);

                // Screen Effects
                const fadeOutTag = new vscode.CompletionItem('FadeOut', vscode.CompletionItemKind.Keyword);
                fadeOutTag.detail = tr('画面のフェードアウト', 'Fadeout Screen');
                fadeOutTag.documentation = new vscode.MarkdownString(tr('画面をフェードアウトします', 'Fades the screen out'));
                fadeOutTag.insertText = 'FadeOut';
                completions.push(fadeOutTag);

                const fadeInTag = new vscode.CompletionItem('FadeIn', vscode.CompletionItemKind.Keyword);
                fadeInTag.detail = tr('画面のフェードイン', 'Fadein Screen');
                fadeInTag.documentation = new vscode.MarkdownString(tr('画面をフェードインします', 'Fades the screen in'));
                fadeInTag.insertText = 'FadeIn';
                completions.push(fadeInTag);

                const tintScreenTag = new vscode.CompletionItem('TintScreen', vscode.CompletionItemKind.Keyword);
                tintScreenTag.detail = tr('画面の色調変更', 'Tint Screen');
                tintScreenTag.documentation = new vscode.MarkdownString(tr('画面の色調を変更します\n\n例: `<TintScreen: Duration[60], ColorTone[0][100][255][50]>`', 'Tints the screen\n\nExample: `<TintScreen: Duration[60], ColorTone[0][100][255][50]>`'));
                tintScreenTag.insertText = new vscode.SnippetString('TintScreen: Duration[${1:60}], ColorTone[${2:0}][${3:0}][${4:0}][${5:0}]');
                completions.push(tintScreenTag);

                const flashScreenTag = new vscode.CompletionItem('FlashScreen', vscode.CompletionItemKind.Keyword);
                flashScreenTag.detail = tr('画面のフラッシュ', 'Flash Screen');
                flashScreenTag.documentation = new vscode.MarkdownString(tr('画面をフラッシュします\n\n例: `<FlashScreen: 50, 100, 150, 170, 60>`', 'Flashes the screen\n\nExample: `<FlashScreen: 50, 100, 150, 170, 60>`'));
                flashScreenTag.insertText = new vscode.SnippetString('FlashScreen: ${1:255}, ${2:255}, ${3:255}, ${4:170}, ${5:60}');
                completions.push(flashScreenTag);

                const shakeScreenTag = new vscode.CompletionItem('ShakeScreen', vscode.CompletionItemKind.Keyword);
                shakeScreenTag.detail = tr('画面のシェイク', 'Shake Screen');
                shakeScreenTag.documentation = new vscode.MarkdownString(tr('画面をシェイクします\n\n例: `<ShakeScreen: 5, 8, 60>`', 'Shakes the screen\n\nExample: `<ShakeScreen: 5, 8, 60>`'));
                shakeScreenTag.insertText = new vscode.SnippetString('ShakeScreen: ${1:5}, ${2:8}, ${3:60}');
                completions.push(shakeScreenTag);

                // Wait
                const waitTag = new vscode.CompletionItem('Wait: 60', vscode.CompletionItemKind.Keyword);
                waitTag.detail = tr('ウェイト', 'Wait');
                waitTag.documentation = new vscode.MarkdownString(tr('ウェイトを設定します\n\n例: `<Wait: 60>` (フレーム数)', 'Waits\n\nExample: `<Wait: 60>` (frames)'));
                waitTag.insertText = new vscode.SnippetString('Wait: ${1:60}');
                completions.push(waitTag);

                // Items and Gold
                const changeGoldTag = new vscode.CompletionItem('ChangeGold', vscode.CompletionItemKind.Keyword);
                changeGoldTag.detail = tr('所持金の増減', 'Change Gold');
                changeGoldTag.documentation = new vscode.MarkdownString(tr('所持金を増減します\n\n例: `<ChangeGold: Increase, 100>`', 'Changes the gold\n\nExample: `<ChangeGold: Increase, 100>`'));
                changeGoldTag.insertText = new vscode.SnippetString('ChangeGold: ${1|Increase,Decrease|}, ${2:100}');
                completions.push(changeGoldTag);

                const changeItemsTag = new vscode.CompletionItem('ChangeItems', vscode.CompletionItemKind.Keyword);
                changeItemsTag.detail = tr('アイテムの増減', 'Change Items');
                changeItemsTag.documentation = new vscode.MarkdownString(tr('アイテムを増減します\n\n例: `<ChangeItems: 1, Increase, 1>`', 'Changes the number of an item\n\nExample: `<ChangeItems: 1, Increase, 1>`'));
                changeItemsTag.insertText = new vscode.SnippetString('ChangeItems: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeItemsTag);

                const selectItemTag = new vscode.CompletionItem('SelectItem', vscode.CompletionItemKind.Keyword);
                selectItemTag.detail = tr('アイテム選択の処理', 'Select Item');
                selectItemTag.documentation = new vscode.MarkdownString(tr('アイテム選択画面を表示します\n\n例: `<SelectItem: 1, Regular Item>`', 'Shows the item selection window\n\nExample: `<SelectItem: 1, Regular Item>`'));
                selectItemTag.insertText = new vscode.SnippetString('SelectItem: ${1:1}, ${2|Regular Item,Key Item|}');
                completions.push(selectItemTag);

                // Input Number
                const inputNumberTag = new vscode.CompletionItem('InputNumber', vscode.CompletionItemKind.Keyword);
                inputNumberTag.detail = tr('数値入力の処理', 'Input Number');
                inputNumberTag.documentation = new vscode.MarkdownString(tr('数値入力の処理を表示します\n\n例: `<InputNumber: 1, 2>` (変数1に桁数2で入力)', 'Shows the number input window\n\nExample: `<InputNumber: 1, 2>` (into variable 1, 2 digits)'));
                inputNumberTag.insertText = new vscode.SnippetString('InputNumber: ${1:1}, ${2:2}');
                completions.push(inputNumberTag);

                // Show Scrolling Text
                const scrollingTextTag = new vscode.CompletionItem('ShowScrollingText', vscode.CompletionItemKind.Snippet);
                scrollingTextTag.detail = tr('文章のスクロール表示', 'Show Scrolling Text');
                scrollingTextTag.documentation = new vscode.MarkdownString(tr('スクロールテキストを表示します\n\n例:\n```\n<ShowScrollingText: 2, OFF>\n文章...\n</ShowScrollingText>\n```', 'Shows scrolling text\n\nExample:\n```\n<ShowScrollingText: 2, OFF>\nText...\n</ShowScrollingText>\n```'));
                scrollingTextTag.insertText = new vscode.SnippetString('ShowScrollingText: ${1:2}, ${2|OFF,ON|}>\n$0\n</ShowScrollingText');
                completions.push(scrollingTextTag);

                // Weapons and Armors
                const changeWeaponsTag = new vscode.CompletionItem('ChangeWeapons', vscode.CompletionItemKind.Keyword);
                changeWeaponsTag.detail = tr('武器の増減', 'Change Weapons');
                changeWeaponsTag.documentation = new vscode.MarkdownString(tr('武器を増減します\n\n例: `<ChangeWeapons: 1, Increase, 2>`', 'Changes the number of a weapon\n\nExample: `<ChangeWeapons: 1, Increase, 2>`'));
                changeWeaponsTag.insertText = new vscode.SnippetString('ChangeWeapons: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeWeaponsTag);

                const changeArmorsTag = new vscode.CompletionItem('ChangeArmors', vscode.CompletionItemKind.Keyword);
                changeArmorsTag.detail = tr('防具の増減', 'Change Armors');
                changeArmorsTag.documentation = new vscode.MarkdownString(tr('防具を増減します\n\n例: `<ChangeArmors: 1, Increase, 2>`', 'Changes the number of an armor\n\nExample: `<ChangeArmors: 1, Increase, 2>`'));
                changeArmorsTag.insertText = new vscode.SnippetString('ChangeArmors: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeArmorsTag);

                // Party
                const changePartyMemberTag = new vscode.CompletionItem('ChangePartyMember', vscode.CompletionItemKind.Keyword);
                changePartyMemberTag.detail = tr('メンバーの入れ替え', 'Change Party Member');
                changePartyMemberTag.documentation = new vscode.MarkdownString(tr('パーティメンバーを入れ替えます\n\n例: `<ChangePartyMember: 6, Add, Initialize>`', 'Adds or removes a party member\n\nExample: `<ChangePartyMember: 6, Add, Initialize>`'));
                changePartyMemberTag.insertText = new vscode.SnippetString('ChangePartyMember: ${1:1}, ${2|Add,Remove|}');
                completions.push(changePartyMemberTag);

                // Actor Stats
                const changeHpTag = new vscode.CompletionItem('ChangeHp', vscode.CompletionItemKind.Keyword);
                changeHpTag.detail = tr('HPの増減', 'Change HP');
                changeHpTag.documentation = new vscode.MarkdownString(tr('HPを増減します\n\n例: `<ChangeHp: 1, Increase, 100>`', 'Changes HP\n\nExample: `<ChangeHp: 1, Increase, 100>`'));
                changeHpTag.insertText = new vscode.SnippetString('ChangeHp: ${1:1}, ${2|Increase,Decrease|}, ${3:100}');
                completions.push(changeHpTag);

                const changeMpTag = new vscode.CompletionItem('ChangeMp', vscode.CompletionItemKind.Keyword);
                changeMpTag.detail = tr('MPの増減', 'Change MP');
                changeMpTag.documentation = new vscode.MarkdownString(tr('MPを増減します\n\n例: `<ChangeMp: 1, Increase, 50>`', 'Changes MP\n\nExample: `<ChangeMp: 1, Increase, 50>`'));
                changeMpTag.insertText = new vscode.SnippetString('ChangeMp: ${1:1}, ${2|Increase,Decrease|}, ${3:50}');
                completions.push(changeMpTag);

                const changeTpTag = new vscode.CompletionItem('ChangeTp', vscode.CompletionItemKind.Keyword);
                changeTpTag.detail = tr('TPの増減', 'Change TP');
                changeTpTag.documentation = new vscode.MarkdownString(tr('TPを増減します\n\n例: `<ChangeTp: 1, Increase, 20>`', 'Changes TP\n\nExample: `<ChangeTp: 1, Increase, 20>`'));
                changeTpTag.insertText = new vscode.SnippetString('ChangeTp: ${1:1}, ${2|Increase,Decrease|}, ${3:20}');
                completions.push(changeTpTag);

                const changeStateTag = new vscode.CompletionItem('ChangeState', vscode.CompletionItemKind.Keyword);
                changeStateTag.detail = tr('ステートの変更', 'Change State');
                changeStateTag.documentation = new vscode.MarkdownString(tr('ステートを変更します\n\n例: `<ChangeState: 1, Add, 1>`', 'Adds or removes a state\n\nExample: `<ChangeState: 1, Add, 1>`'));
                changeStateTag.insertText = new vscode.SnippetString('ChangeState: ${1:1}, ${2|Add,Remove|}, ${3:1}');
                completions.push(changeStateTag);

                const recoverAllTag = new vscode.CompletionItem('RecoverAll', vscode.CompletionItemKind.Keyword);
                recoverAllTag.detail = tr('全回復', 'Recover All');
                recoverAllTag.documentation = new vscode.MarkdownString(tr('アクターを全回復します\n\n例: `<RecoverAll: 1>`', 'Fully recovers actors\n\nExample: `<RecoverAll: 1>`'));
                recoverAllTag.insertText = new vscode.SnippetString('RecoverAll: ${1:1}');
                completions.push(recoverAllTag);

                const changeExpTag = new vscode.CompletionItem('ChangeExp', vscode.CompletionItemKind.Keyword);
                changeExpTag.detail = tr('経験値の増減', 'Change EXP');
                changeExpTag.documentation = new vscode.MarkdownString(tr('経験値を増減します\n\n例: `<ChangeExp: 1, Increase, 100>`', 'Changes EXP\n\nExample: `<ChangeExp: 1, Increase, 100>`'));
                changeExpTag.insertText = new vscode.SnippetString('ChangeExp: ${1:1}, ${2|Increase,Decrease|}, ${3:100}');
                completions.push(changeExpTag);

                const changeLevelTag = new vscode.CompletionItem('ChangeLevel', vscode.CompletionItemKind.Keyword);
                changeLevelTag.detail = tr('レベルの増減', 'Change Level');
                changeLevelTag.documentation = new vscode.MarkdownString(tr('レベルを増減します\n\n例: `<ChangeLevel: 1, Increase, 1>`', 'Changes the level\n\nExample: `<ChangeLevel: 1, Increase, 1>`'));
                changeLevelTag.insertText = new vscode.SnippetString('ChangeLevel: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeLevelTag);

                const changeSkillTag = new vscode.CompletionItem('ChangeSkill', vscode.CompletionItemKind.Keyword);
                changeSkillTag.detail = tr('スキルの増減', 'Change Skill');
                changeSkillTag.documentation = new vscode.MarkdownString(tr('スキルを増減します\n\n例: `<ChangeSkill: 1, Learn, 5>`', 'Learns or forgets a skill\n\nExample: `<ChangeSkill: 1, Learn, 5>`'));
                changeSkillTag.insertText = new vscode.SnippetString('ChangeSkill: ${1:1}, ${2|Learn,Forget|}, ${3:1}');
                completions.push(changeSkillTag);

                const changeNameTag = new vscode.CompletionItem('ChangeName', vscode.CompletionItemKind.Keyword);
                changeNameTag.detail = tr('名前の変更', 'Change Name');
                changeNameTag.documentation = new vscode.MarkdownString(tr('アクターの名前を変更します\n\n例: `<ChangeName: 1, NewName>`', 'Changes an actor\'s name\n\nExample: `<ChangeName: 1, NewName>`'));
                changeNameTag.insertText = new vscode.SnippetString('ChangeName: ${1:1}, $2');
                completions.push(changeNameTag);

                const changeClassTag = new vscode.CompletionItem('ChangeClass', vscode.CompletionItemKind.Keyword);
                changeClassTag.detail = tr('職業の変更', 'Change Class');
                changeClassTag.documentation = new vscode.MarkdownString(tr('職業を変更します\n\n例: `<ChangeClass: 1, 2>`', 'Changes the class\n\nExample: `<ChangeClass: 1, 2>`'));
                changeClassTag.insertText = new vscode.SnippetString('ChangeClass: ${1:1}, ${2:2}');
                completions.push(changeClassTag);

                const changeNicknameTag = new vscode.CompletionItem('ChangeNickname', vscode.CompletionItemKind.Keyword);
                changeNicknameTag.detail = tr('二つ名の変更', 'Change Nickname');
                changeNicknameTag.documentation = new vscode.MarkdownString(tr('二つ名を変更します\n\n例: `<ChangeNickname: 1, Nickname>`', 'Changes the nickname\n\nExample: `<ChangeNickname: 1, Nickname>`'));
                changeNicknameTag.insertText = new vscode.SnippetString('ChangeNickname: ${1:1}, $2');
                completions.push(changeNicknameTag);

                const changeProfileTag = new vscode.CompletionItem('ChangeProfile', vscode.CompletionItemKind.Keyword);
                changeProfileTag.detail = tr('プロフィールの変更', 'Change Profile');
                changeProfileTag.documentation = new vscode.MarkdownString(tr('プロフィールを変更します\n\n例: `<ChangeProfile: 1, Line1, Line2>`', 'Changes the profile\n\nExample: `<ChangeProfile: 1, Line1, Line2>`'));
                changeProfileTag.insertText = new vscode.SnippetString('ChangeProfile: ${1:1}, $2');
                completions.push(changeProfileTag);

                // Map and Location
                const transferPlayerTag = new vscode.CompletionItem('TransferPlayer', vscode.CompletionItemKind.Keyword);
                transferPlayerTag.detail = tr('場所移動', 'Transfer Player');
                transferPlayerTag.documentation = new vscode.MarkdownString(tr('場所を移動します\n\n例: `<TransferPlayer: Direct[1][10][20], Retain, Black>`', 'Transfers the player\n\nExample: `<TransferPlayer: Direct[1][10][20], Retain, Black>`'));
                transferPlayerTag.insertText = new vscode.SnippetString('TransferPlayer: Direct[${1:1}][${2:10}][${3:20}], ${4|Retain,Down,Left,Right,Up|}, ${5|Black,White,None|}');
                completions.push(transferPlayerTag);

                const setVehicleLocationTag = new vscode.CompletionItem('SetVehicleLocation', vscode.CompletionItemKind.Keyword);
                setVehicleLocationTag.detail = tr('乗り物の位置設定', 'Set Vehicle Location');
                setVehicleLocationTag.documentation = new vscode.MarkdownString(tr('乗り物の位置を設定します\n\n例: `<SetVehicleLocation: Boat, Direct[1][10][20]>`', 'Sets where a vehicle is\n\nExample: `<SetVehicleLocation: Boat, Direct[1][10][20]>`'));
                setVehicleLocationTag.insertText = new vscode.SnippetString('SetVehicleLocation: ${1|Boat,Ship,Airship|}, Direct[${2:1}][${3:10}][${4:20}]');
                completions.push(setVehicleLocationTag);

                const setEventLocationTag = new vscode.CompletionItem('SetEventLocation', vscode.CompletionItemKind.Keyword);
                setEventLocationTag.detail = tr('イベントの位置設定', 'Set Event Location');
                setEventLocationTag.documentation = new vscode.MarkdownString(tr('イベントの位置を設定します\n\n例: `<SetEventLocation: This Event, Direct[10][20], Retain>`', 'Sets where an event is\n\nExample: `<SetEventLocation: This Event, Direct[10][20], Retain>`'));
                setEventLocationTag.insertText = new vscode.SnippetString('SetEventLocation: ${1:This Event}, Direct[${2:10}][${3:20}], ${4|Retain,Down,Left,Right,Up|}');
                completions.push(setEventLocationTag);

                // Weather
                const setWeatherEffectTag = new vscode.CompletionItem('SetWeatherEffect', vscode.CompletionItemKind.Keyword);
                setWeatherEffectTag.detail = tr('天候の設定', 'Set Weather Effect');
                setWeatherEffectTag.documentation = new vscode.MarkdownString(tr('天候を設定します\n\n例: `<SetWeatherEffect: Rain, 5, 60, Wait>`', 'Sets the weather\n\nExample: `<SetWeatherEffect: Rain, 5, 60, Wait>`'));
                setWeatherEffectTag.insertText = new vscode.SnippetString('SetWeatherEffect: ${1|None,Rain,Storm,Snow|}, ${2:5}, ${3:60}');
                completions.push(setWeatherEffectTag);

                // Movie
                const playMovieTag = new vscode.CompletionItem('PlayMovie', vscode.CompletionItemKind.Keyword);
                playMovieTag.detail = tr('ムービーの再生', 'Play Movie');
                playMovieTag.documentation = new vscode.MarkdownString(tr('ムービーを再生します\n\n例: `<PlayMovie: SampleMovie>`', 'Plays a movie\n\nExample: `<PlayMovie: SampleMovie>`'));
                playMovieTag.insertText = new vscode.SnippetString('PlayMovie: $1');
                completions.push(playMovieTag);

                // Battle Processing
                const battleProcessingTag = new vscode.CompletionItem('BattleProcessing', vscode.CompletionItemKind.Snippet);
                battleProcessingTag.detail = tr('戦闘の処理', 'Battle Processing');
                battleProcessingTag.documentation = new vscode.MarkdownString(tr('戦闘の処理を実行します\n\n例:\n```\n<BattleProcessing: 1>\n<IfWin>\n...\n<End>\n```', 'Starts a battle\n\nExample:\n```\n<BattleProcessing: 1>\n<IfWin>\n...\n<End>\n```'));
                battleProcessingTag.insertText = new vscode.SnippetString('BattleProcessing: ${1:1}>\n<IfWin>\n$2\n<End');
                completions.push(battleProcessingTag);

                const ifWinTag = new vscode.CompletionItem('IfWin', vscode.CompletionItemKind.Keyword);
                ifWinTag.detail = tr('勝ったとき', 'If Win');
                ifWinTag.documentation = new vscode.MarkdownString(tr('戦闘に勝った時の処理', 'What happens when the battle is won'));
                ifWinTag.insertText = 'IfWin';
                completions.push(ifWinTag);

                const ifEscapeTag = new vscode.CompletionItem('IfEscape', vscode.CompletionItemKind.Keyword);
                ifEscapeTag.detail = tr('逃げたとき', 'If Escape');
                ifEscapeTag.documentation = new vscode.MarkdownString(tr('戦闘から逃げた時の処理', 'What happens when the party escapes'));
                ifEscapeTag.insertText = 'IfEscape';
                completions.push(ifEscapeTag);

                const ifLoseTag = new vscode.CompletionItem('IfLose', vscode.CompletionItemKind.Keyword);
                ifLoseTag.detail = tr('負けたとき', 'If Lose');
                ifLoseTag.documentation = new vscode.MarkdownString(tr('戦闘に負けた時の処理', 'What happens when the battle is lost'));
                ifLoseTag.insertText = 'IfLose';
                completions.push(ifLoseTag);

                // Shop Processing
                const shopProcessingTag = new vscode.CompletionItem('ShopProcessing', vscode.CompletionItemKind.Snippet);
                shopProcessingTag.detail = tr('ショップの処理', 'Shop Processing');
                shopProcessingTag.documentation = new vscode.MarkdownString(tr('ショップの処理を実行します\n\n例:\n```\n<ShopProcessing>\n<Merchandise: item, 1, standard>\n```', 'Opens a shop\n\nExample:\n```\n<ShopProcessing>\n<Merchandise: item, 1, standard>\n```'));
                shopProcessingTag.insertText = new vscode.SnippetString('ShopProcessing>\n<Merchandise: ${1|item,weapon,armor|}, ${2:1}, ${3:standard}');
                completions.push(shopProcessingTag);

                const merchandiseTag = new vscode.CompletionItem('Merchandise', vscode.CompletionItemKind.Keyword);
                merchandiseTag.detail = tr('商品', 'Goods');
                merchandiseTag.documentation = new vscode.MarkdownString(tr('ショップの商品を設定します\n\n例: `<Merchandise: item, 1, standard>`', 'Adds goods to the shop\n\nExample: `<Merchandise: item, 1, standard>`'));
                merchandiseTag.insertText = new vscode.SnippetString('Merchandise: ${1|item,weapon,armor|}, ${2:1}, ${3:standard}');
                completions.push(merchandiseTag);

                // Screen Control
                const nameInputProcessingTag = new vscode.CompletionItem('NameInputProcessing', vscode.CompletionItemKind.Keyword);
                nameInputProcessingTag.detail = tr('名前入力の処理', 'Name Input Processing');
                nameInputProcessingTag.documentation = new vscode.MarkdownString(tr('名前入力画面を表示します\n\n例: `<NameInputProcessing: 1, 8>`', 'Shows the name input window\n\nExample: `<NameInputProcessing: 1, 8>`'));
                nameInputProcessingTag.insertText = new vscode.SnippetString('NameInputProcessing: ${1:1}, ${2:8}');
                completions.push(nameInputProcessingTag);

                const openMenuScreenTag = new vscode.CompletionItem('OpenMenuScreen', vscode.CompletionItemKind.Keyword);
                openMenuScreenTag.detail = tr('メニュー画面を開く', 'Open Menu Screen');
                openMenuScreenTag.documentation = new vscode.MarkdownString(tr('メニュー画面を開きます', 'Opens the menu screen'));
                openMenuScreenTag.insertText = 'OpenMenuScreen';
                completions.push(openMenuScreenTag);

                const openSaveScreenTag = new vscode.CompletionItem('OpenSaveScreen', vscode.CompletionItemKind.Keyword);
                openSaveScreenTag.detail = tr('セーブ画面を開く', 'Open Save Screen');
                openSaveScreenTag.documentation = new vscode.MarkdownString(tr('セーブ画面を開きます', 'Opens the save screen'));
                openSaveScreenTag.insertText = 'OpenSaveScreen';
                completions.push(openSaveScreenTag);

                const gameOverTag = new vscode.CompletionItem('GameOver', vscode.CompletionItemKind.Keyword);
                gameOverTag.detail = tr('ゲームオーバー', 'Game Over');
                gameOverTag.documentation = new vscode.MarkdownString(tr('ゲームオーバー画面を表示します', 'Shows the game over screen'));
                gameOverTag.insertText = 'GameOver';
                completions.push(gameOverTag);

                const returnToTitleScreenTag = new vscode.CompletionItem('ReturnToTitleScreen', vscode.CompletionItemKind.Keyword);
                returnToTitleScreenTag.detail = tr('タイトル画面に戻す', 'Return to Title Screen');
                returnToTitleScreenTag.documentation = new vscode.MarkdownString(tr('タイトル画面に戻ります', 'Returns to the title screen'));
                returnToTitleScreenTag.insertText = 'ReturnToTitleScreen';
                completions.push(returnToTitleScreenTag);

                // Plugin Command
                const pluginCommandTag = new vscode.CompletionItem('PluginCommand:', vscode.CompletionItemKind.Keyword);
                pluginCommandTag.detail = tr('プラグインコマンド', 'Plugin Command');
                pluginCommandTag.documentation = new vscode.MarkdownString(tr('プラグインコマンドを実行します\n\n例: `<PluginCommand: IMPORT_MESSAGE_TO_EVENT>`', 'Runs a plugin command\n\nExample: `<PluginCommand: IMPORT_MESSAGE_TO_EVENT>`'));
                pluginCommandTag.insertText = new vscode.SnippetString('PluginCommand: $1');
                completions.push(pluginCommandTag);

                // Comment block
                const commentTag = new vscode.CompletionItem('comment', vscode.CompletionItemKind.Snippet);
                commentTag.detail = tr('コメントブロック', 'Comment block');
                commentTag.insertText = new vscode.SnippetString('comment>\n$0\n</comment');
                commentTag.documentation = new vscode.MarkdownString(tr('コメントブロックを挿入します', 'Inserts a comment block'));
                completions.push(commentTag);

                // Script block
                const scriptTag = new vscode.CompletionItem('script', vscode.CompletionItemKind.Snippet);
                scriptTag.detail = tr('スクリプトブロック', 'Script block');
                scriptTag.insertText = new vscode.SnippetString('script>\n$0\n</script');
                scriptTag.documentation = new vscode.MarkdownString(tr('JavaScriptコードを挿入します', 'Inserts JavaScript code'));
                completions.push(scriptTag);

                return completions;
            }
        },
        '<' // Trigger completion when '<' is typed
    );

    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider('text2frame', {
        provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
            const range = document.getWordRangeAtPosition(position, /<([^>]+)>/);
            if (!range) {
                return;
            }

            const word = document.getText(range);
            const tagHelp = getTagHelp(word);
            
            if (tagHelp) {
                return new vscode.Hover(tagHelp);
            }
        }
    });

    // Register diagnostic provider
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('text2frame');
    
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
    }

    context.subscriptions.push(
        completionProvider,
        hoverProvider,
        diagnosticCollection,
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
            if (editor) {
                updateDiagnostics(editor.document, diagnosticCollection);
            }
        }),
        vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
            if (e.document.languageId === 'text2frame') {
                updateDiagnostics(e.document, diagnosticCollection);
            }
        })
    );
}

function getTagHelp(tag: string): vscode.MarkdownString | undefined {
    const text = tagHelpText(tag);
    return text ? new vscode.MarkdownString(text) : undefined;
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    if (document.languageId !== 'text2frame') {
        return;
    }

    const lines: string[] = [];
    for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);
    const diagnostics = basicProblems(lines).map((p) => {
        const d = new vscode.Diagnostic(
            new vscode.Range(p.line, p.start, p.line, p.end),
            p.message,
            p.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
        );
        if (p.code === FIX.unclosed || p.code === FIX.emptyTag) d.code = p.code;
        return d;
    });

    collection.set(document.uri, diagnostics);
}

export function deactivate() {}
