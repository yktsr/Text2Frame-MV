import * as path from 'path';

/**
 * 3-way マージの祖先(.t2f-base)の鍵。
 * テキストの名前ではなく front matter が指す宛先で決めるので、名前を変えても別のフォルダへ
 * 移しても同じ祖先を使う。取り出し側(Frame2Text)が作るファイル名と同じ規則。
 * VS Code に依存しないので、テストから直接使える。
 */

const pad3 = (v: string): string => ('00' + String(v)).slice(-3);

/** 宛先の名前。map001_event001_page1 / common001。分からなければ undefined。 */
export function targetKeyFromMeta(meta: { [key: string]: string }): string | undefined {
    if (String(meta.kind || '').toLowerCase() === 'common') {
        return meta.commonEventId ? `common${pad3(meta.commonEventId)}` : undefined;
    }
    if (!meta.mapId || !meta.eventId) {
        return undefined;
    }
    return `map${pad3(meta.mapId)}_event${pad3(meta.eventId)}_page${meta.pageId || '1'}`;
}

/** テキストがどの置き場所のものか(text / text-en)。祖先を置き場所ごとに分けるために使う。 */
export function textScopeOf(workspaceRoot: string, textPath: string): string {
    const dir = path.dirname(path.resolve(textPath));
    const rel = path.relative(path.resolve(workspaceRoot), dir);
    if (!rel) {
        return '';
    }
    if (!path.isAbsolute(rel) && rel.split(path.sep)[0] !== '..') {
        return rel.split(path.sep)[0];
    }
    return path.basename(dir) || 'default';
}

/** 宛先が分からないときの逃げ道。テキストのパスをそのまま鍵にする(2.3.0 までの決め方)。 */
export function keyFromTextPath(workspaceRoot: string, textPath: string): string {
    const abs = path.resolve(textPath);
    const noExt = abs.slice(0, abs.length - path.extname(abs).length);
    const rel = path.relative(path.resolve(workspaceRoot), noExt);
    if (rel && !path.isAbsolute(rel) && rel.split(path.sep)[0] !== '..') {
        return rel.split(path.sep).join('/');
    }
    return [path.basename(path.dirname(noExt)) || 'default', path.basename(noExt)].join('/');
}

/** 祖先の鍵。Text2Frame の baseIdForTarget と同じ決め方。 */
export function snapshotKeyForTarget(workspaceRoot: string, textPath: string, meta: { [key: string]: string }): string {
    const key = targetKeyFromMeta(meta);
    if (!key) {
        return keyFromTextPath(workspaceRoot, textPath);
    }
    const scope = textScopeOf(workspaceRoot, textPath);
    return scope ? `${scope}/${key}` : key;
}
