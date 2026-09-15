import * as fs from 'fs';
import * as path from 'path';

/**
 * ツクールのデータベース(data/*.json)を読むだけの窓口。書き換えはしない。
 * VS Code に依存しないので、テストから直接使える。
 *
 * テキストには番号しか書かれていないので、ここで「種類+番号 → 名前」を引けるようにする。
 * 名前は一意ではない(実データでは「シャチ出てくる」がスイッチ4つに付いている)し、
 * 数字だけの名前もある(スイッチ185の名前が "1")。だから名前から番号は引かせず、
 * 同じ名前の番号を並べて見せるところまでにとどめる。
 */

export type DbKind =
    | 'switch' | 'variable'
    | 'actor' | 'class' | 'item' | 'weapon' | 'armor' | 'equipType' | 'skill' | 'state'
    | 'enemy' | 'troop' | 'animation' | 'commonEvent' | 'map' | 'tileset';

export type Lookup =
    | { status: 'named'; id: number; name: string }
    | { status: 'unnamed'; id: number }
    | { status: 'missing'; id: number; max: number };

export interface DbEntry {
    id: number;
    /** 名前が無ければ空文字。 */
    name: string;
}

interface Source {
    file: string;
    label: string;
    /** 番号をそのまま添字にした名前の配列を返す(0番は使わない)。 */
    names: (json: any) => string[];
}

const fromArrayField = (field: string) => (json: any): string[] =>
    Array.isArray(json && json[field]) ? json[field].map((n: unknown) => (typeof n === 'string' ? n : '')) : [];

const fromRecords = (json: any): string[] =>
    Array.isArray(json) ? json.map((r: any) => (r && typeof r.name === 'string' ? r.name : '')) : [];

/** 並び順はサイドバーの一覧の順でもある。 */
export const SOURCES: Record<DbKind, Source> = {
    switch: { file: 'System.json', label: 'スイッチ', names: fromArrayField('switches') },
    variable: { file: 'System.json', label: '変数', names: fromArrayField('variables') },
    actor: { file: 'Actors.json', label: 'アクター', names: fromRecords },
    class: { file: 'Classes.json', label: '職業', names: fromRecords },
    item: { file: 'Items.json', label: 'アイテム', names: fromRecords },
    weapon: { file: 'Weapons.json', label: '武器', names: fromRecords },
    armor: { file: 'Armors.json', label: '防具', names: fromRecords },
    equipType: { file: 'System.json', label: '装備タイプ', names: fromArrayField('equipTypes') },
    skill: { file: 'Skills.json', label: 'スキル', names: fromRecords },
    state: { file: 'States.json', label: 'ステート', names: fromRecords },
    enemy: { file: 'Enemies.json', label: '敵キャラ', names: fromRecords },
    troop: { file: 'Troops.json', label: '敵グループ', names: fromRecords },
    animation: { file: 'Animations.json', label: 'アニメーション', names: fromRecords },
    commonEvent: { file: 'CommonEvents.json', label: 'コモンイベント', names: fromRecords },
    map: { file: 'MapInfos.json', label: 'マップ', names: fromRecords },
    tileset: { file: 'Tilesets.json', label: 'タイルセット', names: fromRecords }
};

export const KINDS = Object.keys(SOURCES) as DbKind[];

export interface SystemInfo {
    /** MZ だけが持つ。無ければ MV の既定 144。 */
    faceSize: number;
    /** MZ だけが持つ。無ければ MV の既定 32。 */
    iconSize: number;
    encryptionKey?: string;
    currencyUnit?: string;
    /** MZ だけが持つ(System.json の advanced)。メッセージの幅の見積もりに使う。 */
    uiAreaWidth?: number;
    fontSize?: number;
}

/** そのアイコンを使っているデータベースの項目。 */
export interface IconUser {
    kind: DbKind;
    id: number;
    name: string;
}

// アイコンを持つ種類(各レコードの iconIndex)。
const ICON_KINDS: DbKind[] = ['item', 'weapon', 'armor', 'skill', 'state'];

/** データベースのファイル。変わったら読み直す対象。 */
export const DATABASE_FILES = Array.from(new Set(KINDS.map((k) => SOURCES[k].file).concat(['System.json', 'Actors.json'])));

export class GameDatabase {
    private readonly names = new Map<DbKind, string[]>();
    private readonly byName = new Map<DbKind, Map<string, number[]>>();
    private readonly faceOwners = new Map<string, string>();
    private readonly iconUsersOf = new Map<number, IconUser[]>();
    /** 読めなかったファイル(壊れた JSON など)。無いファイルは入れない。 */
    readonly errors: string[] = [];
    system: SystemInfo = { faceSize: 144, iconSize: 32 };

    private constructor(readonly dataDir: string) {}

    static load(dataDir: string): GameDatabase {
        const db = new GameDatabase(dataDir);
        const cache = new Map<string, any>();
        const read = (file: string): any => {
            if (cache.has(file)) return cache.get(file);
            let json: any = null;
            const p = path.join(dataDir, file);
            if (fs.existsSync(p)) {
                try {
                    json = JSON.parse(fs.readFileSync(p, 'utf8'));
                } catch (e) {
                    db.errors.push(file + ': ' + (e instanceof Error ? e.message : String(e)));
                }
            }
            cache.set(file, json);
            return json;
        };

        for (const kind of KINDS) {
            const names = SOURCES[kind].names(read(SOURCES[kind].file));
            db.names.set(kind, names);
            const index = new Map<string, number[]>();
            names.forEach((name, id) => {
                if (id === 0 || !name) return;
                const ids = index.get(name) || [];
                ids.push(id);
                index.set(name, ids);
            });
            db.byName.set(kind, index);
        }

        const system = read('System.json');
        if (system) {
            db.system = {
                faceSize: typeof system.faceSize === 'number' && system.faceSize > 0 ? system.faceSize : 144,
                iconSize: typeof system.iconSize === 'number' && system.iconSize > 0 ? system.iconSize : 32,
                encryptionKey: typeof system.encryptionKey === 'string' && system.encryptionKey ? system.encryptionKey : undefined
            };
            if (typeof system.currencyUnit === 'string') db.system.currencyUnit = system.currencyUnit;
            const advanced = system.advanced && typeof system.advanced === 'object' ? system.advanced : undefined;
            if (advanced && advanced.uiAreaWidth > 0) db.system.uiAreaWidth = advanced.uiAreaWidth;
            if (advanced && advanced.fontSize > 0) db.system.fontSize = advanced.fontSize;
        }

        const actors = read('Actors.json');
        if (Array.isArray(actors)) {
            for (const a of actors) {
                if (!a || !a.faceName || !a.name) continue;
                const key = faceKey(a.faceName, a.faceIndex);
                // 同じ顔を複数のアクターが使っていれば最初の1人。
                if (!db.faceOwners.has(key)) db.faceOwners.set(key, a.name);
            }
        }
        for (const kind of ICON_KINDS) {
            const records = read(SOURCES[kind].file);
            if (!Array.isArray(records)) continue;
            for (const r of records) {
                if (!r || typeof r.iconIndex !== 'number' || r.iconIndex <= 0 || typeof r.id !== 'number') continue;
                const users = db.iconUsersOf.get(r.iconIndex) || [];
                users.push({ kind, id: r.id, name: typeof r.name === 'string' ? r.name : '' });
                db.iconUsersOf.set(r.iconIndex, users);
            }
        }
        return db;
    }

    /** そのアイコンを使っているアイテム・武器・防具・スキル・ステート。 */
    iconUsers(iconIndex: number): IconUser[] {
        return this.iconUsersOf.get(iconIndex) || [];
    }

    label(kind: DbKind): string {
        return SOURCES[kind].label;
    }

    /** いちばん大きい番号。0 ならその種類は1つも無い。 */
    max(kind: DbKind): number {
        return Math.max(0, (this.names.get(kind) || []).length - 1);
    }

    lookup(kind: DbKind, id: number): Lookup {
        const max = this.max(kind);
        if (!Number.isInteger(id) || id < 1 || id > max) return { status: 'missing', id, max };
        const name = (this.names.get(kind) || [])[id];
        return name ? { status: 'named', id, name } : { status: 'unnamed', id };
    }

    /** 1 から最大までの全番号。名前が無いものも含める(一覧で「名前なし」と出すため)。 */
    entries(kind: DbKind): DbEntry[] {
        const names = this.names.get(kind) || [];
        const out: DbEntry[] = [];
        for (let id = 1; id < names.length; id++) out.push({ id, name: names[id] || '' });
        return out;
    }

    /** 同じ名前を持つ、自分以外の番号。名前が無ければ空。 */
    sameName(kind: DbKind, id: number): number[] {
        const r = this.lookup(kind, id);
        if (r.status !== 'named') return [];
        return ((this.byName.get(kind) || new Map()).get(r.name) || []).filter((other: number) => other !== id);
    }

    /** その顔を既定の顔にしているアクター名。 */
    faceOwner(faceName: string, faceIndex: number): string | undefined {
        return this.faceOwners.get(faceKey(faceName, faceIndex));
    }
}

function faceKey(faceName: string, faceIndex: number): string {
    return faceName + '\u0000' + String(faceIndex);
}

/** 番号を「0079」の4桁で出す(ツクールのデータベースと同じ表記)。 */
export function padId(id: number): string {
    return String(id).padStart(4, '0');
}
