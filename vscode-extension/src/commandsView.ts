import * as vscode from 'vscode';

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
}

interface CommandGroup {
    label: string;
    items: CommandSpec[];
}

const GROUPS: CommandGroup[] = [
    {
        label: 'ゲームに反映 / Apply to game',
        items: [
            { command: 'text2frame.deployCurrentFile', label: 'このファイル / This file', icon: 'rocket', tooltip: '今開いているテキストをゲームに反映します。' },
            { command: 'text2frame.deployAll', label: 'すべて / All', icon: 'cloud-upload', tooltip: 'テキストのフォルダ(設定 text2frame.textBaseDir)のテキストをすべてゲームに反映します。' }
        ]
    },
    {
        label: 'ゲームから取り出す / Pull from game',
        items: [
            { command: 'text2frame.exportCurrentFile', label: 'このファイル / This file', icon: 'cloud-download', tooltip: '今のファイルにゲームの内容を取り込みます(あなたの編集は残し、ゲーム側の変更を反映)。' },
            { command: 'text2frame.exportAll', label: 'すべて / All', icon: 'cloud-download', tooltip: 'テキストのフォルダ(設定 text2frame.textBaseDir)にゲームの内容を取り込みます(編集は残す)。初回はテキスト一式が揃います。' }
        ]
    },
    {
        label: '上級 / Advanced',
        items: [
            { command: 'text2frame.repullOverwrite', label: '全部取り直す(上書き) / Re-pull (overwrite)', icon: 'refresh', tooltip: 'テキストのフォルダ(設定 text2frame.textBaseDir)をゲームの内容で全部上書きします(編集は失われます)。' },
            { command: 'text2frame.showPreview', label: 'プレビューを横に開く / Open preview to the side', icon: 'open-preview', tooltip: '今のテキストをツクールのイベント画面の形で横に表示します。カーソルの行と連動します。' },
            { command: 'text2frame.toggleDeployOnSave', label: '保存時に自動反映 切替 / Toggle apply-on-save', icon: 'sync', tooltip: '保存したら自動でゲームに反映する設定を ON / OFF します。' },
            { command: 'text2frame.exportConversationOnly', label: '会話のみ書き出し / Pull conversation only', icon: 'comment-discussion', tooltip: '会話部分だけを *.conversation.txt に書き出します。' }
        ]
    },
    {
        label: 'デバッグ / Debug',
        items: [
            { command: 'text2frame.testPlay', label: 'テストプレイ / Test play', icon: 'play', tooltip: 'ゲームを VS Code の中のブラウザでテストプレイします(テストモード)。反映した内容は、ブラウザの再読み込みで効きます。プレイ中のスイッチと変数の値は、データベースの一覧とホバーに出ます。' },
            { command: 'text2frame.openLiveValuesTab', label: 'デバッグメニューを表示 / Show debug menu', icon: 'debug', tooltip: 'テストプレイ中のスイッチ・変数・セルフスイッチ・アイテム・所持金をエディタのタブに並べて見せます。値を書き換えることもできます。' },
            { command: 'text2frame.stopTestPlay', label: 'テストプレイを止める / Stop test play', icon: 'debug-stop', tooltip: 'テストプレイ用のサーバーを止めます。' }
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

class CommandsTreeProvider implements vscode.TreeDataProvider<CmdNode> {
    getTreeItem(element: CmdNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CmdNode): CmdNode[] {
        if (!element) {
            return GROUPS.map((g) => new CmdNode('group', g.label, vscode.TreeItemCollapsibleState.Expanded, g.items));
        }
        if (element.kind === 'group') {
            return element.children.map((spec) => {
                const node = new CmdNode('command', spec.label, vscode.TreeItemCollapsibleState.None);
                node.iconPath = new vscode.ThemeIcon(spec.icon);
                node.tooltip = spec.tooltip;
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
        vscode.window.createTreeView('text2frameCommands', { treeDataProvider: provider })
    );
}
