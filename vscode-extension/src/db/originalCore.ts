import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

type Restore = (data: ArrayBuffer, key: string) => ArrayBuffer | undefined;

const CORES = [
    {
        file: 'rmmz_core.js',
        name: 'Utils',
        call: 'Utils.setEncryptionInfo(true, true, __key); __out = Utils.decryptArrayBuffer(__data);'
    },
    {
        file: 'rpg_core.js',
        name: 'Decrypter',
        call: '$dataSystem = { encryptionKey: __key }; __out = Decrypter.decryptArrayBuffer(__data);'
    }
];

const TIMEOUT = 1000;
const loaded = new Map<string, { mtime: number; restore?: Restore }>();

function section(source: string, name: string): string | undefined {
    const from = source.indexOf(`function ${name}() {`);
    if (from < 0) return undefined;
    const to = source.indexOf('\n//----', from);
    return source.slice(from, to < 0 ? undefined : to);
}

function load(file: string, core: typeof CORES[number]): Restore | undefined {
    let mtime: number;
    try { mtime = fs.statSync(file).mtimeMs; } catch (e) { return undefined; }
    const hit = loaded.get(file);
    if (hit && hit.mtime === mtime) return hit.restore;
    let restore: Restore | undefined;
    try {
        const code = section(fs.readFileSync(file, 'utf8'), core.name);
        if (code) {
            const context = vm.createContext({});
            vm.runInContext(code, context, { timeout: TIMEOUT });
            const call = new vm.Script(core.call);
            restore = (data, key) => {
                context.__data = data;
                context.__key = key;
                context.__out = undefined;
                call.runInContext(context, { timeout: TIMEOUT });
                return context.__out;
            };
        }
    } catch (e) {
        restore = undefined;
    }
    loaded.set(file, { mtime, restore });
    return restore;
}

export function restoreAsset(gameRoot: string, data: Buffer, key: string): Buffer | undefined {
    for (const core of CORES) {
        const restore = load(path.join(gameRoot, 'js', core.file), core);
        if (!restore) continue;
        try {
            const out = restore(Uint8Array.from(data).buffer, key);
            return out ? Buffer.from(out) : undefined;
        } catch (e) {
            return undefined;
        }
    }
    return undefined;
}
