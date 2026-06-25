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
 * Resolution order: configured modulePath dir -> bundled lib/ -> monorepo sibling
 * -> workspace root -> workspace js/plugins. Returns the first module that
 * passes `validate` (e.g. exports applyTextFile / decompile).
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
    candidates.push(path.join(extDir, 'lib', filename));
    candidates.push(path.join(extDir, '..', filename));
    if (workspaceRoot) {
        candidates.push(path.join(workspaceRoot, filename));
        candidates.push(path.join(workspaceRoot, 'js', 'plugins', filename));
    }

    for (const candidate of candidates) {
        if (!candidate || !fs.existsSync(candidate)) {
            continue;
        }
        try {
            const resolved = require.resolve(candidate);
            delete require.cache[resolved];
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require(resolved);
            if (validate(mod)) {
                return { mod: mod as T, tried: candidates };
            }
        } catch (e) {
            // Try the next candidate.
        }
    }
    return { tried: candidates };
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

/** data/Map###.json path from a map id, under the workspace data dir. */
export function mapPathFor(workspaceRoot: string, mapId: string | number): string {
    return path.join(workspaceRoot, 'data', 'Map' + ('000' + String(mapId)).slice(-3) + '.json');
}

export function commonEventsPathFor(workspaceRoot: string): string {
    return path.join(workspaceRoot, 'data', 'CommonEvents.json');
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
