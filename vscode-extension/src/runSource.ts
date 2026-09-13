import * as vscode from 'vscode';
import * as fs from 'fs';
import { DbContext } from './dbService';
import { parseFrontMatter } from './compiler';
import { loadCompiler } from './deploy';
import { compileWithLines } from './compileLines';
import { projectTextFiles } from './usagesView';
import { placeFromMeta, placeKey } from './placeLabel';
import { RpgCommand } from './db/commandRefs';
import { CommandMark, commandMark } from './db/runLines';

export interface RunSource {
    uri: vscode.Uri;
    commands: RpgCommand[];
    lines: number[];
    marks: CommandMark[];
}

const REINDEX_AFTER = 5000;

export class RunSources {
    private index?: { root: string; files: Map<string, string>; at: number };
    private building?: Promise<void>;
    private readonly compiled = new Map<string, { version: string; result: RunSource | { error: string } }>();

    constructor(private readonly context: vscode.ExtensionContext) {}

    invalidate(): void {
        this.index = undefined;
    }

    async find(ctx: DbContext, key: string): Promise<string | undefined> {
        if (!this.index || this.index.root !== ctx.root) await this.build(ctx);
        let file = this.index?.files.get(key);
        if (!file && this.index && Date.now() - this.index.at > REINDEX_AFTER) {
            await this.build(ctx);
            file = this.index?.files.get(key);
        }
        return file;
    }

    source(ctx: DbContext, fsPath: string): RunSource | { error: string } {
        const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === fsPath);
        let version: string;
        let text: string;
        try {
            version = open ? `doc:${open.version}` : `disk:${fs.statSync(fsPath).mtimeMs}`;
            text = open ? open.getText() : fs.readFileSync(fsPath, 'utf8');
        } catch (e) {
            return { error: 'テキストを読めません。' };
        }
        const hit = this.compiled.get(fsPath);
        if (hit && hit.version === version) return hit.result;
        const { mod } = loadCompiler(this.context, ctx.root);
        let result: RunSource | { error: string };
        try {
            if (!mod) throw new Error('コンパイラ (Text2Frame.js) が見つかりません。');
            const { commands, lines } = compileWithLines(mod, text);
            result = lines
                ? { uri: vscode.Uri.file(fsPath), commands, lines, marks: commands.map(commandMark) }
                : { error: 'コンパイラが古いため、行を出せません。' };
        } catch (e) {
            result = { error: 'テキストをコンパイルできません。' };
        }
        this.compiled.set(fsPath, { version, result });
        return result;
    }

    private async build(ctx: DbContext): Promise<void> {
        if (!this.building) {
            this.building = (async () => {
                const files = new Map<string, string>();
                for (const uri of await projectTextFiles(ctx)) {
                    if (/\.(conversation|translation)\.txt$/.test(uri.fsPath)) continue;
                    let text: string;
                    try { text = fs.readFileSync(uri.fsPath, 'utf8'); } catch (e) { continue; }
                    const place = placeFromMeta(parseFrontMatter(text).meta);
                    const key = place ? placeKey(place) : undefined;
                    if (key && !files.has(key)) files.set(key, uri.fsPath);
                }
                this.index = { root: ctx.root, files, at: Date.now() };
            })().finally(() => { this.building = undefined; });
        }
        await this.building;
    }
}
