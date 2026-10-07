import * as vscode from 'vscode';
import { tagLines } from './db/tagRefs';
import { findColors, cssColor, describeColor } from './db/colors';

/**
 * 色を指定するタグ(画面の色調変更・ピクチャの色調変更・画面のフラッシュ・ウィンドウカラーの変更)の
 * 値の前に、小さな色見本を出す。ファイルには何も書かない。
 * 見本の色の決め方は db/colors.ts を参照(色調は中間の灰色にかけた色)。
 */

const DEBOUNCE_MS = 200;

export function registerColorSwatches(context: vscode.ExtensionContext): void {
    const swatch = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '',
            width: '0.8em',
            height: '0.8em',
            margin: '0 0.25em 0 0',
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editorWidget.border')
        }
    });

    const update = (editor: vscode.TextEditor): void => {
        const document = editor.document;
        if (document.languageId !== 'text2frame') {
            editor.setDecorations(swatch, []);
            return;
        }
        const lines: string[] = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);
        const decorations: vscode.DecorationOptions[] = [];
        for (const line of tagLines(lines)) {
            for (const c of findColors(lines[line])) {
                decorations.push({
                    range: new vscode.Range(line, c.start, line, c.end),
                    hoverMessage: describeColor(c.kind, c.values),
                    renderOptions: { before: { backgroundColor: cssColor(c.swatch) } }
                });
            }
        }
        editor.setDecorations(swatch, decorations);
    };

    let timer: NodeJS.Timeout | undefined;
    const updateVisibleSoon = (document?: vscode.TextDocument): void => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            for (const editor of vscode.window.visibleTextEditors) {
                if (!document || editor.document === document) update(editor);
            }
        }, DEBOUNCE_MS);
    };

    vscode.window.visibleTextEditors.forEach(update);
    context.subscriptions.push(
        swatch,
        vscode.window.onDidChangeVisibleTextEditors((editors) => editors.forEach(update)),
        vscode.workspace.onDidChangeTextDocument((e) => updateVisibleSoon(e.document)),
        // .txt が front matter を見て text2frame に切り替わったときにも出す。
        vscode.workspace.onDidOpenTextDocument(() => updateVisibleSoon()),
        { dispose: () => clearTimeout(timer) }
    );
}
