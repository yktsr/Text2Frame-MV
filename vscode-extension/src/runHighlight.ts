import * as vscode from 'vscode';
import { DatabaseService, DbContext } from './dbService';
import { LiveService } from './live';
import { RunSources, RunSource } from './runSource';
import { placeFromKey, placeLabel } from './placeLabel';
import { alignCommands, CommandMark, commandLines, locateCommand } from './db/runLines';
import { tr } from './db/lang';

export interface RunningFrame {
    key: string;
    label: string;
    uri?: vscode.Uri;
    from?: number;
    to?: number;
    textIndex?: number;
    exact: boolean;
    problem?: string;
}

const RESOLVE_DELAY = 80;
const STATUS_CHECK = 1000;
const approximateNote = (): string => tr('テキストがゲームのデータと違うため、近い行です(反映してブラウザを読み直すと合います)。', 'The text differs from the game data, so this is a nearby line (apply and reload the browser to match).');

export class RunTracker implements vscode.Disposable {
    private frames: RunningFrame[] = [];
    private signature = '[]';
    private timer?: NodeJS.Timeout;
    private seq = 0;
    private readonly emitter = new vscode.EventEmitter<RunningFrame[]>();
    readonly onDidChange = this.emitter.event;
    private readonly sources: RunSources;
    private readonly alignments = new WeakMap<CommandMark[], WeakMap<RunSource, Array<number | undefined>>>();

    constructor(context: vscode.ExtensionContext, private readonly service: DatabaseService, private readonly live: LiveService) {
        this.sources = new RunSources(context);
    }

    current(): RunningFrame[] {
        return this.frames;
    }

    innermost(): RunningFrame | undefined {
        for (let i = this.frames.length - 1; i >= 0; i--) if (this.frames[i].uri) return this.frames[i];
        return undefined;
    }

    refresh(): void {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => { this.resolve(); }, RESOLVE_DELAY);
    }

    reindex(): void {
        this.sources.invalidate();
        this.refresh();
    }

    textFor(ctx: DbContext, key: string): Promise<string | undefined> {
        return this.sources.find(ctx, key);
    }

    textIndex(ctx: DbContext): Promise<Map<string, string>> {
        return this.sources.entries(ctx);
    }

    sourceFor(ctx: DbContext, fsPath: string): RunSource | { error: string } {
        return this.sources.source(ctx, fsPath);
    }

    showsFile(fsPath: string): boolean {
        return this.frames.some((f) => f.uri?.fsPath === fsPath);
    }

    dispose(): void {
        clearTimeout(this.timer);
        this.emitter.dispose();
    }

    private alignment(marks: CommandMark[], source: RunSource): Array<number | undefined> {
        let bySource = this.alignments.get(marks);
        if (!bySource) {
            bySource = new WeakMap();
            this.alignments.set(marks, bySource);
        }
        let hit = bySource.get(source);
        if (!hit) {
            hit = alignCommands(marks, source.marks);
            bySource.set(source, hit);
        }
        return hit;
    }

    private async resolve(): Promise<void> {
        const seq = ++this.seq;
        const session = this.live.current();
        const state = session?.state;
        const ctx = session ? this.service.forRoot(session.projectRoot) : undefined;
        const frames: RunningFrame[] = [];
        if (session && state && ctx && state.received() && state.connected(Date.now())) {
            for (const frame of state.running()) {
                const out: RunningFrame = { key: frame.key, label: placeLabel(this.service, ctx, placeFromKey(frame.key)), exact: false };
                frames.push(out);
                const file = await this.sources.find(ctx, frame.key);
                if (!file) {
                    out.problem = tr('このイベントのテキストが見つかりません。', 'The text of this event was not found.');
                    continue;
                }
                out.uri = vscode.Uri.file(file);
                const source = this.sources.source(ctx, file);
                const marks = state.listMarks(frame.key);
                if ('error' in source) {
                    out.problem = source.error;
                    continue;
                }
                if (!marks) continue;
                const target = locateCommand(this.alignment(marks, source), frame.index);
                const lines = target ? commandLines(source.commands, source.lines, target.index) : undefined;
                if (!target || !lines) {
                    out.problem = tr('テキストの中の場所が分かりません。', 'The place in the text is not clear.');
                    continue;
                }
                Object.assign(out, { from: lines.from, to: lines.to, textIndex: target.index, exact: target.exact });
            }
        }
        if (seq !== this.seq) return;
        const signature = JSON.stringify(frames.map((f) => [f.key, f.label, f.uri?.fsPath, f.from, f.to, f.exact, f.problem]));
        if (signature === this.signature) return;
        this.signature = signature;
        this.frames = frames;
        this.emitter.fire(frames);
    }
}

export const openRunningText = (): boolean =>
    vscode.workspace.getConfiguration('text2frame').get<boolean>('openRunningText', false);

export async function setOpenRunningText(value: boolean): Promise<void> {
    const target = vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
    await vscode.workspace.getConfiguration('text2frame').update('openRunningText', value, target);
}

function textColumn(): vscode.ViewColumn {
    const text = vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'text2frame');
    if (text?.viewColumn) return text.viewColumn;
    const group = vscode.window.tabGroups.all.find((g) => g.activeTab?.input instanceof vscode.TabInputText);
    return group ? group.viewColumn : vscode.ViewColumn.Beside;
}

export async function revealRunning(tracker: RunTracker, index?: number): Promise<void> {
    const frames = tracker.current();
    const frame = index !== undefined && frames[index]?.uri ? frames[index] : tracker.innermost();
    if (!frame || !frame.uri) {
        vscode.window.showInformationMessage(tr('Text2Frame: テストプレイで実行中のイベントはありません。', 'Text2Frame: No event is running in the test play.'));
        return;
    }
    await openText(frame.uri, frame.from ?? 0);
}

export async function openText(uri: vscode.Uri, line: number, options: { preserveFocus?: boolean; preview?: boolean } = {}): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { ...options, viewColumn: textColumn(), selection: new vscode.Range(line, 0, line, 0) });
    await vscode.commands.executeCommand('text2frame.showPreviewFor', doc.uri);
}

export function registerRunHighlight(context: vscode.ExtensionContext, service: DatabaseService, live: LiveService): RunTracker {
    const tracker = new RunTracker(context, service, live);
    const current = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: new vscode.ThemeColor('editor.stackFrameHighlightBackground'),
        overviewRulerColor: new vscode.ThemeColor('editorOverviewRuler.rangeHighlightForeground'),
        overviewRulerLane: vscode.OverviewRulerLane.Full
    });
    const caller = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: new vscode.ThemeColor('editor.focusedStackFrameHighlightBackground')
    });
    const approximate = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: new vscode.ThemeColor('editor.rangeHighlightBackground'),
        after: { contentText: tr(' (近い行)', ' (nearby line)'), color: new vscode.ThemeColor('descriptionForeground') }
    });
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    status.command = 'text2frame.revealRunning';

    const paint = (): void => {
        const frames = tracker.current();
        const inner = frames[frames.length - 1];
        for (const editor of vscode.window.visibleTextEditors) {
            const fsPath = editor.document.uri.fsPath;
            const ranges = { current: [] as vscode.DecorationOptions[], caller: [] as vscode.DecorationOptions[], approximate: [] as vscode.DecorationOptions[] };
            for (const f of frames) {
                if (!f.uri || f.uri.fsPath !== fsPath || f.from === undefined || f.to === undefined) continue;
                const to = Math.min(f.to, editor.document.lineCount - 1);
                const from = Math.min(f.from, to);
                const range = new vscode.Range(from, 0, to, editor.document.lineAt(to).text.length);
                if (f !== inner) ranges.caller.push({ range });
                else if (f.exact) ranges.current.push({ range });
                else ranges.approximate.push({ range, hoverMessage: approximateNote() });
            }
            editor.setDecorations(current, ranges.current);
            editor.setDecorations(caller, ranges.caller);
            editor.setDecorations(approximate, ranges.approximate);
        }
        if (!frames.length) {
            status.hide();
            return;
        }
        const line = inner.from !== undefined ? tr(` ${inner.from + 1}行目`, ` line ${inner.from + 1}`) : '';
        status.text = `$(debug-stackframe) ${inner.label}${line}${inner.from !== undefined && !inner.exact ? tr('(近い行)', ' (nearby line)') : ''}`;
        status.tooltip = ['テストプレイで実行中。押すとその行を開きます。', '']
            .concat(frames.slice().reverse().map((f) => `${f.label}${f.from !== undefined ? tr(` ${f.from + 1}行目`, ` line ${f.from + 1}`) : ''}${f.problem ? ` — ${f.problem}` : ''}`))
            .join('\n');
        status.show();
    };

    let lastSpot = '';
    let lastOpened = '';
    const follow = async (): Promise<void> => {
        const frames = tracker.current();
        const inner = frames[frames.length - 1];
        if (!frames.length) lastOpened = '';
        if (!inner || !inner.uri || inner.from === undefined) {
            lastSpot = '';
            return;
        }
        const uri = inner.uri;
        const spot = `${uri.fsPath}:${inner.from}:${inner.to}`;
        if (spot === lastSpot) return;
        lastSpot = spot;
        const range = new vscode.Range(inner.from, 0, inner.to ?? inner.from, 0);
        const shown = vscode.window.visibleTextEditors.filter((e) => e.document.uri.fsPath === uri.fsPath);
        shown.forEach((e) => e.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport));
        if (shown.length || !openRunningText() || lastOpened === uri.fsPath) return;
        lastOpened = uri.fsPath;
        try {
            await openText(uri, inner.from, { preserveFocus: true, preview: true });
        } catch (e) {
            lastOpened = '';
        }
    };

    const statusTimer = setInterval(() => tracker.refresh(), STATUS_CHECK);
    context.subscriptions.push(
        tracker,
        tracker.onDidChange(() => { follow(); }),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (!e.affectsConfiguration('text2frame.openRunningText')) return;
            lastSpot = '';
            lastOpened = '';
            follow();
        }),
        current,
        caller,
        approximate,
        status,
        tracker.onDidChange(paint),
        live.onDidChangeRun(() => tracker.refresh()),
        vscode.window.onDidChangeVisibleTextEditors(paint),
        vscode.workspace.onDidChangeTextDocument((e) => { if (tracker.showsFile(e.document.uri.fsPath)) tracker.refresh(); }),
        vscode.workspace.onDidCreateFiles(() => tracker.reindex()),
        vscode.workspace.onDidDeleteFiles(() => tracker.reindex()),
        vscode.workspace.onDidRenameFiles(() => tracker.reindex()),
        vscode.commands.registerCommand('text2frame.revealRunning', (index?: number) => revealRunning(tracker, typeof index === 'number' ? index : undefined)),
        { dispose: () => clearInterval(statusTimer) }
    );
    return tracker;
}
