import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { assetPickerHtml } from './assetPickerHtml';
import { readAudio } from './db/audio';
import { audioBaseName, AudioFolderName } from './db/checks';
import { faceEdit, audioEdit, characterEdit, pictureEdit, AssetEdit } from './db/assetEdit';
import { FACE_COLUMNS, FACE_ROWS } from './db/faces';
import { tr } from './db/lang';

/**
 * 素材を選ぶ画面(タブ「素材を選ぶ」)。顔画像を見て選んだり、音声を試し聞きして選んだりして、
 * 開いたときのテキストのカーソルの行に入れる。行にもうタグがあれば中身を置き換える。
 */

const FOLDERS: AudioFolderName[] = ['bgm', 'bgs', 'me', 'se'];
const THUMB = 72;
type Tab = 'face' | 'character' | 'picture' | AudioFolderName;

interface Target {
    uri: vscode.Uri;
    line: number;
    ctx: DbContext;
}

function audioNames(ctx: DbContext, folder: AudioFolderName): string[] {
    const names = new Set<string>();
    try {
        for (const file of fs.readdirSync(path.join(path.dirname(ctx.dataDir), 'audio', folder))) {
            const base = audioBaseName(file);
            if (base) names.add(base);
        }
    } catch (e) {
        // フォルダが無ければ空
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function registerAssetPicker(context: vscode.ExtensionContext, service: DatabaseService): void {
    let panel: vscode.WebviewPanel | undefined;
    let target: Target | undefined;
    let tab: Tab = 'face';

    const post = (message: unknown): void => { panel?.webview.postMessage(message); };

    const init = (): void => {
        if (!target) return;
        const { ctx } = target;
        const faces = service.faceNames(ctx);
        const owners: Record<string, string> = {};
        for (const name of faces) {
            for (let i = 0; i < FACE_COLUMNS * FACE_ROWS; i++) {
                const owner = ctx.db.faceOwner(name, i);
                if (owner) owners[`${name}(${i})`] = owner;
            }
        }
        const audio: Record<string, string[]> = {};
        for (const folder of FOLDERS) audio[folder] = audioNames(ctx, folder);
        const characters = service.characterNames(ctx);
        const pictures = service.pictureNames(ctx);
        post({ type: 'init', tab, faces, owners, characters, pictures, audio, target: tr(`${path.basename(target.uri.fsPath)} の ${target.line + 1} 行目`, `${path.basename(target.uri.fsPath)} line ${target.line + 1}`) });
    };

    const apply = async (edit: AssetEdit, label: string): Promise<void> => {
        if (!target) return;
        const doc = await vscode.workspace.openTextDocument(target.uri);
        const line = Math.min(target.line, doc.lineCount - 1);
        const we = new vscode.WorkspaceEdit();
        if (edit.kind === 'replace') we.replace(doc.uri, doc.lineAt(line).range, edit.text);
        else we.insert(doc.uri, new vscode.Position(line, 0), edit.text + '\n');
        await vscode.workspace.applyEdit(we);
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
        if (editor) editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        post({ type: 'done', text: tr(`入れました: ${label}`, `Put in: ${label}`) });
    };

    const receive = async (m: any): Promise<void> => {
        if (!m || typeof m !== 'object' || !target) return;
        const { ctx } = target;
        if (m.type === 'ready') {
            init();
        } else if (m.type === 'faces' && typeof m.name === 'string') {
            const uris: string[] = [];
            for (let i = 0; i < FACE_COLUMNS * FACE_ROWS; i++) uris.push(service.faceUri(ctx, m.name, i, THUMB) || '');
            post({ type: 'faces', name: m.name, uris });
        } else if (m.type === 'pickFace' && typeof m.name === 'string' && Number.isInteger(m.index)) {
            const doc = await vscode.workspace.openTextDocument(target.uri);
            const text = doc.lineAt(Math.min(target.line, doc.lineCount - 1)).text;
            await apply(faceEdit(text, m.name, m.index), `<Face: ${m.name}(${m.index})>`);
        } else if (m.type === 'characters' && typeof m.name === 'string') {
            const uris: string[] = [];
            for (let i = 0; i < service.characterCount(m.name); i++) uris.push(service.characterUri(ctx, m.name, i, THUMB) || '');
            post({ type: 'characters', name: m.name, uris });
        } else if (m.type === 'picture' && typeof m.name === 'string') {
            post({ type: 'picture', name: m.name, uri: service.pictureUri(ctx, m.name, THUMB) || '' });
        } else if (m.type === 'pickCharacter' && typeof m.name === 'string' && Number.isInteger(m.index)) {
            const doc = await vscode.workspace.openTextDocument(target.uri);
            const text = doc.lineAt(Math.min(target.line, doc.lineCount - 1)).text;
            await apply(characterEdit(text, m.name, m.index), `<ChangeImage: ${m.name}, ${m.index}>`);
        } else if (m.type === 'pickPicture' && typeof m.name === 'string') {
            const doc = await vscode.workspace.openTextDocument(target.uri);
            const text = doc.lineAt(Math.min(target.line, doc.lineCount - 1)).text;
            await apply(pictureEdit(text, m.name), tr(`ピクチャ ${m.name}`, `Picture ${m.name}`));
        } else if (m.type === 'pickAudio' && FOLDERS.includes(m.folder) && typeof m.name === 'string') {
            const doc = await vscode.workspace.openTextDocument(target.uri);
            const text = doc.lineAt(Math.min(target.line, doc.lineCount - 1)).text;
            await apply(audioEdit(text, m.folder, m.name), `audio/${m.folder}/${m.name}`);
        } else if (m.type === 'play' && Number.isInteger(m.id) && FOLDERS.includes(m.folder) && typeof m.name === 'string') {
            const audio = readAudio(path.join(path.dirname(ctx.dataDir), 'audio'), m.folder, m.name, ctx.db.system.encryptionKey);
            if (audio) post({ type: 'audio', id: m.id, mime: audio.mime, data: audio.data.toString('base64') });
            else post({ type: 'audioError', id: m.id, message: `audio/${m.folder}/${m.name} を読めません。` });
        }
    };

    const open = (which: Tab): void => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'text2frame') {
            vscode.window.showInformationMessage(tr('Text2Frame: 素材を入れたいテキストを開き、入れたい行にカーソルを置いてから実行してください。', 'Text2Frame: Open the text and put the cursor on the line where the asset should go first.'));
            return;
        }
        const ctx = service.forDocument(editor.document);
        if (!ctx) {
            vscode.window.showErrorMessage(tr('Text2Frame: ツクールのプロジェクト(data/System.json)が見つかりません。', 'Text2Frame: No RPG Maker project (data/System.json) was found.'));
            return;
        }
        target = { uri: editor.document.uri, line: editor.selection.active.line, ctx };
        tab = which;
        if (panel) {
            panel.reveal(undefined, false);
            init();
            return;
        }
        panel = vscode.window.createWebviewPanel('text2frameAssets', tr('素材を選ぶ', 'Pick an asset'), { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false }, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: []
        });
        panel.webview.html = assetPickerHtml();
        panel.webview.onDidReceiveMessage((m) => { receive(m); }, null, context.subscriptions);
        panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.pickFace', () => open('face')),
        vscode.commands.registerCommand('text2frame.pickAudio', (folder?: AudioFolderName) => open(folder && FOLDERS.includes(folder) ? folder : 'bgm')),
        vscode.commands.registerCommand('text2frame.pickCharacter', () => open('character')),
        vscode.commands.registerCommand('text2frame.pickPicture', () => open('picture'))
    );
}
