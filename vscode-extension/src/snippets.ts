import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRootFor } from './compiler';
import { readSnippetFile, snippetBody, snippetWord, slashAt, SnippetDef } from './db/fixes';
import { isJapanese, tr } from './db/lang';

/**
 * スニペット(よく使う書き方の型)。行の頭で / を打つと候補に出る。
 * VS Code のスニペットの仕組みには載せない(載せると、文章の中で「ループ」などと打っただけで候補に出て、
 * Enter で入ってしまう)。同梱のものは snippets/defaults.json、利用者が作るものはゲームのフォルダの
 * .vscode/text2frame-snippets.json(同じ形。同じフォルダを使う人と共有できる)。
 */

const SELECTOR: vscode.DocumentSelector = { language: 'text2frame' };
const USER_FILE = path.join('.vscode', 'text2frame-snippets.json');

const readJson = (file: string): unknown => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return undefined;
    }
};

export function registerSnippets(context: vscode.ExtensionContext): void {
    const defaults = readSnippetFile(readJson(path.join(context.extensionPath, 'snippets', isJapanese() ? 'defaults.json' : 'defaults.en.json')), false);

    const userFile = (document?: vscode.TextDocument): string | undefined => {
        const root = workspaceRootFor(document);
        return root ? path.join(root, USER_FILE) : undefined;
    };
    const snippetsFor = (document?: vscode.TextDocument): SnippetDef[] => {
        const file = userFile(document);
        const user = file ? readSnippetFile(readJson(file), true) : [];
        return user.concat(defaults.filter((d) => !user.some((u) => u.name === d.name)));
    };
    const preview = (s: SnippetDef): vscode.MarkdownString => {
        const md = new vscode.MarkdownString();
        if (s.description) md.appendText(s.description + '\n');
        md.appendCodeblock(s.body.join('\n').replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$\{\d+\|([^,|]+)[^}]*\|\}/g, '$1').replace(/\$\d+/g, ''), 'text2frame');
        return md;
    };

    const completion: vscode.CompletionItemProvider = {
        provideCompletionItems(document, position) {
            const slash = slashAt(document.lineAt(position.line).text.slice(0, position.character));
            if (!slash) return undefined;
            const range = new vscode.Range(position.line, slash.start, position.line, position.character);
            return snippetsFor(document).map((s, i) => {
                const item = new vscode.CompletionItem({ label: '/' + s.words[0], description: s.name }, vscode.CompletionItemKind.Snippet);
                item.range = range;
                item.filterText = '/' + s.words.join(' ') + ' ' + s.name;
                item.sortText = String(i).padStart(4, '0');
                item.insertText = new vscode.SnippetString(s.body.join('\n'));
                item.detail = s.user ? tr('自分のスニペット', 'Your snippet') : tr('スニペット', 'Snippet');
                item.documentation = preview(s);
                return item;
            });
        }
    };

    const insert = async (): Promise<void> => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage(tr('Text2Frame: テキストを開いてから実行してください。', 'Text2Frame: Open a text first.'));
            return;
        }
        const pick = await vscode.window.showQuickPick(
            snippetsFor(editor.document).map((s) => ({ label: s.name, description: '/' + s.words[0], detail: s.description, s })),
            { placeHolder: tr('入れるスニペットを選ぶ', 'Pick a snippet to insert'), matchOnDescription: true, matchOnDetail: true }
        );
        if (pick) await editor.insertSnippet(new vscode.SnippetString(pick.s.body.join('\n')));
    };

    const fromSelection = async (): Promise<void> => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showInformationMessage(tr('Text2Frame: スニペットにしたい部分をエディタで選んでから実行してください。', 'Text2Frame: Select the part you want as a snippet first.'));
            return;
        }
        const file = userFile(editor.document);
        if (!file) {
            vscode.window.showErrorMessage(tr('Text2Frame: ゲームのフォルダを開いてから実行してください。', 'Text2Frame: Open the game folder first.'));
            return;
        }
        const word = await vscode.window.showInputBox({
            title: tr('選んだ部分をスニペットにする', 'Make a snippet from the selection'),
            prompt: tr('呼び出す言葉(行の頭で / に続けて打つと候補に出ます)', 'The word to call it (type / and the word at the start of a line)'),
            placeHolder: tr('例: あいさつ', 'e.g. greeting'),
            validateInput: (v) => (snippetWord(v) ? undefined : tr('言葉を入れてください', 'Enter a word'))
        });
        if (!word) return;
        const description = await vscode.window.showInputBox({ title: tr('選んだ部分をスニペットにする', 'Make a snippet from the selection'), prompt: tr('説明(空でもかまいません)', 'Description (may be empty)') });
        if (description === undefined) return;
        const name = snippetWord(word);
        const json = readJson(file);
        const all = json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
        all[name] = { prefix: name, body: snippetBody(editor.document.getText(editor.selection)), description };
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(all, null, 2) + '\n', 'utf8');
        vscode.window.showInformationMessage(
            tr(`Text2Frame: スニペット「/${name}」を作りました。行の頭で /${name} と打つと候補に出ます。`, `Text2Frame: Made the snippet "/${name}". Type /${name} at the start of a line to use it.`),
            tr('スニペットを編集する', 'Edit snippets'))
            .then((p) => { if (p) vscode.commands.executeCommand('text2frame.snippet.edit'); });
    };

    const edit = async (): Promise<void> => {
        const file = userFile(vscode.window.activeTextEditor?.document);
        if (!file) {
            vscode.window.showErrorMessage(tr('Text2Frame: ゲームのフォルダを開いてから実行してください。', 'Text2Frame: Open the game folder first.'));
            return;
        }
        if (!fs.existsSync(file)) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            const example = isJapanese()
                ? { あいさつ: { prefix: 'あいさつ', body: ['<Face: Actor1(0)>', '${1:こんにちは}'], description: '例: 顔付きのあいさつ。${1:…} は、入れたあと最初にカーソルが入る所' } } // lang: keep(日本語のときの見本)
                : { greeting: { prefix: 'greeting', body: ['<Face: Actor1(0)>', '${1:Hello}'], description: 'Example: a greeting with a face. ${1:…} is where the cursor goes first after inserting' } };
            fs.writeFileSync(file, JSON.stringify(example, null, 2) + '\n', 'utf8');
        }
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file));
    };

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(SELECTOR, completion, '/'),
        vscode.commands.registerCommand('text2frame.snippet.insert', insert),
        vscode.commands.registerCommand('text2frame.snippet.fromSelection', fromSelection),
        vscode.commands.registerCommand('text2frame.snippet.edit', edit)
    );
}
