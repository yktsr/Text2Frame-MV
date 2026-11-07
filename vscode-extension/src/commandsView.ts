import * as vscode from 'vscode';
import { deployOnSave, onDidChangeDeployOnSave } from './deploy';
import { onDidChangePauseAtMarks, pauseAtMarks } from './debugSession';
import { strategySetting } from './compiler';
import { tr } from './db/lang';
import { allSettingsQuery } from './settingsLinks';

/**
 * Activity Bar "Commands" panel — a static, grouped, clickable list of the extension's
 * actions (LaTeX Workshop style). Each leaf binds to an existing command id, so clicking
 * it simply runs that command; no new command handlers are introduced here.
 */

interface CommandSpec {
    command: string;
    label: string;
    icon: string;
    tooltip: string;
    /** コマンドに渡すもの(設定を名指しで開くときの検索語など)。 */
    args?: unknown[];
    /** 名前の横に出す今の状態(オン・オフなど)。 */
    describe?: () => string;
}

interface CommandGroup {
    /** 開き閉じを覚えさせるための名前。 */
    id: string;
    label: string;
    /** 最初から開いておくか。 */
    open?: boolean;
    items: CommandSpec[];
}

/** 今の反映のしかた。ボタンの横に出して、押す前に分かるようにする。 */
const applyHow = (): string =>
    (strategySetting() === 'overwrite' ? tr('上書き', 'Overwrite') : tr('統合', 'Merge'));

/* 設定は VS Code の設定画面にあり、そこへ辿り着くのが分かりにくい。
 * ここから一息で開ける。合い言葉の作り方は、vscode に依存しない
 * src/settingsLinks.ts が持っている。 */
function settingsGroup(): CommandGroup {
    return {
        id: 'settings',
        label: tr('設定', 'Settings'),
        items: [
            {
                command: 'workbench.action.openSettings',
                args: [allSettingsQuery()],
                icon: 'settings-gear',
                label: tr('すべての設定', 'All settings'),
                tooltip: tr('この拡張の設定をまとめて開きます。', 'Opens every setting of this extension.')
            }
        ]
    };
}

/** 名前と吹き出しは、ツリーを作るときに今の言語で選ぶ。 */
function groups(): CommandGroup[] {
    return [
        {
            id: 'everyday',
            label: tr('よく使う', 'Everyday'),
            open: true,
            items: [
                {
                    command: 'text2frame.showPreview', icon: 'open-preview',
                    label: tr('プレビューを開く', 'Open preview'),
                    tooltip: tr('今のテキストをツクールのイベント画面の形で表示します。カーソルの行と連動します。', 'Shows the current text the way RPG Maker\'s event editor would. Follows the cursor line.')
                },
                {
                    command: 'text2frame.deployCurrentFile', icon: 'rocket',
                    label: tr('ゲームに反映(このファイル)', 'Apply this file'),
                    tooltip: tr('今開いているテキストをゲームに反映します。しかたは設定「反映のしかた」で決まり、横に出ています。', 'Applies the open text to the game. How it does that comes from the setting "How to apply", shown beside it.'),
                    describe: () => applyHow()
                },
                {
                    command: 'text2frame.exportCurrentFile', icon: 'cloud-download',
                    label: tr('ゲームから取り出す(このファイル)', 'Pull this file'),
                    tooltip: tr('今のファイルにゲームの内容を取り込みます(あなたの編集は残し、ゲーム側の変更を反映)。', 'Brings the game\'s contents into this file (your edits stay; changes made in the game come in).'),
                    describe: () => tr('統合', 'Merge')
                },
                {
                    command: 'text2frame.toggleDeployOnSave', icon: 'sync',
                    label: tr('保存時に自動反映', 'Apply on save'),
                    tooltip: tr('保存したら自動でゲームに反映するかを切り替えます。今どちらかは横に出ています(画面左下にも出ます)。', 'Switches whether saving applies to the game. Which it is now shows beside it, and at the bottom left of the window.'),
                    describe: () => (deployOnSave() ? tr('オン', 'On') : tr('オフ', 'Off'))
                },
                {
                    command: 'text2frame.deployCurrentFileOverwrite', icon: 'arrow-up',
                    label: tr('テキストの内容でゲームを上書き', 'Overwrite the game with this text'),
                    tooltip: tr('設定を変えずに、この1回だけ上書きで反映します。ツクール側でこのページに加えた変更は失われます(確認が出ます)。', 'Applies with overwrite just this once, without changing the setting. Changes made to that page in RPG Maker are lost; it asks first.')
                },
                {
                    command: 'text2frame.exportCurrentFileOverwrite', icon: 'arrow-down',
                    label: tr('ゲームの内容でテキストを上書き', 'Overwrite this text from the game'),
                    tooltip: tr('このテキストをゲームの内容で作り直します。テキストの編集は失われます(確認が出ます)。', 'Rebuilds this text from the game\'s contents. Your edits to the text are lost; it asks first.')
                }
            ]
        },
        {
            id: 'try',
            label: tr('試す・デバッグ', 'Try & debug'),
            open: true,
            items: [
                {
                    command: 'text2frame.standAtEvent', icon: 'person',
                    label: tr('▶ イベントの前に立つ', '▶ Stand in front of the event'),
                    tooltip: tr('今開いているテキストのイベントの隣まで、テストプレイのプレイヤーを動かします。話しかける・触れるのは自分で行うので、出現条件やトリガーもゲームのとおりに試せます。', 'Moves the test-play player next to the event of the open text. You talk to it or touch it yourself, so its conditions and trigger work just as in the game.')
                },
                {
                    command: 'text2frame.runThisPage', icon: 'play-circle',
                    label: tr('▶ このページをすぐ実行', '▶ Run this page now'),
                    tooltip: tr('今開いているテキストのページを、テストプレイでそのまま動かします(出現条件は見ません)。コモンイベントのテキストなら、そのコモンイベントを動かします。', 'Runs the page of the open text in the test play right away (its conditions are not checked). For a common event text, runs that common event.')
                },
                {
                    command: 'text2frame.testPlay', icon: 'play',
                    label: tr('テストプレイ', 'Test play'),
                    tooltip: tr('ゲームを VS Code の中のブラウザでテストプレイします(テストモード)。反映した内容は、ブラウザの再読み込みで効きます。プレイ中のスイッチと変数の値は、データベースの一覧とホバーに出ます。', 'Test plays the game in a browser inside VS Code (test mode). Applied changes take effect when the browser reloads. Switch and variable values show in the database list and in hovers while playing.')
                },
                {
                    command: 'text2frame.importSaves', icon: 'cloud-download',
                    label: tr('ツクールのセーブを取り込む', 'Bring in the RPG Maker saves'),
                    tooltip: tr('ツクールでテストプレイして作ったセーブ(ゲームのフォルダの save/)を、VS Code のテストプレイでも使えるようにします。置き場所が別なので、取り込まないと見えません。', 'Makes the saves you made while test playing in RPG Maker (save/ in the game folder) usable in the VS Code test play too. They are kept in a different place, so they are not visible until you bring them in.')
                },
                {
                    command: 'text2frame.loadSave', icon: 'debug-restart',
                    label: tr('セーブから再開する', 'Resume from a save'),
                    tooltip: tr('テストプレイのセーブを選んで、そこから続けます。発生条件を整えたセーブを作っておくと、そのイベントをそのまま試せます。', 'Pick a save of the test play and continue from it. If you keep a save with the conditions already set up, you can try that event as it is.')
                },
                {
                    command: 'text2frame.pickTestPlayPlugins', icon: 'checklist',
                    label: tr('テストプレイで切るプラグインを選ぶ', 'Choose the plugins to turn off for test play'),
                    tooltip: tr('ツクール本体の中でだけ動く作りのプラグインは、ブラウザで動かすテストプレイを止めてしまうことがあります。そのゲームのプラグインの一覧から、テストプレイのときだけ切るものに印を付けられます。ゲームのフォルダは書き換えません。', 'A plugin that only runs inside RPG Maker itself can stop a browser test play. Check the ones to turn off for test play only, from the game\'s own plugin list. The game folder is not changed.')
                },
                {
                    command: 'text2frame.openLiveValuesTab', icon: 'debug',
                    label: tr('デバッグメニューを表示', 'Show debug menu'),
                    tooltip: tr('テストプレイ中のスイッチ・変数・セルフスイッチ・アイテム・所持金をエディタのタブに並べて見せます。値を書き換えることもできます。', 'Lists the switches, variables, self switches, items and gold of the running test play in an editor tab. You can change the values too.')
                },
                {
                    command: 'text2frame.stopTestPlay', icon: 'debug-stop',
                    label: tr('テストプレイを止める', 'Stop test play'),
                    tooltip: tr('テストプレイ用のサーバーを止めます。', 'Stops the test play server.')
                }
            ]
        },
        {
            id: 'writing',
            label: tr('書くのを助ける', 'Writing help'),
            items: [
                {
                    command: 'text2frame.pickFace', icon: 'account',
                    label: tr('画像を選ぶ(顔・キャラ・ピクチャ)', 'Pick an image (face, character, picture)'),
                    tooltip: tr('顔画像・キャラ画像・ピクチャを一覧で見て選び、カーソルの行に入れます(行に同じ種類のタグがあれば置き換えます)。タブで切り替えます。', 'Browse faces, character images and pictures, and put the one you pick on the cursor line (a tag of the same kind on that line is replaced). Switch with the tabs.')
                },
                {
                    command: 'text2frame.pickAudio', icon: 'unmute',
                    label: tr('音を選ぶ', 'Pick a sound'),
                    tooltip: tr('BGM・BGS・ME・SE を試し聞きして選び、カーソルの行に入れます(行に同じ種類のタグがあれば置き換えます)。', 'Listen to BGM, BGS, ME and SE, and put the one you pick on the cursor line (a tag of the same kind on that line is replaced).')
                },
                {
                    command: 'text2frame.snippet.insert', icon: 'symbol-snippet',
                    label: tr('スニペットを入れる', 'Insert snippet'),
                    tooltip: tr('選択肢・条件分岐など、よく使う書き方の型をカーソルの位置に入れます。行の頭で / を打っても候補に出ます。', 'Inserts a ready-made pattern such as choices or a conditional branch at the cursor. Typing / at the start of a line offers them too.')
                },
                {
                    command: 'text2frame.snippet.fromSelection', icon: 'add',
                    label: tr('選んだ部分をスニペットにする', 'Make a snippet'),
                    tooltip: tr('エディタで選んだ部分を、あとで呼び出せる型として保存します(ゲームのフォルダの .vscode/text2frame-snippets.json)。', 'Saves the selected text as a pattern you can insert later (.vscode/text2frame-snippets.json in the game folder).')
                },
                {
                    command: 'text2frame.snippet.edit', icon: 'edit',
                    label: tr('スニペットを編集する', 'Edit snippets'),
                    tooltip: tr('自分で作ったスニペットのファイルを開きます。', 'Opens the file of the snippets you made.')
                }
            ]
        },
        {
            id: 'look',
            label: tr('調べる', 'Look around'),
            items: [
                {
                    command: 'text2frame.checkProject', icon: 'checklist',
                    label: tr('プロジェクト全体を検査', 'Check the whole project'),
                    tooltip: tr('全テキストを調べて、書き間違い・無い番号や素材・はみ出し・反映されていない変更などを「問題」パネルに出します。', 'Checks every text and lists typos, missing ids and assets, overflowing lines, unapplied changes and so on in the Problems panel.')
                },
                {
                    command: 'text2frame.showMapGraph', icon: 'graph',
                    label: tr('マップのつながりを図で見る', 'Show the map graph'),
                    tooltip: tr('場所移動でつながっているマップを、丸と矢印の図にしてタブで開きます。丸を押すとそのマップが真ん中になり、矢印を押すと移動している行へ飛びます。', 'Opens a tab that draws the maps joined by Transfer Player as circles and arrows. Click a circle to center that map, or an arrow to jump to the transfer line.')
                }
            ]
        },
        {
            id: 'all',
            label: tr('まとめて反映・取り出す', 'All files'),
            items: [
                {
                    command: 'text2frame.deployAll', icon: 'cloud-upload',
                    label: tr('すべてゲームに反映', 'Apply all'),
                    tooltip: tr('テキストのフォルダ(設定 text2frame.textBaseDir)のテキストをすべてゲームに反映します。', 'Applies every text in the text folder (setting text2frame.textBaseDir) to the game.')
                },
                {
                    command: 'text2frame.exportAll', icon: 'cloud-download',
                    label: tr('すべてゲームから取り出す', 'Pull all'),
                    tooltip: tr('テキストのフォルダ(設定 text2frame.textBaseDir)にゲームの内容を取り込みます(編集は残す)。初回はテキスト一式が揃います。', 'Brings the game\'s contents into the text folder (setting text2frame.textBaseDir), keeping your edits. The first time, this creates the whole set of texts.')
                },
                {
                    command: 'text2frame.exportConversationOnly', icon: 'comment-discussion',
                    label: tr('会話のみ書き出し', 'Pull conversation only'),
                    tooltip: tr('会話部分だけを *.conversation.txt に書き出します。', 'Writes only the conversation to *.conversation.txt.')
                },
            ]
        },
        {
            id: 'advanced',
            label: tr('上級', 'Advanced'),
            items: [
                {
                    command: 'text2frame.togglePauseAtMarks', icon: 'debug-breakpoint',
                    label: tr('印をつけた行で一時停止する', 'Pause at marked lines'),
                    tooltip: tr('オンにすると、テキストの行番号の左を押して付けた印(赤い丸)の行で、テストプレイが一時停止します。止まったら、スイッチや変数を見たり、1行ずつ進めたりできます。VS Code の知らせの「続ける」で先へ進みます。オフのときは、印があっても止まりません。', 'When on, the test play pauses at lines you marked by clicking left of the line number (the red dots). While paused you can look at switches and variables or step line by line; "Continue" in the VS Code notification goes on. When off, marks do not stop the game.'),
                    describe: () => (pauseAtMarks() ? tr('オン', 'On') : tr('オフ', 'Off'))
                },
                {
                    command: 'text2frame.history.show', icon: 'history',
                    label: tr('編集履歴を表示する', 'Show the edit history'),
                    tooltip: tr('反映・取り出しの前の中身の控えを並べます。行の「巻き戻す」で、その操作の直前まで戻せます(そのあとの操作も一緒に取り消され、ゲームのデータが戻るページはテキストもそろえます)。', 'Lists the copies kept before each apply and pull. Rewind on a row brings everything back to just before that operation (later operations are undone too, and pages whose game data goes back get their texts rebuilt to match).')
                },
                {
                    command: 'text2frame.repullOverwrite', icon: 'refresh',
                    label: tr('全部取り直す(上書き)', 'Re-pull (overwrite)'),
                    tooltip: tr('テキストのフォルダ(設定 text2frame.textBaseDir)をゲームの内容で全部上書きします(編集は失われます)。', 'Overwrites the whole text folder (setting text2frame.textBaseDir) with the game\'s contents (your edits are lost).')
                }
            ]
        },
        settingsGroup()
    ];
}

class CmdNode extends vscode.TreeItem {
    constructor(
        public readonly kind: 'group' | 'command',
        label: string,
        collapsible: vscode.TreeItemCollapsibleState,
        public readonly children: CommandSpec[] = []
    ) {
        super(label, collapsible);
        this.contextValue = 'text2frame.commands.' + kind;
    }
}

const state = (group: CommandGroup): vscode.TreeItemCollapsibleState =>
    (group.open ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);

class CommandsTreeProvider implements vscode.TreeDataProvider<CmdNode> {
    private readonly changed = new vscode.EventEmitter<CmdNode | undefined>();
    readonly onDidChangeTreeData = this.changed.event;

    refresh(): void {
        this.changed.fire(undefined);
    }

    getTreeItem(element: CmdNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CmdNode): CmdNode[] {
        if (!element) {
            return groups().map((g) => {
                const node = new CmdNode('group', g.label, state(g), g.items);
                // 名前を付けておくと、開き閉じを VS Code が覚える。
                node.id = 'group:' + g.id;
                return node;
            });
        }
        if (element.kind === 'group') {
            return element.children.map((spec) => {
                const node = new CmdNode('command', spec.label, vscode.TreeItemCollapsibleState.None);
                // 同じコマンドを渡すものだけ変えて出せるので、名前には渡すものまで含める。
                node.id = 'command:' + spec.command + (spec.args ? ':' + String(spec.args[0]) : '');
                node.iconPath = new vscode.ThemeIcon(spec.icon);
                node.tooltip = spec.tooltip;
                if (spec.describe) node.description = spec.describe();
                node.command = { command: spec.command, title: spec.label, arguments: spec.args };
                return node;
            });
        }
        return [];
    }
}

/** Register the "Commands" panel in the Text2Frame activity-bar container. */
export function registerCommandsView(context: vscode.ExtensionContext): void {
    const provider = new CommandsTreeProvider();
    context.subscriptions.push(
        vscode.window.createTreeView('text2frameCommands', { treeDataProvider: provider }),
        onDidChangePauseAtMarks(() => provider.refresh()),
        onDidChangeDeployOnSave(() => provider.refresh()),
        /* ボタンの横に出している今の状態(反映のしかた)は、設定が変わったら描き直す。
         * 聞いていないと、設定を直してもボタンが古いことを言い続ける。 */
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('text2frame.strategy')) provider.refresh();
        })
    );
}
