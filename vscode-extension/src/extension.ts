import * as vscode from 'vscode';
import { registerDeployFeature, showCompiledJson } from './deploy';
import { exportCurrentFile, exportCurrentFileForTranslation } from './exportText';
import { deployAll, exportAll } from './batch';
import { seedLocale, deployLocale } from './translation';
import { registerTreeView } from './tree';
import { parseFrontMatter } from './compiler';

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
    console.log('Text2Frame Language Support is now active!');

    // Watch & Deploy: compile the current text file back into the RPG Maker data JSON.
    registerDeployFeature(context);
    // Activity Bar tree (Maps / Events / Pages / Common Events).
    registerTreeView(context);

    // Auto-assign the text2frame language to front-matter .txt files (open now + later).
    vscode.workspace.textDocuments.forEach(maybeAssignLanguage);
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(maybeAssignLanguage),
        vscode.workspace.onDidSaveTextDocument(maybeAssignLanguage)
    );

    // Export / batch / preview commands.
    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.exportCurrentFile', () => exportCurrentFile(context)),
        vscode.commands.registerCommand('text2frame.exportForTranslation', () => exportCurrentFileForTranslation(context)),
        vscode.commands.registerCommand('text2frame.showCompiledJson', () => showCompiledJson(context)),
        vscode.commands.registerCommand('text2frame.deployAll', () => deployAll(context)),
        vscode.commands.registerCommand('text2frame.exportAll', () => exportAll(context)),
        vscode.commands.registerCommand('text2frame.seedLocale', () => seedLocale(context)),
        vscode.commands.registerCommand('text2frame.deployLocale', () => deployLocale(context))
    );

    // Register completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'text2frame',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const completions: vscode.CompletionItem[] = [];

                // Message Display Settings
                const faceTag = new vscode.CompletionItem('Face: Actor1(0)', vscode.CompletionItemKind.Keyword);
                faceTag.detail = '顔グラフィック設定';
                faceTag.documentation = new vscode.MarkdownString('顔グラフィックを設定します\n\n例: `<Face: Actor1(0)>`');
                faceTag.insertText = new vscode.SnippetString('Face: ${1:Actor1(0)}');
                completions.push(faceTag);

                const wpTag = new vscode.CompletionItem('WindowPosition: Bottom', vscode.CompletionItemKind.Keyword);
                wpTag.detail = 'ウィンドウ位置設定';
                wpTag.documentation = new vscode.MarkdownString('ウィンドウ位置を設定します\n\n例: `<WindowPosition: Top|Middle|Bottom>`');
                wpTag.insertText = new vscode.SnippetString('WindowPosition: ${1|Top,Middle,Bottom|}');
                completions.push(wpTag);

                const bgTag = new vscode.CompletionItem('Background: Window', vscode.CompletionItemKind.Keyword);
                bgTag.detail = '背景設定';
                bgTag.documentation = new vscode.MarkdownString('背景を設定します\n\n例: `<Background: Window|Dim|Transparent>`');
                bgTag.insertText = new vscode.SnippetString('Background: ${1|Window,Dim,Transparent|}');
                completions.push(bgTag);

                const nameTag = new vscode.CompletionItem('Name:', vscode.CompletionItemKind.Keyword);
                nameTag.detail = '名前設定 (MZ用)';
                nameTag.documentation = new vscode.MarkdownString('名前を設定します\n\n例: `<Name: キャラクター名>`');
                nameTag.insertText = new vscode.SnippetString('Name: $1');
                completions.push(nameTag);

                // Choice and Branching
                const choiceTag = new vscode.CompletionItem('ShowChoices', vscode.CompletionItemKind.Snippet);
                choiceTag.detail = '選択肢の表示';
                choiceTag.documentation = new vscode.MarkdownString('選択肢を表示します\n\n例:\n```\n<ShowChoices>\n<When: はい>\n...\n<When: いいえ>\n...\n<End>\n```');
                choiceTag.insertText = new vscode.SnippetString('ShowChoices>\n<When: ${1:はい}>\n$2\n<When: ${3:いいえ}>\n$4\n<End');
                completions.push(choiceTag);

                const whenTag = new vscode.CompletionItem('When:', vscode.CompletionItemKind.Keyword);
                whenTag.detail = '選択肢の分岐';
                whenTag.documentation = new vscode.MarkdownString('選択肢の分岐を定義します\n\n例: `<When: はい>`');
                whenTag.insertText = new vscode.SnippetString('When: $1');
                completions.push(whenTag);

                const ifTag = new vscode.CompletionItem('If:', vscode.CompletionItemKind.Snippet);
                ifTag.detail = '条件分岐';
                ifTag.documentation = new vscode.MarkdownString('条件分岐を設定します\n\n例:\n```\n<If: Switch[1], ON>\n...\n<Else>\n...\n<End>\n```');
                ifTag.insertText = new vscode.SnippetString('If: ${1:Switch[1], ON}>\n$2\n<Else>\n$3\n<End');
                completions.push(ifTag);

                const elseTag = new vscode.CompletionItem('Else', vscode.CompletionItemKind.Keyword);
                elseTag.detail = 'ELSE分岐';
                elseTag.documentation = new vscode.MarkdownString('条件分岐のELSE部分');
                elseTag.insertText = 'Else';
                completions.push(elseTag);

                const endTag = new vscode.CompletionItem('End', vscode.CompletionItemKind.Keyword);
                endTag.detail = '分岐の終了';
                endTag.documentation = new vscode.MarkdownString('分岐を終了します');
                endTag.insertText = 'End';
                completions.push(endTag);

                // Loop
                const loopTag = new vscode.CompletionItem('Loop', vscode.CompletionItemKind.Snippet);
                loopTag.detail = 'ループ';
                loopTag.documentation = new vscode.MarkdownString('ループ処理を開始します\n\n例:\n```\n<Loop>\n...\n<RepeatAbove>\n```');
                loopTag.insertText = new vscode.SnippetString('Loop>\n$0\n<RepeatAbove');
                completions.push(loopTag);

                const repeatTag = new vscode.CompletionItem('RepeatAbove', vscode.CompletionItemKind.Keyword);
                repeatTag.detail = '以上繰り返し';
                repeatTag.documentation = new vscode.MarkdownString('ループを終了します');
                repeatTag.insertText = 'RepeatAbove';
                completions.push(repeatTag);

                const breakLoopTag = new vscode.CompletionItem('BreakLoop', vscode.CompletionItemKind.Keyword);
                breakLoopTag.detail = 'ループの中断';
                breakLoopTag.documentation = new vscode.MarkdownString('ループを中断します');
                breakLoopTag.insertText = 'BreakLoop';
                completions.push(breakLoopTag);

                // Switch and Variable Operations
                const switchTag = new vscode.CompletionItem('Switch: 1, ON', vscode.CompletionItemKind.Keyword);
                switchTag.detail = 'スイッチの操作';
                switchTag.documentation = new vscode.MarkdownString('スイッチを操作します\n\n例: `<Switch: 1, ON>` または `<Switch: 1-10, OFF>`');
                switchTag.insertText = new vscode.SnippetString('Switch: ${1:1}, ${2|ON,OFF|}');
                completions.push(switchTag);

                const selfSwitchTag = new vscode.CompletionItem('SelfSwitch: A, ON', vscode.CompletionItemKind.Keyword);
                selfSwitchTag.detail = 'セルフスイッチの操作';
                selfSwitchTag.documentation = new vscode.MarkdownString('セルフスイッチを操作します\n\n例: `<SelfSwitch: A, ON>`');
                selfSwitchTag.insertText = new vscode.SnippetString('SelfSwitch: ${1|A,B,C,D|}, ${2|ON,OFF|}');
                completions.push(selfSwitchTag);

                const setTag = new vscode.CompletionItem('Set: 1, 0', vscode.CompletionItemKind.Keyword);
                setTag.detail = '変数の操作（代入）';
                setTag.documentation = new vscode.MarkdownString('変数に値を代入します\n\n例: `<Set: 1, 2>` または `<Set: 1, V[20]>`');
                setTag.insertText = new vscode.SnippetString('Set: ${1:1}, ${2:0}');
                completions.push(setTag);

                const addTag = new vscode.CompletionItem('Add: 1, 1', vscode.CompletionItemKind.Keyword);
                addTag.detail = '変数の操作（加算）';
                addTag.documentation = new vscode.MarkdownString('変数に値を加算します\n\n例: `<Add: 1, 10>`');
                addTag.insertText = new vscode.SnippetString('Add: ${1:1}, ${2:1}');
                completions.push(addTag);

                const subTag = new vscode.CompletionItem('Sub: 1, 1', vscode.CompletionItemKind.Keyword);
                subTag.detail = '変数の操作（減算）';
                subTag.documentation = new vscode.MarkdownString('変数から値を減算します\n\n例: `<Sub: 1, 10>`');
                subTag.insertText = new vscode.SnippetString('Sub: ${1:1}, ${2:1}');
                completions.push(subTag);

                const mulTag = new vscode.CompletionItem('Mul: 1, 2', vscode.CompletionItemKind.Keyword);
                mulTag.detail = '変数の操作（乗算）';
                mulTag.documentation = new vscode.MarkdownString('変数に値を乗算します\n\n例: `<Mul: 1, 2>`');
                mulTag.insertText = new vscode.SnippetString('Mul: ${1:1}, ${2:2}');
                completions.push(mulTag);

                const divTag = new vscode.CompletionItem('Div: 1, 2', vscode.CompletionItemKind.Keyword);
                divTag.detail = '変数の操作（除算）';
                divTag.documentation = new vscode.MarkdownString('変数を値で除算します\n\n例: `<Div: 1, 2>`');
                divTag.insertText = new vscode.SnippetString('Div: ${1:1}, ${2:2}');
                completions.push(divTag);

                const modTag = new vscode.CompletionItem('Mod: 1, 2', vscode.CompletionItemKind.Keyword);
                modTag.detail = '変数の操作（剰余）';
                modTag.documentation = new vscode.MarkdownString('変数の剰余を求めます\n\n例: `<Mod: 1, 2>`');
                modTag.insertText = new vscode.SnippetString('Mod: ${1:1}, ${2:2}');
                completions.push(modTag);

                // Timer
                const timerTag = new vscode.CompletionItem('Timer: start, 1, 0', vscode.CompletionItemKind.Keyword);
                timerTag.detail = 'タイマーの操作';
                timerTag.documentation = new vscode.MarkdownString('タイマーを操作します\n\n例: `<Timer: start, 1, 30>` (1分30秒) または `<Timer: Stop>`');
                timerTag.insertText = new vscode.SnippetString('Timer: ${1|start,Stop|}, ${2:1}, ${3:0}');
                completions.push(timerTag);

                // Label and Jump
                const labelTag = new vscode.CompletionItem('Label:', vscode.CompletionItemKind.Keyword);
                labelTag.detail = 'ラベル';
                labelTag.documentation = new vscode.MarkdownString('ラベルを設定します\n\n例: `<Label: Start>`');
                labelTag.insertText = new vscode.SnippetString('Label: $1');
                completions.push(labelTag);

                const jumpTag = new vscode.CompletionItem('JumpToLabel:', vscode.CompletionItemKind.Keyword);
                jumpTag.detail = 'ラベルジャンプ';
                jumpTag.documentation = new vscode.MarkdownString('指定したラベルにジャンプします\n\n例: `<JumpToLabel: Start>`');
                jumpTag.insertText = new vscode.SnippetString('JumpToLabel: $1');
                completions.push(jumpTag);

                const exitTag = new vscode.CompletionItem('ExitEventProcessing', vscode.CompletionItemKind.Keyword);
                exitTag.detail = 'イベント処理の中断';
                exitTag.documentation = new vscode.MarkdownString('イベント処理を中断します');
                exitTag.insertText = 'ExitEventProcessing';
                completions.push(exitTag);

                // Common Event
                const commonEventTag = new vscode.CompletionItem('CommonEvent:', vscode.CompletionItemKind.Keyword);
                commonEventTag.detail = 'コモンイベント';
                commonEventTag.documentation = new vscode.MarkdownString('コモンイベントを実行します\n\n例: `<CommonEvent: 1>`');
                commonEventTag.insertText = new vscode.SnippetString('CommonEvent: ${1:1}');
                completions.push(commonEventTag);

                // Audio
                const bgmTag = new vscode.CompletionItem('PlayBGM:', vscode.CompletionItemKind.Keyword);
                bgmTag.detail = 'BGMの演奏';
                bgmTag.documentation = new vscode.MarkdownString('BGMを演奏します\n\n例: `<PlayBGM: Battle1>` または `<PlayBGM: Battle1, 90, 100, 0>`');
                bgmTag.insertText = new vscode.SnippetString('PlayBGM: $1');
                completions.push(bgmTag);

                const fadeoutBGMTag = new vscode.CompletionItem('FadeoutBGM:', vscode.CompletionItemKind.Keyword);
                fadeoutBGMTag.detail = 'BGMのフェードアウト';
                fadeoutBGMTag.documentation = new vscode.MarkdownString('BGMをフェードアウトします\n\n例: `<FadeoutBGM: 10>` (秒数)');
                fadeoutBGMTag.insertText = new vscode.SnippetString('FadeoutBGM: ${1:10}');
                completions.push(fadeoutBGMTag);

                const saveBGMTag = new vscode.CompletionItem('saveBGM', vscode.CompletionItemKind.Keyword);
                saveBGMTag.detail = 'BGMの保存';
                saveBGMTag.documentation = new vscode.MarkdownString('現在のBGMを保存します');
                saveBGMTag.insertText = 'saveBGM';
                completions.push(saveBGMTag);

                const replayBGMTag = new vscode.CompletionItem('replaybgm', vscode.CompletionItemKind.Keyword);
                replayBGMTag.detail = 'BGMの再開';
                replayBGMTag.documentation = new vscode.MarkdownString('保存したBGMを再開します');
                replayBGMTag.insertText = 'replaybgm';
                completions.push(replayBGMTag);

                const bgsTag = new vscode.CompletionItem('PlayBGS:', vscode.CompletionItemKind.Keyword);
                bgsTag.detail = 'BGSの演奏';
                bgsTag.documentation = new vscode.MarkdownString('BGSを演奏します\n\n例: `<PlayBGS: City>`');
                bgsTag.insertText = new vscode.SnippetString('PlayBGS: $1');
                completions.push(bgsTag);

                const fadeoutBGSTag = new vscode.CompletionItem('FadeoutBGS: 10', vscode.CompletionItemKind.Keyword);
                fadeoutBGSTag.detail = 'BGSのフェードアウト';
                fadeoutBGSTag.documentation = new vscode.MarkdownString('BGSをフェードアウトします\n\n例: `<FadeoutBGS: 10>`');
                fadeoutBGSTag.insertText = new vscode.SnippetString('FadeoutBGS: ${1:10}');
                completions.push(fadeoutBGSTag);

                const meTag = new vscode.CompletionItem('PlayME:', vscode.CompletionItemKind.Keyword);
                meTag.detail = 'MEの演奏';
                meTag.documentation = new vscode.MarkdownString('MEを演奏します\n\n例: `<PlayME: Victory1>`');
                meTag.insertText = new vscode.SnippetString('PlayME: $1');
                completions.push(meTag);

                const seTag = new vscode.CompletionItem('PlaySE:', vscode.CompletionItemKind.Keyword);
                seTag.detail = 'SEの演奏';
                seTag.documentation = new vscode.MarkdownString('SEを演奏します\n\n例: `<PlaySE: Attack1>`');
                seTag.insertText = new vscode.SnippetString('PlaySE: $1');
                completions.push(seTag);

                const stopSETag = new vscode.CompletionItem('StopSE', vscode.CompletionItemKind.Keyword);
                stopSETag.detail = 'SEの停止';
                stopSETag.documentation = new vscode.MarkdownString('SEを停止します');
                stopSETag.insertText = 'StopSE';
                completions.push(stopSETag);

                // Picture
                const showPictureTag = new vscode.CompletionItem('ShowPicture: 1,', vscode.CompletionItemKind.Keyword);
                showPictureTag.detail = 'ピクチャの表示';
                showPictureTag.documentation = new vscode.MarkdownString('ピクチャを表示します\n\n例: `<ShowPicture: 1, Castle>`');
                showPictureTag.insertText = new vscode.SnippetString('ShowPicture: ${1:1}, $2');
                completions.push(showPictureTag);

                const movePictureTag = new vscode.CompletionItem('MovePicture: 1', vscode.CompletionItemKind.Keyword);
                movePictureTag.detail = 'ピクチャの移動';
                movePictureTag.documentation = new vscode.MarkdownString('ピクチャを移動します\n\n例: `<MovePicture: 1, Position[Center][200][300]>`');
                movePictureTag.insertText = new vscode.SnippetString('MovePicture: ${1:1}');
                completions.push(movePictureTag);

                const rotatePictureTag = new vscode.CompletionItem('RotatePicture: 1, -30', vscode.CompletionItemKind.Keyword);
                rotatePictureTag.detail = 'ピクチャの回転';
                rotatePictureTag.documentation = new vscode.MarkdownString('ピクチャを回転します\n\n例: `<RotatePicture: 1, -30>`');
                rotatePictureTag.insertText = new vscode.SnippetString('RotatePicture: ${1:1}, ${2:-30}');
                completions.push(rotatePictureTag);

                const tintPictureTag = new vscode.CompletionItem('TintPicture: 1', vscode.CompletionItemKind.Keyword);
                tintPictureTag.detail = 'ピクチャの色調変更';
                tintPictureTag.documentation = new vscode.MarkdownString('ピクチャの色調を変更します\n\n例: `<TintPicture: 1, ColorTone[0][100][255][50]>`');
                tintPictureTag.insertText = new vscode.SnippetString('TintPicture: ${1:1}');
                completions.push(tintPictureTag);

                const erasePictureTag = new vscode.CompletionItem('ErasePicture: 1', vscode.CompletionItemKind.Keyword);
                erasePictureTag.detail = 'ピクチャの消去';
                erasePictureTag.documentation = new vscode.MarkdownString('ピクチャを消去します\n\n例: `<ErasePicture: 1>`');
                erasePictureTag.insertText = new vscode.SnippetString('ErasePicture: ${1:1}');
                completions.push(erasePictureTag);

                // Screen Effects
                const fadeOutTag = new vscode.CompletionItem('FadeOut', vscode.CompletionItemKind.Keyword);
                fadeOutTag.detail = '画面のフェードアウト';
                fadeOutTag.documentation = new vscode.MarkdownString('画面をフェードアウトします');
                fadeOutTag.insertText = 'FadeOut';
                completions.push(fadeOutTag);

                const fadeInTag = new vscode.CompletionItem('FadeIn', vscode.CompletionItemKind.Keyword);
                fadeInTag.detail = '画面のフェードイン';
                fadeInTag.documentation = new vscode.MarkdownString('画面をフェードインします');
                fadeInTag.insertText = 'FadeIn';
                completions.push(fadeInTag);

                const tintScreenTag = new vscode.CompletionItem('TintScreen', vscode.CompletionItemKind.Keyword);
                tintScreenTag.detail = '画面の色調変更';
                tintScreenTag.documentation = new vscode.MarkdownString('画面の色調を変更します\n\n例: `<TintScreen: Duration[60], ColorTone[0][100][255][50]>`');
                tintScreenTag.insertText = new vscode.SnippetString('TintScreen: Duration[${1:60}], ColorTone[${2:0}][${3:0}][${4:0}][${5:0}]');
                completions.push(tintScreenTag);

                const flashScreenTag = new vscode.CompletionItem('FlashScreen', vscode.CompletionItemKind.Keyword);
                flashScreenTag.detail = '画面のフラッシュ';
                flashScreenTag.documentation = new vscode.MarkdownString('画面をフラッシュします\n\n例: `<FlashScreen: 50, 100, 150, 170, 60>`');
                flashScreenTag.insertText = new vscode.SnippetString('FlashScreen: ${1:255}, ${2:255}, ${3:255}, ${4:170}, ${5:60}');
                completions.push(flashScreenTag);

                const shakeScreenTag = new vscode.CompletionItem('ShakeScreen', vscode.CompletionItemKind.Keyword);
                shakeScreenTag.detail = '画面のシェイク';
                shakeScreenTag.documentation = new vscode.MarkdownString('画面をシェイクします\n\n例: `<ShakeScreen: 5, 8, 60>`');
                shakeScreenTag.insertText = new vscode.SnippetString('ShakeScreen: ${1:5}, ${2:8}, ${3:60}');
                completions.push(shakeScreenTag);

                // Wait
                const waitTag = new vscode.CompletionItem('Wait: 60', vscode.CompletionItemKind.Keyword);
                waitTag.detail = 'ウェイト';
                waitTag.documentation = new vscode.MarkdownString('ウェイトを設定します\n\n例: `<Wait: 60>` (フレーム数)');
                waitTag.insertText = new vscode.SnippetString('Wait: ${1:60}');
                completions.push(waitTag);

                // Items and Gold
                const changeGoldTag = new vscode.CompletionItem('ChangeGold', vscode.CompletionItemKind.Keyword);
                changeGoldTag.detail = '所持金の増減';
                changeGoldTag.documentation = new vscode.MarkdownString('所持金を増減します\n\n例: `<ChangeGold: Increase, 100>`');
                changeGoldTag.insertText = new vscode.SnippetString('ChangeGold: ${1|Increase,Decrease|}, ${2:100}');
                completions.push(changeGoldTag);

                const changeItemsTag = new vscode.CompletionItem('ChangeItems', vscode.CompletionItemKind.Keyword);
                changeItemsTag.detail = 'アイテムの増減';
                changeItemsTag.documentation = new vscode.MarkdownString('アイテムを増減します\n\n例: `<ChangeItems: 1, Increase, 1>`');
                changeItemsTag.insertText = new vscode.SnippetString('ChangeItems: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeItemsTag);

                const selectItemTag = new vscode.CompletionItem('SelectItem', vscode.CompletionItemKind.Keyword);
                selectItemTag.detail = 'アイテム選択の処理';
                selectItemTag.documentation = new vscode.MarkdownString('アイテム選択画面を表示します\n\n例: `<SelectItem: 1, Regular Item>`');
                selectItemTag.insertText = new vscode.SnippetString('SelectItem: ${1:1}, ${2|Regular Item,Key Item|}');
                completions.push(selectItemTag);

                // Input Number
                const inputNumberTag = new vscode.CompletionItem('InputNumber', vscode.CompletionItemKind.Keyword);
                inputNumberTag.detail = '数値入力の処理';
                inputNumberTag.documentation = new vscode.MarkdownString('数値入力の処理を表示します\n\n例: `<InputNumber: 1, 2>` (変数1に桁数2で入力)');
                inputNumberTag.insertText = new vscode.SnippetString('InputNumber: ${1:1}, ${2:2}');
                completions.push(inputNumberTag);

                // Show Scrolling Text
                const scrollingTextTag = new vscode.CompletionItem('ShowScrollingText', vscode.CompletionItemKind.Snippet);
                scrollingTextTag.detail = '文章のスクロール表示';
                scrollingTextTag.documentation = new vscode.MarkdownString('スクロールテキストを表示します\n\n例:\n```\n<ShowScrollingText: 2, OFF>\n文章...\n</ShowScrollingText>\n```');
                scrollingTextTag.insertText = new vscode.SnippetString('ShowScrollingText: ${1:2}, ${2|OFF,ON|}>\n$0\n</ShowScrollingText');
                completions.push(scrollingTextTag);

                // Weapons and Armors
                const changeWeaponsTag = new vscode.CompletionItem('ChangeWeapons', vscode.CompletionItemKind.Keyword);
                changeWeaponsTag.detail = '武器の増減';
                changeWeaponsTag.documentation = new vscode.MarkdownString('武器を増減します\n\n例: `<ChangeWeapons: 1, Increase, 2>`');
                changeWeaponsTag.insertText = new vscode.SnippetString('ChangeWeapons: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeWeaponsTag);

                const changeArmorsTag = new vscode.CompletionItem('ChangeArmors', vscode.CompletionItemKind.Keyword);
                changeArmorsTag.detail = '防具の増減';
                changeArmorsTag.documentation = new vscode.MarkdownString('防具を増減します\n\n例: `<ChangeArmors: 1, Increase, 2>`');
                changeArmorsTag.insertText = new vscode.SnippetString('ChangeArmors: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeArmorsTag);

                // Party
                const changePartyMemberTag = new vscode.CompletionItem('ChangePartyMember', vscode.CompletionItemKind.Keyword);
                changePartyMemberTag.detail = 'メンバーの入れ替え';
                changePartyMemberTag.documentation = new vscode.MarkdownString('パーティメンバーを入れ替えます\n\n例: `<ChangePartyMember: 6, Add, Initialize>`');
                changePartyMemberTag.insertText = new vscode.SnippetString('ChangePartyMember: ${1:1}, ${2|Add,Remove|}');
                completions.push(changePartyMemberTag);

                // Actor Stats
                const changeHpTag = new vscode.CompletionItem('ChangeHp', vscode.CompletionItemKind.Keyword);
                changeHpTag.detail = 'HPの増減';
                changeHpTag.documentation = new vscode.MarkdownString('HPを増減します\n\n例: `<ChangeHp: 1, Increase, 100>`');
                changeHpTag.insertText = new vscode.SnippetString('ChangeHp: ${1:1}, ${2|Increase,Decrease|}, ${3:100}');
                completions.push(changeHpTag);

                const changeMpTag = new vscode.CompletionItem('ChangeMp', vscode.CompletionItemKind.Keyword);
                changeMpTag.detail = 'MPの増減';
                changeMpTag.documentation = new vscode.MarkdownString('MPを増減します\n\n例: `<ChangeMp: 1, Increase, 50>`');
                changeMpTag.insertText = new vscode.SnippetString('ChangeMp: ${1:1}, ${2|Increase,Decrease|}, ${3:50}');
                completions.push(changeMpTag);

                const changeTpTag = new vscode.CompletionItem('ChangeTp', vscode.CompletionItemKind.Keyword);
                changeTpTag.detail = 'TPの増減';
                changeTpTag.documentation = new vscode.MarkdownString('TPを増減します\n\n例: `<ChangeTp: 1, Increase, 20>`');
                changeTpTag.insertText = new vscode.SnippetString('ChangeTp: ${1:1}, ${2|Increase,Decrease|}, ${3:20}');
                completions.push(changeTpTag);

                const changeStateTag = new vscode.CompletionItem('ChangeState', vscode.CompletionItemKind.Keyword);
                changeStateTag.detail = 'ステートの変更';
                changeStateTag.documentation = new vscode.MarkdownString('ステートを変更します\n\n例: `<ChangeState: 1, Add, 1>`');
                changeStateTag.insertText = new vscode.SnippetString('ChangeState: ${1:1}, ${2|Add,Remove|}, ${3:1}');
                completions.push(changeStateTag);

                const recoverAllTag = new vscode.CompletionItem('RecoverAll', vscode.CompletionItemKind.Keyword);
                recoverAllTag.detail = '全回復';
                recoverAllTag.documentation = new vscode.MarkdownString('アクターを全回復します\n\n例: `<RecoverAll: 1>`');
                recoverAllTag.insertText = new vscode.SnippetString('RecoverAll: ${1:1}');
                completions.push(recoverAllTag);

                const changeExpTag = new vscode.CompletionItem('ChangeExp', vscode.CompletionItemKind.Keyword);
                changeExpTag.detail = '経験値の増減';
                changeExpTag.documentation = new vscode.MarkdownString('経験値を増減します\n\n例: `<ChangeExp: 1, Increase, 100>`');
                changeExpTag.insertText = new vscode.SnippetString('ChangeExp: ${1:1}, ${2|Increase,Decrease|}, ${3:100}');
                completions.push(changeExpTag);

                const changeLevelTag = new vscode.CompletionItem('ChangeLevel', vscode.CompletionItemKind.Keyword);
                changeLevelTag.detail = 'レベルの増減';
                changeLevelTag.documentation = new vscode.MarkdownString('レベルを増減します\n\n例: `<ChangeLevel: 1, Increase, 1>`');
                changeLevelTag.insertText = new vscode.SnippetString('ChangeLevel: ${1:1}, ${2|Increase,Decrease|}, ${3:1}');
                completions.push(changeLevelTag);

                const changeSkillTag = new vscode.CompletionItem('ChangeSkill', vscode.CompletionItemKind.Keyword);
                changeSkillTag.detail = 'スキルの増減';
                changeSkillTag.documentation = new vscode.MarkdownString('スキルを増減します\n\n例: `<ChangeSkill: 1, Learn, 5>`');
                changeSkillTag.insertText = new vscode.SnippetString('ChangeSkill: ${1:1}, ${2|Learn,Forget|}, ${3:1}');
                completions.push(changeSkillTag);

                const changeNameTag = new vscode.CompletionItem('ChangeName', vscode.CompletionItemKind.Keyword);
                changeNameTag.detail = '名前の変更';
                changeNameTag.documentation = new vscode.MarkdownString('アクターの名前を変更します\n\n例: `<ChangeName: 1, NewName>`');
                changeNameTag.insertText = new vscode.SnippetString('ChangeName: ${1:1}, $2');
                completions.push(changeNameTag);

                const changeClassTag = new vscode.CompletionItem('ChangeClass', vscode.CompletionItemKind.Keyword);
                changeClassTag.detail = '職業の変更';
                changeClassTag.documentation = new vscode.MarkdownString('職業を変更します\n\n例: `<ChangeClass: 1, 2>`');
                changeClassTag.insertText = new vscode.SnippetString('ChangeClass: ${1:1}, ${2:2}');
                completions.push(changeClassTag);

                const changeNicknameTag = new vscode.CompletionItem('ChangeNickname', vscode.CompletionItemKind.Keyword);
                changeNicknameTag.detail = '二つ名の変更';
                changeNicknameTag.documentation = new vscode.MarkdownString('二つ名を変更します\n\n例: `<ChangeNickname: 1, Nickname>`');
                changeNicknameTag.insertText = new vscode.SnippetString('ChangeNickname: ${1:1}, $2');
                completions.push(changeNicknameTag);

                const changeProfileTag = new vscode.CompletionItem('ChangeProfile', vscode.CompletionItemKind.Keyword);
                changeProfileTag.detail = 'プロフィールの変更';
                changeProfileTag.documentation = new vscode.MarkdownString('プロフィールを変更します\n\n例: `<ChangeProfile: 1, Line1, Line2>`');
                changeProfileTag.insertText = new vscode.SnippetString('ChangeProfile: ${1:1}, $2');
                completions.push(changeProfileTag);

                // Map and Location
                const transferPlayerTag = new vscode.CompletionItem('TransferPlayer', vscode.CompletionItemKind.Keyword);
                transferPlayerTag.detail = '場所移動';
                transferPlayerTag.documentation = new vscode.MarkdownString('場所を移動します\n\n例: `<TransferPlayer: Direct[1][10][20], Retain, Black>`');
                transferPlayerTag.insertText = new vscode.SnippetString('TransferPlayer: Direct[${1:1}][${2:10}][${3:20}], ${4|Retain,Down,Left,Right,Up|}, ${5|Black,White,None|}');
                completions.push(transferPlayerTag);

                const setVehicleLocationTag = new vscode.CompletionItem('SetVehicleLocation', vscode.CompletionItemKind.Keyword);
                setVehicleLocationTag.detail = '乗り物の位置設定';
                setVehicleLocationTag.documentation = new vscode.MarkdownString('乗り物の位置を設定します\n\n例: `<SetVehicleLocation: Boat, Direct[1][10][20]>`');
                setVehicleLocationTag.insertText = new vscode.SnippetString('SetVehicleLocation: ${1|Boat,Ship,Airship|}, Direct[${2:1}][${3:10}][${4:20}]');
                completions.push(setVehicleLocationTag);

                const setEventLocationTag = new vscode.CompletionItem('SetEventLocation', vscode.CompletionItemKind.Keyword);
                setEventLocationTag.detail = 'イベントの位置設定';
                setEventLocationTag.documentation = new vscode.MarkdownString('イベントの位置を設定します\n\n例: `<SetEventLocation: This Event, Direct[10][20], Retain>`');
                setEventLocationTag.insertText = new vscode.SnippetString('SetEventLocation: ${1:This Event}, Direct[${2:10}][${3:20}], ${4|Retain,Down,Left,Right,Up|}');
                completions.push(setEventLocationTag);

                // Weather
                const setWeatherEffectTag = new vscode.CompletionItem('SetWeatherEffect', vscode.CompletionItemKind.Keyword);
                setWeatherEffectTag.detail = '天候の設定';
                setWeatherEffectTag.documentation = new vscode.MarkdownString('天候を設定します\n\n例: `<SetWeatherEffect: Rain, 5, 60, Wait>`');
                setWeatherEffectTag.insertText = new vscode.SnippetString('SetWeatherEffect: ${1|None,Rain,Storm,Snow|}, ${2:5}, ${3:60}');
                completions.push(setWeatherEffectTag);

                // Movie
                const playMovieTag = new vscode.CompletionItem('PlayMovie', vscode.CompletionItemKind.Keyword);
                playMovieTag.detail = 'ムービーの再生';
                playMovieTag.documentation = new vscode.MarkdownString('ムービーを再生します\n\n例: `<PlayMovie: SampleMovie>`');
                playMovieTag.insertText = new vscode.SnippetString('PlayMovie: $1');
                completions.push(playMovieTag);

                // Battle Processing
                const battleProcessingTag = new vscode.CompletionItem('BattleProcessing', vscode.CompletionItemKind.Snippet);
                battleProcessingTag.detail = '戦闘の処理';
                battleProcessingTag.documentation = new vscode.MarkdownString('戦闘の処理を実行します\n\n例:\n```\n<BattleProcessing: 1>\n<IfWin>\n...\n<End>\n```');
                battleProcessingTag.insertText = new vscode.SnippetString('BattleProcessing: ${1:1}>\n<IfWin>\n$2\n<End');
                completions.push(battleProcessingTag);

                const ifWinTag = new vscode.CompletionItem('IfWin', vscode.CompletionItemKind.Keyword);
                ifWinTag.detail = '勝ったとき';
                ifWinTag.documentation = new vscode.MarkdownString('戦闘に勝った時の処理');
                ifWinTag.insertText = 'IfWin';
                completions.push(ifWinTag);

                const ifEscapeTag = new vscode.CompletionItem('IfEscape', vscode.CompletionItemKind.Keyword);
                ifEscapeTag.detail = '逃げたとき';
                ifEscapeTag.documentation = new vscode.MarkdownString('戦闘から逃げた時の処理');
                ifEscapeTag.insertText = 'IfEscape';
                completions.push(ifEscapeTag);

                const ifLoseTag = new vscode.CompletionItem('IfLose', vscode.CompletionItemKind.Keyword);
                ifLoseTag.detail = '負けたとき';
                ifLoseTag.documentation = new vscode.MarkdownString('戦闘に負けた時の処理');
                ifLoseTag.insertText = 'IfLose';
                completions.push(ifLoseTag);

                // Shop Processing
                const shopProcessingTag = new vscode.CompletionItem('ShopProcessing', vscode.CompletionItemKind.Snippet);
                shopProcessingTag.detail = 'ショップの処理';
                shopProcessingTag.documentation = new vscode.MarkdownString('ショップの処理を実行します\n\n例:\n```\n<ShopProcessing>\n<Merchandise: item, 1, standard>\n```');
                shopProcessingTag.insertText = new vscode.SnippetString('ShopProcessing>\n<Merchandise: ${1|item,weapon,armor|}, ${2:1}, ${3:standard}');
                completions.push(shopProcessingTag);

                const merchandiseTag = new vscode.CompletionItem('Merchandise', vscode.CompletionItemKind.Keyword);
                merchandiseTag.detail = '商品';
                merchandiseTag.documentation = new vscode.MarkdownString('ショップの商品を設定します\n\n例: `<Merchandise: item, 1, standard>`');
                merchandiseTag.insertText = new vscode.SnippetString('Merchandise: ${1|item,weapon,armor|}, ${2:1}, ${3:standard}');
                completions.push(merchandiseTag);

                // Screen Control
                const nameInputProcessingTag = new vscode.CompletionItem('NameInputProcessing', vscode.CompletionItemKind.Keyword);
                nameInputProcessingTag.detail = '名前入力の処理';
                nameInputProcessingTag.documentation = new vscode.MarkdownString('名前入力画面を表示します\n\n例: `<NameInputProcessing: 1, 8>`');
                nameInputProcessingTag.insertText = new vscode.SnippetString('NameInputProcessing: ${1:1}, ${2:8}');
                completions.push(nameInputProcessingTag);

                const openMenuScreenTag = new vscode.CompletionItem('OpenMenuScreen', vscode.CompletionItemKind.Keyword);
                openMenuScreenTag.detail = 'メニュー画面を開く';
                openMenuScreenTag.documentation = new vscode.MarkdownString('メニュー画面を開きます');
                openMenuScreenTag.insertText = 'OpenMenuScreen';
                completions.push(openMenuScreenTag);

                const openSaveScreenTag = new vscode.CompletionItem('OpenSaveScreen', vscode.CompletionItemKind.Keyword);
                openSaveScreenTag.detail = 'セーブ画面を開く';
                openSaveScreenTag.documentation = new vscode.MarkdownString('セーブ画面を開きます');
                openSaveScreenTag.insertText = 'OpenSaveScreen';
                completions.push(openSaveScreenTag);

                const gameOverTag = new vscode.CompletionItem('GameOver', vscode.CompletionItemKind.Keyword);
                gameOverTag.detail = 'ゲームオーバー';
                gameOverTag.documentation = new vscode.MarkdownString('ゲームオーバー画面を表示します');
                gameOverTag.insertText = 'GameOver';
                completions.push(gameOverTag);

                const returnToTitleScreenTag = new vscode.CompletionItem('ReturnToTitleScreen', vscode.CompletionItemKind.Keyword);
                returnToTitleScreenTag.detail = 'タイトル画面に戻す';
                returnToTitleScreenTag.documentation = new vscode.MarkdownString('タイトル画面に戻ります');
                returnToTitleScreenTag.insertText = 'ReturnToTitleScreen';
                completions.push(returnToTitleScreenTag);

                // Plugin Command
                const pluginCommandTag = new vscode.CompletionItem('PluginCommand:', vscode.CompletionItemKind.Keyword);
                pluginCommandTag.detail = 'プラグインコマンド';
                pluginCommandTag.documentation = new vscode.MarkdownString('プラグインコマンドを実行します\n\n例: `<PluginCommand: IMPORT_MESSAGE_TO_EVENT>`');
                pluginCommandTag.insertText = new vscode.SnippetString('PluginCommand: $1');
                completions.push(pluginCommandTag);

                // Comment block
                const commentTag = new vscode.CompletionItem('comment', vscode.CompletionItemKind.Snippet);
                commentTag.detail = 'コメントブロック';
                commentTag.insertText = new vscode.SnippetString('comment>\n$0\n</comment');
                commentTag.documentation = new vscode.MarkdownString('コメントブロックを挿入します');
                completions.push(commentTag);

                // Script block
                const scriptTag = new vscode.CompletionItem('script', vscode.CompletionItemKind.Snippet);
                scriptTag.detail = 'スクリプトブロック';
                scriptTag.insertText = new vscode.SnippetString('script>\n$0\n</script');
                scriptTag.documentation = new vscode.MarkdownString('JavaScriptコードを挿入します');
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
    const tagMap: { [key: string]: string } = {
        '<Face': '顔グラフィックを設定します\n\n**使用例:**\n```\n<Face: Actor1(0)>\n今日も一日がんばるぞい！\n```',
        '<WindowPosition': 'ウィンドウ位置を設定します\n\n**使用例:**\n```\n<WindowPosition: Top>  (上)\n<WindowPosition: Middle>  (中)\n<WindowPosition: Bottom>  (下)\n```',
        '<Background': '背景を設定します\n\n**使用例:**\n```\n<Background: Window>  (ウィンドウ)\n<Background: Dim>  (暗く)\n<Background: Transparent>  (透明)\n```',
        '<Name': '名前を設定します\n\n**使用例:**\n```\n<Name: キャラクター名>\n台詞テキスト\n```',
        '<ShowChoices': '選択肢を表示します\n\n**使用例:**\n```\n<ShowChoices>\n<When: はい>\n...\n<When: いいえ>\n...\n<End>\n```',
        '<If': '条件分岐を設定します\n\n**使用例:**\n```\n<If: Switch[1], ON>\n...\n<Else>\n...\n<End>\n```',
        '<Loop': 'ループ処理を開始します\n\n**使用例:**\n```\n<Loop>\n...\n<RepeatAbove>\n```',
        '<BreakLoop': 'ループを中断します',
        '<PlayBGM': 'BGMを演奏します\n\n**使用例:**\n```\n<PlayBGM: Castle1>\n<PlayBGM: Castle2, 50, 80, 30>  (音量, ピッチ, 位相)\n```',
        '<FadeoutBGM': 'BGMをフェードアウトします\n\n**使用例:**\n```\n<FadeoutBGM: 10>  (秒数)\n```',
        '<PlayBGS': 'BGSを演奏します\n\n**使用例:**\n```\n<PlayBGS: City>\n```',
        '<PlaySE': 'SEを演奏します\n\n**使用例:**\n```\n<PlaySE: Attack1>\n<PlaySE: Attack2, 50, 80, 30>  (音量, ピッチ, 位相)\n```',
        '<PlayME': 'MEを演奏します\n\n**使用例:**\n```\n<PlayME: Victory1>\n```',
        '<Wait': 'ウェイトを設定します\n\n**使用例:**\n```\n<Wait: 60>  (60フレーム = 1秒)\n```',
        '<Switch': 'スイッチを操作します\n\n**使用例:**\n```\n<Switch: 1, ON>\n<Switch: 1-10, OFF>\n```',
        '<SelfSwitch': 'セルフスイッチを操作します\n\n**使用例:**\n```\n<SelfSwitch: A, ON>\n<SelfSwitch: B, OFF>\n```',
        '<Set': '変数に値を代入します\n\n**使用例:**\n```\n<Set: 1, 100>\n<Set: 1, V[20]>\n```',
        '<Add': '変数に値を加算します\n\n**使用例:**\n```\n<Add: 1, 10>\n```',
        '<Sub': '変数から値を減算します\n\n**使用例:**\n```\n<Sub: 1, 5>\n```',
        '<Mul': '変数に値を乗算します\n\n**使用例:**\n```\n<Mul: 1, 2>\n```',
        '<Div': '変数を値で除算します\n\n**使用例:**\n```\n<Div: 1, 2>\n```',
        '<ShowPicture': 'ピクチャを表示します\n\n**使用例:**\n```\n<ShowPicture: 1, Castle>\n<ShowPicture: 1, Castle, Scale[50][55]>\n```',
        '<MovePicture': 'ピクチャを移動します\n\n**使用例:**\n```\n<MovePicture: 1, Position[Center][200][300]>\n```',
        '<RotatePicture': 'ピクチャを回転します\n\n**使用例:**\n```\n<RotatePicture: 1, -30>\n```',
        '<TintPicture': 'ピクチャの色調を変更します\n\n**使用例:**\n```\n<TintPicture: 1, ColorTone[0][100][255][50]>\n```',
        '<ErasePicture': 'ピクチャを消去します\n\n**使用例:**\n```\n<ErasePicture: 1>\n```',
        '<FadeOut': '画面をフェードアウトします',
        '<FadeIn': '画面をフェードインします',
        '<CommonEvent': 'コモンイベントを実行します\n\n**使用例:**\n```\n<CommonEvent: 1>\n```',
        '<Label': 'ラベルを設定します\n\n**使用例:**\n```\n<Label: Start>\n```',
        '<JumpToLabel': 'ラベルにジャンプします\n\n**使用例:**\n```\n<JumpToLabel: Start>\n```',
        '<comment': 'コメントブロックを作成します\n\n**使用例:**\n```\n<comment>\nここにコメントを書きます\n</comment>\n```',
        '<script': 'JavaScriptコードを実行します\n\n**使用例:**\n```\n<script>\nconsole.log("Hello!");\n</script>\n```'
    };

    // Check if tag starts with any key in tagMap
    for (const key in tagMap) {
        if (tag.startsWith(key)) {
            return new vscode.MarkdownString(tagMap[key]);
        }
    }
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    if (document.languageId !== 'text2frame') {
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;

        // Check for unclosed angle brackets in tags
        const openBrackets = (text.match(/</g) || []).length;
        const closeBrackets = (text.match(/>/g) || []).length;
        
        if (openBrackets > closeBrackets) {
            const range = new vscode.Range(i, 0, i, text.length);
            const diagnostic = new vscode.Diagnostic(
                range,
                'タグが閉じられていません',
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
        } else if (closeBrackets > openBrackets) {
            const range = new vscode.Range(i, 0, i, text.length);
            const diagnostic = new vscode.Diagnostic(
                range,
                '閉じ括弧が多すぎます',
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
        }

        // Check for empty tags
        if (/<\s*>/.test(text)) {
            const match = text.match(/<\s*>/);
            if (match && match.index !== undefined) {
                const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    '空のタグは使用できません',
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostics.push(diagnostic);
            }
        }
    }

    collection.set(document.uri, diagnostics);
}

export function deactivate() {}
