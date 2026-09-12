import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from './dbService';
import { workspaceRootFor } from './compiler';
import { KINDS, DbKind, padId } from './db/database';
import { scanLines } from './db/tagRefs';

/**
 * サイドバーの「データベース」。スイッチ・変数・マップ…を番号と名前で並べる。読むだけ。
 * クリックで開いているテキストのカーソル位置に番号を入れ、右クリックで
 * 「その番号として使っている箇所」を探せる(文字列の 79 ではなく、スイッチ79として)。
 */

type Node =
    | { type: 'kind'; kind: DbKind }
    | { type: 'entry'; kind: DbKind; id: number; name: string };

class DatabaseTreeProvider implements vscode.TreeDataProvider<Node> {
    private readonly emitter = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this.emitter.event;

    constructor(private readonly service: DatabaseService) {}

    refresh(): void {
        this.emitter.fire();
    }

    getChildren(node?: Node): Node[] {
        const ctx = this.service.forDocument(vscode.window.activeTextEditor?.document);
        if (!ctx) return [];
        if (!node) return KINDS.filter((kind) => ctx.db.max(kind) > 0).map((kind) => ({ type: 'kind', kind }));
        if (node.type !== 'kind') return [];
        return ctx.db.entries(node.kind).map((e) => ({ type: 'entry', kind: node.kind, id: e.id, name: e.name }));
    }

    getTreeItem(node: Node): vscode.TreeItem {
        const ctx = this.service.forDocument(vscode.window.activeTextEditor?.document);
        if (node.type === 'kind') {
            const item = new vscode.TreeItem(ctx ? ctx.db.label(node.kind) : node.kind, vscode.TreeItemCollapsibleState.Collapsed);
            item.description = ctx ? String(ctx.db.max(node.kind)) : undefined;
            item.contextValue = 'text2frame.dbKind';
            return item;
        }
        const item = new vscode.TreeItem(`${padId(node.id)} ${node.name || '(名前なし)'}`, vscode.TreeItemCollapsibleState.None);
        const same = ctx ? ctx.db.sameName(node.kind, node.id) : [];
        if (same.length) {
            // 同じ名前が他の番号にも付いている。名前だけで選ぶと取り違えるので印をつける。
            item.description = `同名 ×${same.length + 1}`;
            item.tooltip = `同じ名前: ${same.map(padId).join(', ')}`;
        }
        item.contextValue = 'text2frame.dbEntry';
        item.command = { command: 'text2frame.db.insert', title: '番号を挿入', arguments: [node] };
        return item;
    }
}

/** 最後に使っていたテキストのエディタ。ツリーをクリックしてもエディタは閉じないので、それを使う。 */
function targetEditor(): vscode.TextEditor | undefined {
    const active = vscode.window.activeTextEditor;
    if (active && active.document.languageId === 'text2frame') return active;
    return vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'text2frame');
}

async function insertId(node: Node): Promise<void> {
    if (node.type !== 'entry') return;
    const editor = targetEditor();
    if (!editor) {
        vscode.window.showInformationMessage('Text2Frame: 番号を入れるテキストを開いてください。');
        return;
    }
    await editor.edit((b) => editor.selections.forEach((s) => b.replace(s, String(node.id))));
    await vscode.window.showTextDocument(editor.document, editor.viewColumn);
}

async function findUsages(node: Node, service: DatabaseService): Promise<void> {
    if (node.type !== 'entry') return;
    const root = workspaceRootFor(targetEditor()?.document);
    const ctx = root ? service.forRoot(root) : undefined;
    if (!root || !ctx) return;
    const textBase = vscode.workspace.getConfiguration('text2frame').get<string>('textBaseDir', 'text') || 'text';
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(vscode.Uri.file(path.join(root, textBase)), '**/*.{txt,t2f,text2frame}'));

    const picks: Array<vscode.QuickPickItem & { uri: vscode.Uri; line: number; start: number; end: number }> = [];
    for (const uri of files) {
        let text: string;
        try { text = fs.readFileSync(uri.fsPath, 'utf8'); } catch (e) { continue; }
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        for (const ref of scanLines(lines)) {
            if (ref.kind !== node.kind || node.id < ref.id || node.id > (ref.endId ?? ref.id)) continue;
            picks.push({
                label: `${path.relative(root, uri.fsPath)}:${ref.line + 1}`,
                description: lines[ref.line].trim(),
                uri, line: ref.line, start: ref.start, end: ref.end
            });
        }
    }
    const title = `${ctx.db.label(node.kind)} ${padId(node.id)} ${node.name || '(名前なし)'}`;
    if (picks.length === 0) {
        vscode.window.showInformationMessage(`Text2Frame: ${title} を使っているテキストはありません。`);
        return;
    }
    const pick = await vscode.window.showQuickPick(picks.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })), {
        title: `${title} を使っている箇所 (${picks.length}件)`,
        matchOnDescription: true
    });
    if (!pick) return;
    const doc = await vscode.workspace.openTextDocument(pick.uri);
    const range = new vscode.Range(pick.line, pick.start, pick.line, pick.end);
    await vscode.window.showTextDocument(doc, { selection: range });
}

export function registerDatabaseView(context: vscode.ExtensionContext, service: DatabaseService): void {
    const provider = new DatabaseTreeProvider(service);
    context.subscriptions.push(
        vscode.window.createTreeView('text2frameDatabase', { treeDataProvider: provider }),
        vscode.commands.registerCommand('text2frame.db.insert', (node: Node) => insertId(node)),
        vscode.commands.registerCommand('text2frame.db.findUsages', (node: Node) => findUsages(node, service)),
        vscode.commands.registerCommand('text2frame.db.refresh', () => provider.refresh()),
        service.onDidChange(() => provider.refresh()),
        // 別のプロジェクトのテキストに切り替えたら、そのプロジェクトのデータベースを出す。
        vscode.window.onDidChangeActiveTextEditor((e) => { if (e && e.document.languageId === 'text2frame') provider.refresh(); })
    );
}
