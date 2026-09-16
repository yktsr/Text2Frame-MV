import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRootFor, dataDirFor } from './compiler';
import { GameDatabase, DATABASE_FILES } from './db/database';
import { readFaceSheet, readIconSheet, cropFace, cropIcon, iconCount, pngDataUri, listFaceNames } from './db/faces';
import { decodePng, Rgba } from './db/png';
import { MapEvent } from './db/describe';
import { eventSelfSwitchLetters } from './db/selfSwitchRefs';
import { summarizePages } from './db/eventPages';

/**
 * データベースと顔画像の置き場。名前の表示・ホバー・警告・補完・一覧・プレビューが共有する。
 *
 * プロジェクト(data フォルダ)ごとに1度だけ読み、ファイルが変わったら読み直して
 * onDidChange で知らせる。ツクールでデータベースを保存すると、開いたままの表示が追従する。
 * 反映のたびに書き換わる Map###.json は見ない(名前の出どころではないので)。
 */
export interface DbContext {
    db: GameDatabase;
    /** プロジェクトの場所(data フォルダを見つけたフォルダ)。 */
    root: string;
    dataDir: string;
    imgDir: string;
}

export class DatabaseService implements vscode.Disposable {
    private readonly dbs = new Map<string, GameDatabase>();
    private readonly sheets = new Map<string, Rgba | null>();
    private readonly faceUris = new Map<string, string | null>();
    private readonly mapEventCache = new Map<string, { mtime: number; events: Array<MapEvent | null> }>();
    /** 文書のフォルダ → そこから上へたどって見つけたプロジェクト(無ければ null)。 */
    private readonly projectOf = new Map<string, string | null>();
    private readonly watchers = new Map<string, vscode.Disposable[]>();
    private readonly emitter = new vscode.EventEmitter<string>();
    /** 読み直したプロジェクトの data フォルダ。 */
    readonly onDidChange = this.emitter.event;

    /**
     * 文書が属するプロジェクトのデータベース。ツクールのプロジェクトでなければ undefined。
     * 文書のフォルダから上へたどり、data/System.json があるいちばん近いフォルダをプロジェクトとする
     * (リポジトリの中にゲームのプロジェクトを置いて、リポジトリごと開いている場合もあるので)。
     * 見つからなければ、開いているフォルダ(ワークスペース)をプロジェクトとみなす。
     */
    forDocument(document?: vscode.TextDocument): DbContext | undefined {
        if (document && document.uri.scheme === 'file') {
            const from = path.dirname(document.uri.fsPath);
            if (!this.projectOf.has(from)) {
                let found: string | null = null;
                for (let dir = from; ; dir = path.dirname(dir)) {
                    if (fs.existsSync(path.join(dataDirFor(dir), 'System.json'))) { found = dir; break; }
                    if (path.dirname(dir) === dir) break;
                }
                this.projectOf.set(from, found);
            }
            const project = this.projectOf.get(from);
            const ctx = project ? this.forRoot(project) : undefined;
            if (ctx) return ctx;
        }
        const root = workspaceRootFor(document);
        return root ? this.forRoot(root) : undefined;
    }

    forRoot(root: string): DbContext | undefined {
        const dataDir = dataDirFor(root);
        if (!fs.existsSync(path.join(dataDir, 'System.json'))) return undefined;
        let db = this.dbs.get(dataDir);
        if (!db) {
            db = GameDatabase.load(dataDir);
            this.dbs.set(dataDir, db);
            this.watch(dataDir);
        }
        return { db, root, dataDir, imgDir: path.join(path.dirname(dataDir), 'img') };
    }

    /**
     * マップ上のイベントの名前と座標(添字がイベント ID。無いイベントは null)。マップが読めなければ undefined。
     * Map###.json は反映のたびに書き換わるので監視はせず、更新時刻が変わっていたら読み直す。
     */
    mapEvents(ctx: DbContext, mapId: number): Array<MapEvent | null> | undefined {
        if (!Number.isInteger(mapId) || mapId <= 0) return undefined;
        const file = path.join(ctx.dataDir, 'Map' + String(mapId).padStart(3, '0') + '.json');
        let mtime: number;
        try { mtime = fs.statSync(file).mtimeMs; } catch (e) { return undefined; }
        const hit = this.mapEventCache.get(file);
        if (hit && hit.mtime === mtime) return hit.events;
        let events: Array<MapEvent | null>;
        try {
            const json = JSON.parse(fs.readFileSync(file, 'utf8'));
            events = Array.isArray(json && json.events)
                ? json.events.map((e: any) => (e ? {
                    name: typeof e.name === 'string' ? e.name : '',
                    x: Number(e.x) || 0,
                    y: Number(e.y) || 0,
                    selfSwitches: eventSelfSwitchLetters(e),
                    pages: Array.isArray(e.pages) ? e.pages.length : 0,
                    pageSummaries: summarizePages(e),
                    pageEmpty: (Array.isArray(e.pages) ? e.pages : []).map((p: any) => !(p && Array.isArray(p.list) && p.list.length > 1))
                } : null))
                : [];
        } catch (e) {
            return undefined;
        }
        this.mapEventCache.set(file, { mtime, events });
        return events;
    }

    faceSheet(ctx: DbContext, faceName: string): Rgba | undefined {
        const key = ctx.imgDir + '\u0000' + faceName;
        if (!this.sheets.has(key)) {
            let sheet: Rgba | undefined;
            try {
                const png = readFaceSheet(ctx.imgDir, faceName, ctx.db.system.encryptionKey);
                sheet = png ? decodePng(png) : undefined;
            } catch (e) {
                sheet = undefined;
            }
            this.sheets.set(key, sheet || null);
        }
        return this.sheets.get(key) || undefined;
    }

    /** 1コマを切り出して縮めた PNG の data URI。ホバー・補完・プレビューに貼る。 */
    faceUri(ctx: DbContext, faceName: string, index: number, displaySize = 96): string | undefined {
        const key = ctx.imgDir + '\u0000' + faceName + '\u0000' + index + '\u0000' + displaySize;
        if (!this.faceUris.has(key)) {
            const sheet = this.faceSheet(ctx, faceName);
            const png = sheet ? cropFace(sheet, index, ctx.db.system.faceSize, displaySize) : undefined;
            this.faceUris.set(key, png ? pngDataUri(png) : null);
        }
        return this.faceUris.get(key) || undefined;
    }

    /** アイコン画像(img/system/IconSet)。無い・読めなければ undefined。 */
    iconSheet(ctx: DbContext): Rgba | undefined {
        const key = ctx.imgDir + '\u0000' + 'system/IconSet';
        if (!this.sheets.has(key)) {
            let sheet: Rgba | undefined;
            try {
                const png = readIconSheet(ctx.imgDir, ctx.db.system.encryptionKey);
                sheet = png ? decodePng(png) : undefined;
            } catch (e) {
                sheet = undefined;
            }
            this.sheets.set(key, sheet || null);
        }
        return this.sheets.get(key) || undefined;
    }

    /** アイコンの数。アイコン画像が無い・読めなければ undefined(番号の範囲を確かめない)。 */
    iconCount(ctx: DbContext): number | undefined {
        const sheet = this.iconSheet(ctx);
        return sheet ? iconCount(sheet, ctx.db.system.iconSize) : undefined;
    }

    /** アイコン1つの PNG の data URI。ホバーに貼る。 */
    iconUri(ctx: DbContext, index: number, displaySize = 32): string | undefined {
        const key = ctx.imgDir + '\u0000' + 'icon' + '\u0000' + index + '\u0000' + displaySize;
        if (!this.faceUris.has(key)) {
            const sheet = this.iconSheet(ctx);
            const png = sheet ? cropIcon(sheet, index, ctx.db.system.iconSize, displaySize) : undefined;
            this.faceUris.set(key, png ? pngDataUri(png) : null);
        }
        return this.faceUris.get(key) || undefined;
    }

    faceNames(ctx: DbContext): string[] {
        return listFaceNames(ctx.imgDir);
    }

    private watch(dataDir: string): void {
        const disposables: vscode.Disposable[] = [];
        const reloadDb = (uri: vscode.Uri): void => {
            if (!DATABASE_FILES.includes(path.basename(uri.fsPath))) return;
            this.dbs.delete(dataDir);
            this.clearFaces(path.join(path.dirname(dataDir), 'img'));
            this.emitter.fire(dataDir);
        };
        const dataWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(dataDir), '*.json'));
        disposables.push(dataWatcher, dataWatcher.onDidChange(reloadDb), dataWatcher.onDidCreate(reloadDb), dataWatcher.onDidDelete(reloadDb));

        const facesDir = path.join(path.dirname(dataDir), 'img', 'faces');
        const faceWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(facesDir), '*'));
        const reloadFaces = (): void => {
            this.clearFaces(path.join(path.dirname(dataDir), 'img'));
            this.emitter.fire(dataDir);
        };
        disposables.push(faceWatcher, faceWatcher.onDidChange(reloadFaces), faceWatcher.onDidCreate(reloadFaces), faceWatcher.onDidDelete(reloadFaces));
        const iconWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(path.join(path.dirname(dataDir), 'img', 'system')), 'IconSet.*'));
        disposables.push(iconWatcher, iconWatcher.onDidChange(reloadFaces), iconWatcher.onDidCreate(reloadFaces), iconWatcher.onDidDelete(reloadFaces));
        this.watchers.set(dataDir, disposables);
    }

    private clearFaces(imgDir: string): void {
        const prefix = imgDir + '\u0000';
        for (const k of Array.from(this.sheets.keys())) if (k.startsWith(prefix)) this.sheets.delete(k);
        for (const k of Array.from(this.faceUris.keys())) if (k.startsWith(prefix)) this.faceUris.delete(k);
    }

    dispose(): void {
        for (const list of this.watchers.values()) list.forEach((d) => d.dispose());
        this.watchers.clear();
        this.emitter.dispose();
    }
}
