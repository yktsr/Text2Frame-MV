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
            { command: 'text2frame.deployAll', label: 'すべて / All', icon: 'cloud-upload', tooltip: '今の言語フォルダのテキストをすべてゲームに反映します。' }
        ]
    },
    {
        label: 'ゲームから書き出し / Pull from game',
        items: [
            { command: 'text2frame.exportCurrentFile', label: 'このファイル / This file', icon: 'cloud-download', tooltip: '今開いているファイルをゲームの内容で書き出します(テキストは上書き)。' },
            { command: 'text2frame.exportAll', label: 'すべて / All', icon: 'archive', tooltip: 'ゲームの全イベントを今の言語フォルダへ書き出します(テキストは上書き)。' }
        ]
    },
    {
        label: '言語 / Language',
        items: [
            { command: 'text2frame.seedLocale', label: '言語を追加 / Add a language', icon: 'add', tooltip: 'ゲームの内容を今の言語フォルダに複製して、翻訳の着手点を作ります(既存ファイルは残します)。' }
        ]
    },
    {
        label: '上級 / Advanced',
        items: [
            { command: 'text2frame.showCompiledJson', label: 'コンパイル結果を表示 / Show compiled JSON', icon: 'json', tooltip: '今のテキストの変換結果(JSON)を表示します。' },
            { command: 'text2frame.toggleDeployOnSave', label: '保存時に自動反映 切替 / Toggle apply-on-save', icon: 'sync', tooltip: '保存したら自動でゲームに反映する設定を ON / OFF します。' },
            { command: 'text2frame.exportConversationOnly', label: '会話のみ書き出し / Pull conversation only', icon: 'comment-discussion', tooltip: '会話部分だけを *.conversation.txt に書き出します。' }
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
