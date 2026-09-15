import * as vscode from 'vscode';
import * as fs from 'fs';
import { DatabaseService, DbContext } from './dbService';
import { RunTracker } from './runHighlight';
import { parseFrontMatter, workspaceRootFor } from './compiler';
import { projectTextFiles } from './usagesView';
import { placeFromKey, placeLabel } from './placeLabel';
import { readStructure, foldingRanges, labelLine, JUMP_TO_LABEL, LABEL, StructureNode, NodeKind } from './db/structure';
import { scanLines, LineRef } from './db/tagRefs';
import { scanSelfSwitchLines, SelfSwitchRef } from './db/selfSwitchRefs';
import { bodyStart } from './db/usages';

/**
 * エディタの移動と見通し: 定義へ移動(F12)・参照の一覧(Shift+F12)・シンボルで開く(Ctrl+T)・
 * アウトライン(スティッキースクロールもこれを使う)・折りたたみ。
 *   スイッチ・変数の「定義」は、その値を書き換えている所。コモンイベントの呼び出しはそのテキスト、
 *   ラベルジャンプは同じテキストのラベル、場所移動はそのマップのイベントのテキスト。
 */

const SELECTOR: vscode.DocumentSelector = { language: 'text2frame' };
const SIDECAR = /\.(conversation|translation)\.txt$/;

interface FileScan {
    version: string;
    lines: string[];
    refs: LineRef[];
    selfSwitches: SelfSwitchRef[];
}

/** プロジェクトのテキストを読んだ結果。開いているものはエディタの内容、ほかはファイルの更新時刻で使い回す。 */
class ProjectScans {
    private readonly cache = new Map<string, FileScan>();

    scan(fsPath: string): FileScan | undefined {
        const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === fsPath);
        let version: string;
        try {
            version = open ? `doc:${open.version}` : `disk:${fs.statSync(fsPath).mtimeMs}`;
        } catch (e) {
            return undefined;
        }
        const hit = this.cache.get(fsPath);
        if (hit && hit.version === version) return hit;
        let text: string;
        try {
            text = open ? open.getText() : fs.readFileSync(fsPath, 'utf8');
        } catch (e) {
            return undefined;
        }
        const lines = text.split(/\r?\n/);
        const entry = { version, lines, refs: scanLines(lines), selfSwitches: scanSelfSwitchLines(lines) };
        this.cache.set(fsPath, entry);
        return entry;
    }

    async all(ctx: DbContext): Promise<Array<{ uri: vscode.Uri; scan: FileScan }>> {
        const out: Array<{ uri: vscode.Uri; scan: FileScan }> = [];
        for (const uri of await projectTextFiles(ctx)) {
            if (SIDECAR.test(uri.fsPath)) continue;
            const scan = this.scan(uri.fsPath);
            if (scan) out.push({ uri, scan });
        }
        return out;
    }
}

const docLines = (document: vscode.TextDocument): string[] => {
    const out: string[] = [];
    for (let i = 0; i < document.lineCount; i++) out.push(document.lineAt(i).text);
    return out;
};

const within = (line: number, character: number, r: { line: number; start: number; end: number }): boolean =>
    r.line === line && r.start <= character && character <= r.end;

const covers = (r: LineRef, kind: string, id: number): boolean => r.kind === kind && r.id <= id && id <= (r.endId ?? r.id);

const location = (uri: vscode.Uri, r: { line: number; start: number; end: number }): vscode.Location =>
    new vscode.Location(uri, new vscode.Range(r.line, r.start, r.line, r.end));

/** 場所の鍵(e:マップ:イベント:ページ)を、マップ・イベント・ページの番号順に並べる。 */
const byPlace = (a: string, b: string): number => {
    const na = a.split(':').slice(1).map(Number);
    const nb = b.split(':').slice(1).map(Number);
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
        if ((na[i] || 0) !== (nb[i] || 0)) return (na[i] || 0) - (nb[i] || 0);
    }
    return 0;
};

const SYMBOL_KINDS: Record<NodeKind, vscode.SymbolKind> = {
    if: vscode.SymbolKind.Boolean,
    else: vscode.SymbolKind.Boolean,
    choices: vscode.SymbolKind.Enum,
    when: vscode.SymbolKind.EnumMember,
    battle: vscode.SymbolKind.Class,
    battleBranch: vscode.SymbolKind.Method,
    loop: vscode.SymbolKind.Array,
    skip: vscode.SymbolKind.Null,
    comment: vscode.SymbolKind.File,
    script: vscode.SymbolKind.Function,
    scrolling: vscode.SymbolKind.String,
    label: vscode.SymbolKind.Key,
    message: vscode.SymbolKind.String
};

export function registerNavigation(context: vscode.ExtensionContext, service: DatabaseService, tracker: RunTracker): void {
    const scans = new ProjectScans();

    const contextFor = (document?: vscode.TextDocument): DbContext | undefined => {
        const ctx = service.forDocument(document || vscode.window.activeTextEditor?.document);
        if (ctx) return ctx;
        const root = workspaceRootFor(document);
        return root ? service.forRoot(root) : undefined;
    };

    /** カーソルの下にあるもの(番号・セルフスイッチ・ラベルジャンプ)。 */
    const targetAt = (document: vscode.TextDocument, position: vscode.Position) => {
        const lines = docLines(document);
        const ref = scanLines(lines).find((r) => within(position.line, position.character, r));
        const self = scanSelfSwitchLines(lines).find((r) => within(position.line, position.character, r));
        const named = lines[position.line].match(JUMP_TO_LABEL) || lines[position.line].match(LABEL);
        let label: string | undefined;
        if (named && named.index !== undefined) {
            const start = named.index + named[0].lastIndexOf(named[1]);
            if (position.character >= start && position.character <= start + named[1].length) label = named[1];
        }
        return { lines, ref, self, label };
    };

    /** このイベントの全ページのテキスト(セルフスイッチは同じイベントの中だけ)。 */
    const eventFiles = async (ctx: DbContext, document: vscode.TextDocument): Promise<string[]> => {
        const meta = parseFrontMatter(document.getText()).meta;
        if (meta.kind === 'common' || !meta.mapId || !meta.eventId) return [document.uri.fsPath];
        const prefix = `e:${Number(meta.mapId)}:${Number(meta.eventId)}:`;
        const files = Array.from((await tracker.textIndex(ctx)).entries()).filter(([key]) => key.startsWith(prefix)).map(([, f]) => f);
        return files.includes(document.uri.fsPath) ? files : [document.uri.fsPath, ...files];
    };

    const definition: vscode.DefinitionProvider = {
        async provideDefinition(document, position) {
            const { lines, ref, self, label } = targetAt(document, position);
            if (label) {
                const line = labelLine(lines, label);
                return line >= 0 ? new vscode.Location(document.uri, new vscode.Position(line, 0)) : undefined;
            }
            const ctx = contextFor(document);
            if (!ctx) return undefined;
            if (self) {
                const out: vscode.Location[] = [];
                for (const file of await eventFiles(ctx, document)) {
                    const scan = scans.scan(file);
                    for (const r of scan ? scan.selfSwitches : []) if (r.write && r.letter === self.letter) out.push(location(vscode.Uri.file(file), r));
                }
                return out;
            }
            if (!ref) return undefined;
            if (ref.kind === 'commonEvent') {
                const file = await tracker.textFor(ctx, `c:${ref.id}`);
                if (!file) return undefined;
                const scan = scans.scan(file);
                return new vscode.Location(vscode.Uri.file(file), new vscode.Position(scan ? bodyStart(scan.lines) : 0, 0));
            }
            if (ref.kind === 'map') {
                const prefix = `e:${ref.id}:`;
                return Array.from((await tracker.textIndex(ctx)).entries())
                    .filter(([key]) => key.startsWith(prefix))
                    .sort(([a], [b]) => byPlace(a, b))
                    .map(([, file]) => new vscode.Location(vscode.Uri.file(file), new vscode.Position(0, 0)));
            }
            if (ref.kind === 'switch' || ref.kind === 'variable') {
                const out: vscode.Location[] = [];
                for (const { uri, scan } of await scans.all(ctx)) {
                    for (const r of scan.refs) if (r.write && covers(r, ref.kind, ref.id)) out.push(location(uri, r));
                }
                return out;
            }
            return undefined;
        }
    };

    const references: vscode.ReferenceProvider = {
        async provideReferences(document, position) {
            const { lines, ref, self, label } = targetAt(document, position);
            if (label !== undefined) {
                const out: vscode.Location[] = [];
                lines.forEach((text, line) => {
                    const m = text.match(JUMP_TO_LABEL) || text.match(LABEL);
                    if (m && m[1] === label && m.index !== undefined) {
                        const start = m.index + m[0].lastIndexOf(m[1]);
                        out.push(location(document.uri, { line, start, end: start + m[1].length }));
                    }
                });
                return out;
            }
            const ctx = contextFor(document);
            if (!ctx) return undefined;
            if (self) {
                const out: vscode.Location[] = [];
                for (const file of await eventFiles(ctx, document)) {
                    const scan = scans.scan(file);
                    for (const r of scan ? scan.selfSwitches : []) if (r.letter === self.letter) out.push(location(vscode.Uri.file(file), r));
                }
                return out;
            }
            if (!ref) return undefined;
            const out: vscode.Location[] = [];
            for (const { uri, scan } of await scans.all(ctx)) {
                for (const r of scan.refs) if (covers(r, ref.kind, ref.id)) out.push(location(uri, r));
            }
            return out;
        }
    };

    const workspaceSymbols: vscode.WorkspaceSymbolProvider = {
        async provideWorkspaceSymbols(query) {
            const ctx = contextFor();
            if (!ctx) return [];
            const q = query.toLowerCase().replace(/\s+/g, '');
            const matches = (label: string): boolean => {
                if (!q) return true;
                const s = label.toLowerCase();
                let at = 0;
                for (const ch of q) {
                    at = s.indexOf(ch, at);
                    if (at < 0) return false;
                    at++;
                }
                return true;
            };
            const out: vscode.SymbolInformation[] = [];
            for (const [key, file] of (await tracker.textIndex(ctx)).entries()) {
                const label = placeLabel(service, ctx, placeFromKey(key));
                if (!matches(label)) continue;
                out.push(new vscode.SymbolInformation(
                    label,
                    key.startsWith('c:') ? vscode.SymbolKind.Function : vscode.SymbolKind.Event,
                    '',
                    new vscode.Location(vscode.Uri.file(file), new vscode.Position(0, 0))
                ));
            }
            return out;
        }
    };

    const speaker = (ctx: DbContext | undefined, n: StructureNode): string => {
        if (n.name) return n.name;
        if (!n.faceName) return '';
        const owner = ctx ? ctx.db.faceOwner(n.faceName, n.faceIndex || 0) : undefined;
        return owner || `${n.faceName}(${n.faceIndex})`;
    };

    const documentSymbols: vscode.DocumentSymbolProvider = {
        provideDocumentSymbols(document) {
            const ctx = service.forDocument(document);
            const toSymbol = (n: StructureNode): vscode.DocumentSymbol => {
                const end = Math.min(n.endLine, document.lineCount - 1);
                const range = new vscode.Range(n.startLine, 0, end, document.lineAt(end).text.length);
                const head = new vscode.Range(n.startLine, 0, n.startLine, document.lineAt(n.startLine).text.length);
                const who = n.kind === 'message' ? speaker(ctx, n) : '';
                const symbol = new vscode.DocumentSymbol(n.label || ' ', who, SYMBOL_KINDS[n.kind], range, head);
                symbol.children = n.children.map(toSymbol);
                return symbol;
            };
            return readStructure(docLines(document)).map(toSymbol);
        }
    };

    const folding: vscode.FoldingRangeProvider = {
        provideFoldingRanges(document) {
            return foldingRanges(readStructure(docLines(document))).map((r) =>
                new vscode.FoldingRange(r.start, r.end, r.comment ? vscode.FoldingRangeKind.Comment : vscode.FoldingRangeKind.Region));
        }
    };

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(SELECTOR, definition),
        vscode.languages.registerReferenceProvider(SELECTOR, references),
        vscode.languages.registerWorkspaceSymbolProvider(workspaceSymbols),
        vscode.languages.registerDocumentSymbolProvider(SELECTOR, documentSymbols, { label: 'Text2Frame' }),
        vscode.languages.registerFoldingRangeProvider(SELECTOR, folding)
    );
}

