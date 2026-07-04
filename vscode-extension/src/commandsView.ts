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
        label: '現在のファイル / Current File',
        items: [
            { command: 'text2frame.deployCurrentFile', label: 'ゲームに反映 / Deploy', icon: 'rocket', tooltip: '現在のテキストをゲーム(JSON)に反映します。' },
            { command: 'text2frame.exportCurrentFile', label: 'テキストへ書き出し(pull) / Export', icon: 'cloud-download', tooltip: 'ゲーム(JSON)から現在のテキストへ書き出します(上書き)。' },
            { command: 'text2frame.exportConversationOnly', label: '会話のみ書き出し / Conversation Only', icon: 'comment-discussion', tooltip: '会話部分のみを *.conversation.txt に書き出します。' },
            { command: 'text2frame.showCompiledJson', label: 'コンパイル結果を表示 / Show Compiled JSON', icon: 'json', tooltip: '現在のテキストのコンパイル結果(JSON)を表示します。' },
            { command: 'text2frame.toggleDeployOnSave', label: '保存時に自動反映 切替 / Toggle Deploy on Save', icon: 'sync', tooltip: '保存時の自動デプロイを ON / OFF します。' }
        ]
    },
    {
        label: '一括 / Batch',
        items: [
            { command: 'text2frame.deployAll', label: 'すべて反映 / Deploy All', icon: 'cloud-upload', tooltip: 'text/ 配下の front matter 付き .txt をすべてゲームに反映します。' },
            { command: 'text2frame.exportAll', label: 'すべて書き出し / Export All', icon: 'archive', tooltip: 'ゲームの全イベント/コモンを text/<locale>/ へ書き出します。' }
        ]
    },
    {
        label: 'ロケール / Locale',
        items: [
            { command: 'text2frame.seedLocale', label: 'ロケールを複製して着手 / Seed Locale', icon: 'repo-clone', tooltip: 'sourceLocale から targetLocale フォルダへ複製して翻訳の着手点を作ります。' },
            { command: 'text2frame.deployLocale', label: 'ロケールをデプロイ / Deploy Locale', icon: 'globe', tooltip: 'text/<targetLocale>/ を merge(既定)でゲームに反映します。' }
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
