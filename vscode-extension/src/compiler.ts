import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Shared helpers for loading the Text2Frame / Frame2Text compilers in-process
 * and parsing the YAML front matter that ties a text file to its data target.
 */

export interface FrontMatter {
    meta: { [key: string]: string };
    hasFrontMatter: boolean;
}

/** Parse the YAML-ish front matter block (same rules as the compilers). */
export function parseFrontMatter(text: string): FrontMatter {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normalized.indexOf('---\n') !== 0) {
        return { meta: {}, hasFrontMatter: false };
    }
    const endIndex = normalized.indexOf('\n---\n', 4);
    if (endIndex < 0) {
        return { meta: {}, hasFrontMatter: false };
    }
    const header = normalized.slice(4, endIndex);
    const meta: { [key: string]: string } = {};
    header.split('\n').forEach((line) => {
        const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (!m) {
            return;
        }
        const raw = m[2].trim();
        meta[m[1]] = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    });
    return { meta, hasFrontMatter: true };
}

/** Return the body with any leading front matter block stripped. */
export function frontMatterBody(text: string): string {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normalized.indexOf('---\n') !== 0) {
        return text;
    }
    const endIndex = normalized.indexOf('\n---\n', 4);
    if (endIndex < 0) {
        return text;
    }
    return normalized.slice(endIndex + 5);
}

/** A document is "deployable" when it carries Text2Frame front matter. */
export function isDeployable(document: vscode.TextDocument): boolean {
    if (document.uri.scheme !== 'file') {
        return false;
    }
    return parseFrontMatter(document.getText()).hasFrontMatter;
}

/**
 * Locate and load a compiler module by filename (Text2Frame.js / Frame2Text.js).
 * Resolution order: configured modulePath dir -> monorepo sibling (../, dev)
 * -> bundled lib/ (packaged .vsix) -> workspace root -> workspace js/plugins.
 * Returns the first module that passes `validate` (e.g. exports applyTextFile /
 * decompile). The sibling precedes lib/ so editing the raw compiler during F5
 * development takes effect without re-bundling; packaged installs have no ../
 * sibling and fall through to the self-contained lib/ copy.
 *
 * The RAW .js files are the Node entry points; the browser-oriented .cjs.js
 * bundles do not resolve Node builtins when run outside a bundler.
 */
export function loadModule<T>(
    context: vscode.ExtensionContext,
    workspaceRoot: string | undefined,
    filename: string,
    validate: (mod: unknown) => boolean
): { mod?: T; tried: string[] } {
    const config = vscode.workspace.getConfiguration('text2frame');
    const configured = config.get<string>('modulePath');
    const extDir = context.extensionPath;

    const candidates: string[] = [];
    if (configured && configured.trim() !== '') {
        // Treat the configured path as pointing at Text2Frame.js; resolve siblings by filename.
        const base = path.isAbsolute(configured) || !workspaceRoot ? configured : path.join(workspaceRoot, configured);
        candidates.push(path.join(path.dirname(base), filename));
    }
    // 開発(モノレポ F5)では生ファイル ../Text2Frame.js を優先する。こうすると
    // 本体を編集しても再バンドル無しで反映される。パッケージ版(.vsix)では ../ に
    // 本体が無いため次の同梱 lib/ にフォールバックする。
    candidates.push(path.join(extDir, '..', filename));
    candidates.push(path.join(extDir, 'lib', filename));
    if (workspaceRoot) {
        candidates.push(path.join(workspaceRoot, filename));
        candidates.push(path.join(workspaceRoot, 'js', 'plugins', filename));
    }

    const tried: string[] = [];
    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }
        if (!fs.existsSync(candidate)) {
            tried.push('missing: ' + candidate);
            continue;
        }
        try {
            const resolved = require.resolve(candidate);
            delete require.cache[resolved];
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require(resolved);
            if (validate(mod)) {
                return { mod: mod as T, tried };
            }
            tried.push('loaded-but-invalid (no expected export): ' + candidate);
        } catch (e) {
            tried.push('require-failed: ' + candidate + ' — ' + (e instanceof Error ? e.message : String(e)));
        }
    }
    return { tried };
}

/**
 * Data-change guard: remember the data file's mtime whenever the extension
 * writes it (deploy) or pulls from it (export), so a later deploy can detect
 * that the JSON changed externally (e.g. edited in RPG Maker) and avoid
 * silently overwriting it.
 */
function mtimeKey(dataPath: string): string {
    return 't2f.dataMtime:' + dataPath;
}

export function dataMtime(dataPath: string): number | undefined {
    try {
        return fs.statSync(dataPath).mtimeMs;
    } catch (e) {
        return undefined;
    }
}

export function recordDataState(context: vscode.ExtensionContext, dataPath: string): void {
    const m = dataMtime(dataPath);
    if (m !== undefined) {
        context.workspaceState.update(mtimeKey(dataPath), m);
    }
}

export function dataChangedExternally(context: vscode.ExtensionContext, dataPath: string): boolean {
    const baseline = context.workspaceState.get<number>(mtimeKey(dataPath));
    if (baseline === undefined) {
        return false; // no baseline yet → cannot tell, allow
    }
    const current = dataMtime(dataPath);
    if (current === undefined) {
        return false; // file missing → let the deploy path report it
    }
    return current > baseline + 1; // small epsilon for fs timestamp precision
}

/**
 * BASE snapshot storage for 3-way merge. The snapshot is the last-synced text
 * for a target, kept under .t2f-base/<locale>/<key>.txt (gitignored). It is the
 * common ancestor: writer edits (current text) and dev edits (current JSON) are
 * merged against it.
 */
export function baseSnapshotPath(workspaceRoot: string, locale: string, key: string): string {
    return path.join(workspaceRoot, '.t2f-base', locale, key + '.txt');
}
export function hasBaseSnapshot(workspaceRoot: string, locale: string, key: string): boolean {
    return fs.existsSync(baseSnapshotPath(workspaceRoot, locale, key));
}
export function saveBaseSnapshot(workspaceRoot: string, locale: string, key: string, content: string): void {
    const target = baseSnapshotPath(workspaceRoot, locale, key);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
}

/** Resolve the workspace root for a document (or the first workspace folder). */
export function workspaceRootFor(document?: vscode.TextDocument): string | undefined {
    if (document) {
        const folder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (folder) {
            return folder.uri.fsPath;
        }
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/** Absolute data directory for a workspace (configurable via text2frame.dataDir, default "data"). */
export function dataDirFor(workspaceRoot: string): string {
    const configured = vscode.workspace.getConfiguration('text2frame').get<string>('dataDir', 'data') || 'data';
    return path.resolve(workspaceRoot, configured);
}

/** Map###.json path from a map id, under the workspace data dir. */
export function mapPathFor(workspaceRoot: string, mapId: string | number): string {
    return path.join(dataDirFor(workspaceRoot), 'Map' + ('000' + String(mapId)).slice(-3) + '.json');
}

export function commonEventsPathFor(workspaceRoot: string): string {
    return path.join(dataDirFor(workspaceRoot), 'CommonEvents.json');
}

/**
 * Resolve the deploy target (data file + ids) from front matter, against the
 * workspace. Returns absolute paths so the compiler does not rely on its own
 * BASE_PATH (which is meaningless inside the VS Code extension host).
 */
export function resolveTarget(
    meta: { [key: string]: string },
    workspaceRoot: string
): { opts: { [key: string]: unknown }; label: string } {
    const kind = String(meta.kind || 'event').toLowerCase();

    if (kind === 'common') {
        const commonEventId = meta.commonEventId;
        if (!commonEventId) {
            throw new Error('commonEventId is missing in front matter');
        }
        const commonEventPath = meta.commonEventPath
            ? path.resolve(workspaceRoot, meta.commonEventPath)
            : commonEventsPathFor(workspaceRoot);
        return {
            opts: { kind: 'common', commonEventId, commonEventPath },
            label: `CommonEvent ${commonEventId}`
        };
    }

    const mapId = meta.mapId;
    const eventId = meta.eventId;
    const pageId = meta.pageId || '1';
    if (!eventId) {
        throw new Error('eventId is missing in front matter');
    }
    let mapPath: string;
    if (meta.mapPath) {
        mapPath = path.resolve(workspaceRoot, meta.mapPath);
    } else if (mapId) {
        mapPath = mapPathFor(workspaceRoot, mapId);
    } else {
        throw new Error('mapId or mapPath is missing in front matter');
    }
    return {
        opts: { kind: 'event', mapId, eventId, pageId, mapPath },
        label: `Map ${mapId || '?'} / Event ${eventId} / Page ${pageId}`
    };
}
