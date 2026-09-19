import * as vscode from 'vscode';
import { onDidChangePauseAtMarks, pauseAtMarks } from './debugSession';

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

const GROUPS: CommandGroup[] = [
    {
        id: 'everyday',
        label: 'よく使う / Everyday',
        open: true,
        items: [
            { command: 'text2frame.showPreview', label: 'プレビューを開く / Open preview', icon: 'open-preview', tooltip: '今のテキストをツクールのイベント画面の形で表示します。カーソルの行と連動します。' },
            { command: 'text2frame.deployCurrentFile', label: 'ゲームに反映(このファイル) / Apply this file', icon: 'rocket', tooltip: '今開いているテキストをゲームに反映します。' },
            { command: 'text2frame.exportCurrentFile', label: 'ゲームから取り出す(このファイル) / Pull this file', icon: 'cloud-download', tooltip: '今のファイルにゲームの内容を取り込みます(あなたの編集は残し、ゲーム側の変更を反映)。' }
        ]
    },
    {
        id: 'try',
        label: '試す・デバッグ / Try & debug',
        open: true,
        items: [
            { command: 'text2frame.standAtEvent', label: '▶ イベントの前に立つ / Stand in front of the event', icon: 'person', tooltip: '今開いているテキストのイベントの隣まで、テストプレイのプレイヤーを動かします。話しかける・触れるのは自分で行うので、出現条件やトリガーもゲームのとおりに試せます。' },
            { command: 'text2frame.runThisPage', label: '▶ このページをすぐ実行 / Run this page now', icon: 'play-circle', tooltip: '今開いているテキストのページを、テストプレイでそのまま動かします(出現条件は見ません)。コモンイベントのテキストなら、そのコモンイベントを動かします。' },
            { command: 'text2frame.testPlay', label: 'テストプレイ / Test play', icon: 'play', tooltip: 'ゲームを VS Code の中のブラウザでテストプレイします(テストモード)。反映した内容は、ブラウザの再読み込みで効きます。プレイ中のスイッチと変数の値は、データベースの一覧とホバーに出ます。' },
            { command: 'text2frame.openLiveValuesTab', label: 'デバッグメニューを表示 / Show debug menu', icon: 'debug', tooltip: 'テストプレイ中のスイッチ・変数・セルフスイッチ・アイテム・所持金をエディタのタブに並べて見せます。値を書き換えることもできます。' },
            { command: 'text2frame.stopTestPlay', label: 'テストプレイを止める / Stop test play', icon: 'debug-stop', tooltip: 'テストプレイ用のサーバーを止めます。' }
        ]
    },
    {
        id: 'writing',
        label: '書くのを助ける / Writing help',
        items: [
            { command: 'text2frame.pickFace', label: '顔画像を選ぶ / Pick a face', icon: 'account', tooltip: '顔画像を一覧で見て選び、カーソルの行に入れます(行に顔のタグがあれば置き換えます)。' },
            { command: 'text2frame.pickAudio', label: '音を選ぶ / Pick a sound', icon: 'unmute', tooltip: 'BGM・BGS・ME・SE を試し聞きして選び、カーソルの行に入れます(行に同じ種類のタグがあれば置き換えます)。' },
            { command: 'text2frame.snippet.insert', label: 'スニペットを入れる / Insert snippet', icon: 'symbol-snippet', tooltip: '選択肢・条件分岐など、よく使う書き方の型をカーソルの位置に入れます。行の頭で / を打っても候補に出ます。' },
            { command: 'text2frame.snippet.fromSelection', label: '選んだ部分をスニペットにする / Make a snippet', icon: 'add', tooltip: 'エディタで選んだ部分を、あとで呼び出せる型として保存します(ゲームのフォルダの .vscode/text2frame-snippets.json)。' },
            { command: 'text2frame.snippet.edit', label: 'スニペットを編集する / Edit snippets', icon: 'edit', tooltip: '自分で作ったスニペットのファイルを開きます。' }
        ]
    },
    {
        id: 'look',
        label: '調べる / Look around',
        items: [
            { command: 'text2frame.checkProject', label: 'プロジェクト全体を検査 / Check the whole project', icon: 'checklist', tooltip: '全テキストを調べて、書き間違い・無い番号や素材・はみ出し・反映されていない変更などを「問題」パネルに出します。' },
            { command: 'text2frame.showLinks', label: 'イベントのつながりを見る / Show event links', icon: 'type-hierarchy', tooltip: '今のテキスト(またはカーソルの下のスイッチ・コモンイベント)から、呼ぶ先・移動先・変えるスイッチと、それで出てくるページを「呼び出し階層」でたどります。' },
            { command: 'text2frame.showMapGraph', label: 'マップのつながりを図で見る / Show the map graph', icon: 'graph', tooltip: '場所移動でつながっているマップを、丸と矢印の図にしてタブで開きます。丸を押すとそのマップが真ん中になり、矢印を押すと移動している行へ飛びます。' }
        ]
    },
    {
        id: 'all',
        label: 'まとめて反映・取り出す / All files',
        items: [
            { command: 'text2frame.deployAll', label: 'すべてゲームに反映 / Apply all', icon: 'cloud-upload', tooltip: 'テキストのフォルダ(設定 text2frame.textBaseDir)のテキストをすべてゲームに反映します。' },
            { command: 'text2frame.exportAll', label: 'すべてゲームから取り出す / Pull all', icon: 'cloud-download', tooltip: 'テキストのフォルダ(設定 text2frame.textBaseDir)にゲームの内容を取り込みます(編集は残す)。初回はテキスト一式が揃います。' },
            { command: 'text2frame.exportConversationOnly', label: '会話のみ書き出し / Pull conversation only', icon: 'comment-discussion', tooltip: '会話部分だけを *.conversation.txt に書き出します。' },
            { command: 'text2frame.toggleDeployOnSave', label: '保存時に自動反映 切替 / Toggle apply-on-save', icon: 'sync', tooltip: '保存したら自動でゲームに反映する設定を ON / OFF します。' }
        ]
    },
    {
        id: 'advanced',
        label: '上級 / Advanced',
        items: [
            { command: 'text2frame.togglePauseAtMarks', label: '印をつけた行で一時停止する / Pause at marked lines', icon: 'debug-breakpoint', tooltip: 'オンにすると、テキストの行番号の左を押して付けた印(赤い丸)の行で、テストプレイが一時停止します。止まったら、スイッチや変数を見たり、1行ずつ進めたりできます。VS Code の知らせの「続ける」で先へ進みます。オフのときは、印があっても止まりません。', describe: () => (pauseAtMarks() ? 'オン' : 'オフ') },
            { command: 'text2frame.history.show', label: '履歴(前の状態に戻す) / History', icon: 'history', tooltip: '反映・取り出しの前の中身の控えを並べます。右クリックで、その操作の前に戻せます。' },
            { command: 'text2frame.repullOverwrite', label: '全部取り直す(上書き) / Re-pull (overwrite)', icon: 'refresh', tooltip: 'テキストのフォルダ(設定 text2frame.textBaseDir)をゲームの内容で全部上書きします(編集は失われます)。' }
        ]
    }
];

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
            return GROUPS.map((g) => {
                const node = new CmdNode('group', g.label, state(g), g.items);
                // 名前を付けておくと、開き閉じを VS Code が覚える。
                node.id = 'group:' + g.id;
                return node;
            });
        }
        if (element.kind === 'group') {
            return element.children.map((spec) => {
                const node = new CmdNode('command', spec.label, vscode.TreeItemCollapsibleState.None);
                node.id = 'command:' + spec.command;
                node.iconPath = new vscode.ThemeIcon(spec.icon);
                node.tooltip = spec.tooltip;
                if (spec.describe) node.description = spec.describe();
                node.command = { command: spec.command, title: spec.label };
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
        onDidChangePauseAtMarks(() => provider.refresh())
    );
}
