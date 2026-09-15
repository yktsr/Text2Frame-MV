import { padId } from './db/database';
import { CommandMark } from './db/runLines';

export type LiveValue = number | string | boolean;

export interface RunFrame {
    key: string;
    index: number;
}

export interface LiveMessage {
    reset?: boolean;
    switches?: Map<number, boolean>;
    variables?: Map<number, LiveValue>;
    selfSwitches?: Map<string, boolean>;
    items?: Map<string, number>;
    gold?: number;
    actors?: number[];
    map?: number;
    pages?: Map<number, number>;
    parallel?: Parallels;
    visit?: string;
    paused?: { reason: string; frames: RunFrame[] };
    resumed?: boolean;
    run?: RunFrame[];
    lists?: Map<string, CommandMark[]>;
}

const MAX_ID = 100000;
const MAX_FRAMES = 32;
const MAX_LISTS = 64;
const MAX_COMMANDS = 100000;
const MAX_COUNT = 1000000000;
const MAX_PAGES = 9999;
const MAX_ACTORS = 1000;
const MAX_PARALLEL = 10000;

export const RUN_KEY = /^(?:e:\d{1,6}:\d{1,6}:\d{1,4}|c:\d{1,6})$/;

export const SELF_SWITCH_KEY = /^(\d{1,6}),(\d{1,6}),([A-Za-z0-9_]{1,16})$/;

export const ITEM_KEY = /^([iwa]):(\d{1,6})$/;

export interface Parallels {
    events: number[];
    commons: number[];
}

export interface LiveCommand {
    switches?: Record<number, boolean>;
    variables?: Record<number, number | string>;
    selfSwitches?: Record<string, boolean>;
    items?: Record<string, number>;
    gold?: number;
    visit?: { mapId?: number; eventId?: number; pageId?: number; x?: number; y?: number; run?: boolean; common?: number };
    reload?: boolean;
    breakpoints?: Record<string, number[]>;
    debug?: 'continue' | 'next' | 'stepIn' | 'stepOut' | 'pause';
}

export function selfSwitchKey(mapId: number, eventId: number, letter: string): string {
    return `${mapId},${eventId},${letter}`;
}

export function parseVariableInput(text: string): { value: number | string } | { error: string } {
    const t = text.trim();
    if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) {
        const n = Number(t);
        if (Number.isFinite(n)) return { value: n };
    }
    const error = { error: '数字か、"…" で囲んだ文字を入れてください。' };
    if (!/^".*"$/.test(t)) return error;
    try {
        const s = JSON.parse(t);
        return typeof s === 'string' ? { value: s } : error;
    } catch (e) {
        return error;
    }
}

export function parseCountInput(text: string): { value: number } | { error: string } {
    const t = text.trim();
    const n = Number(t);
    return /^\d+$/.test(t) && n <= MAX_COUNT ? { value: n } : { error: '0 以上の整数を入れてください。' };
}

export function parseLiveMessage(json: unknown): LiveMessage | undefined {
    if (!json || typeof json !== 'object' || Array.isArray(json)) return undefined;
    const o = json as Record<string, unknown>;
    const read = <T extends LiveValue>(value: unknown, ok: (v: unknown) => v is T): Map<number, T> | undefined => {
        if (value === undefined) return undefined;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('bad');
        const out = new Map<number, T>();
        for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
            const id = Number(key);
            if (!Number.isInteger(id) || id < 1 || id > MAX_ID || !ok(v)) throw new Error('bad');
            out.set(id, v);
        }
        return out;
    };
    const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
    const isValue = (v: unknown): v is LiveValue =>
        typeof v === 'boolean' || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
    const readSelf = (value: unknown): Map<string, boolean> | undefined => {
        if (value === undefined) return undefined;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('bad');
        const out = new Map<string, boolean>();
        for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
            if (!SELF_SWITCH_KEY.test(key) || typeof v !== 'boolean') throw new Error('bad');
            out.set(key, v);
        }
        return out;
    };
    const isCount = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
    const readItems = (value: unknown): Map<string, number> | undefined => {
        if (value === undefined) return undefined;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('bad');
        const out = new Map<string, number>();
        for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
            if (!ITEM_KEY.test(key) || !isCount(v, MAX_COUNT)) throw new Error('bad');
            out.set(key, v);
        }
        return out;
    };
    const readPages = (value: unknown): Map<number, number> | undefined => {
        if (value === undefined) return undefined;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('bad');
        const out = new Map<number, number>();
        for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
            const id = Number(key);
            if (!Number.isInteger(id) || id < 1 || id > MAX_ID || !isCount(v, MAX_PAGES)) throw new Error('bad');
            out.set(id, v);
        }
        return out;
    };
    const readRun = (value: unknown): RunFrame[] | undefined => {
        if (value === undefined) return undefined;
        if (!Array.isArray(value) || value.length > MAX_FRAMES) throw new Error('bad');
        return value.map((f) => {
            if (!f || typeof f !== 'object' || !RUN_KEY.test(String(f.key)) || !isCount(f.index, MAX_COMMANDS)) throw new Error('bad');
            return { key: String(f.key), index: f.index as number };
        });
    };
    const readLists = (value: unknown): Map<string, CommandMark[]> | undefined => {
        if (value === undefined) return undefined;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('bad');
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length > MAX_LISTS) throw new Error('bad');
        const out = new Map<string, CommandMark[]>();
        for (const [key, list] of entries) {
            if (!RUN_KEY.test(key) || !Array.isArray(list) || list.length > MAX_COMMANDS) throw new Error('bad');
            out.set(key, list.map((m) => {
                if (!Array.isArray(m) || m.length !== 3 || !isCount(m[0], 99999) || !isCount(m[1], 99999) || !isCount(m[2], 0xffffffff)) throw new Error('bad');
                return [m[0], m[1], m[2]] as CommandMark;
            }));
        }
        return out;
    };
    const readPaused = (value: unknown): { reason: string; frames: RunFrame[] } | undefined => {
        if (value === undefined) return undefined;
        const v = value as { reason?: unknown; frames?: unknown };
        if (!v || typeof v !== 'object' || !['breakpoint', 'step', 'pause'].includes(String(v.reason))) throw new Error('bad');
        return { reason: String(v.reason), frames: readRun(v.frames) || [] };
    };
    if (o.map !== undefined && !isCount(o.map, MAX_ID)) return undefined;
    if (o.gold !== undefined && !isCount(o.gold, MAX_COUNT)) return undefined;
    if (o.visit !== undefined && !(typeof o.visit === 'string' && /^[A-Za-z]{1,20}$/.test(o.visit))) return undefined;
    const ids = (v: unknown): v is number[] => Array.isArray(v) && v.length <= MAX_PARALLEL && v.every((a) => isCount(a, MAX_ID) && a > 0);
    const parallel = o.parallel as { events?: unknown; commons?: unknown } | undefined;
    if (parallel !== undefined && !(parallel && typeof parallel === 'object' && ids(parallel.events) && ids(parallel.commons))) return undefined;
    if (o.actors !== undefined && !(Array.isArray(o.actors) && o.actors.length <= MAX_ACTORS && o.actors.every((a) => isCount(a, MAX_ID) && a > 0))) return undefined;
    try {
        return {
            reset: o.reset === true || undefined,
            switches: read(o.switches, isBoolean),
            variables: read(o.variables, isValue),
            selfSwitches: readSelf(o.selfSwitches),
            items: readItems(o.items),
            gold: o.gold as number | undefined,
            actors: o.actors as number[] | undefined,
            map: o.map as number | undefined,
            pages: readPages(o.pages),
            parallel: parallel ? { events: parallel.events as number[], commons: parallel.commons as number[] } : undefined,
            visit: o.visit as string | undefined,
            paused: readPaused(o.paused),
            resumed: o.resumed === true || undefined,
            run: readRun(o.run),
            lists: readLists(o.lists)
        };
    } catch (e) {
        return undefined;
    }
}

export interface LiveSnapshot {
    switches: Array<[number, boolean]>;
    variables: Array<[number, LiveValue]>;
    selfSwitches: string[];
    items: Array<[string, number]>;
    gold: number;
    actors: number[];
    parallel: Parallels;
    pages: Array<[number, number]>;
    mapId: number;
}

export interface LiveChanges {
    switches: number[];
    variables: number[];
    selfSwitches: string[];
    items: string[];
    gold: boolean;
}

export const LIVE_TIMEOUT = 5000;
export const RECENT_CHANGE = 3000;

export class LiveState {
    private readonly switches = new Map<number, boolean>();
    private readonly variables = new Map<number, LiveValue>();
    private readonly selfSwitches = new Map<string, boolean>();
    private readonly items = new Map<string, number>();
    private pages = new Map<number, number>();
    private gold = 0;
    private actors: number[] = [];
    private parallel: Parallels = { events: [], commons: [] };
    private readonly changedAt = new Map<string, number>();
    private readonly lists = new Map<string, CommandMark[]>();
    private frames: RunFrame[] = [];
    lastSeen = 0;
    mapId = 0;
    /** 「このイベントから試す」の、ゲームからの返事。 */
    lastVisit?: { result: string; at: number };
    resets = 0;
    paused?: { reason: string; frames: RunFrame[]; at: number };

    apply(message: LiveMessage, now: number): { values: boolean; run: boolean; debug: boolean } {
        this.lastSeen = now;
        if (message.visit) this.lastVisit = { result: message.visit, at: now };
        let debug = false;
        if (message.reset) this.resets++;
        if ((message.reset || message.resumed) && this.paused) {
            this.paused = undefined;
            debug = true;
        }
        if (message.paused) {
            this.paused = { reason: message.paused.reason, frames: message.paused.frames, at: now };
            debug = true;
        }
        let changed = false;
        let run = false;
        if (message.reset) {
            this.switches.clear();
            this.variables.clear();
            this.selfSwitches.clear();
            this.items.clear();
            this.gold = 0;
            this.actors = [];
            this.parallel = { events: [], commons: [] };
            this.pages = new Map();
            this.changedAt.clear();
            this.lists.clear();
            run = this.frames.length > 0;
            this.frames = [];
            changed = true;
        }
        message.lists?.forEach((marks, key) => {
            this.lists.set(key, marks);
            run = true;
        });
        if (message.run && JSON.stringify(message.run) !== JSON.stringify(this.frames)) {
            this.frames = message.run;
            run = true;
        }
        if (message.map !== undefined && message.map !== this.mapId) {
            this.mapId = message.map;
            this.pages = new Map();
            changed = true;
        }
        if (message.pages && JSON.stringify(Array.from(message.pages)) !== JSON.stringify(Array.from(this.pages))) {
            this.pages = message.pages;
            changed = true;
        }
        const merge = <K extends number | string, T extends LiveValue>(kind: 'switch' | 'variable' | 'self' | 'item', into: Map<K, T>, values: Map<K, T> | undefined, blank: T): void => {
            values?.forEach((v, id) => {
                const before = into.has(id) ? into.get(id) : blank;
                into.set(id, v);
                if (v === before) return;
                changed = true;
                if (!message.reset) this.changedAt.set(`${kind}:${id}`, now);
            });
        };
        merge('switch', this.switches, message.switches, false);
        merge('variable', this.variables, message.variables, 0);
        merge('self', this.selfSwitches, message.selfSwitches, false);
        merge('item', this.items, message.items, 0);
        if (message.parallel && JSON.stringify(message.parallel) !== JSON.stringify(this.parallel)) {
            this.parallel = message.parallel;
            changed = true;
        }
        if (message.actors && message.actors.join(',') !== this.actors.join(',')) {
            this.actors = message.actors;
            changed = true;
        }
        if (message.gold !== undefined && message.gold !== this.gold) {
            this.gold = message.gold;
            changed = true;
            if (!message.reset) this.changedAt.set('gold:', now);
        }
        return { values: changed, run, debug };
    }

    running(): RunFrame[] {
        return this.frames;
    }

    listMarks(key: string): CommandMark[] | undefined {
        return this.lists.get(key);
    }

    connected(now: number): boolean {
        return now - this.lastSeen < LIVE_TIMEOUT;
    }

    switchValue(id: number): boolean {
        return this.switches.get(id) ?? false;
    }

    variableValue(id: number): LiveValue {
        return this.variables.get(id) ?? 0;
    }

    selfSwitchValue(mapId: number, eventId: number, letter: string): boolean {
        return this.selfSwitches.get(selfSwitchKey(mapId, eventId, letter)) ?? false;
    }

    goldValue(): number {
        return this.gold;
    }

    itemCount(key: string): number {
        return this.items.get(key) ?? 0;
    }

    eventPage(eventId: number): number | undefined {
        return this.pages.get(eventId) || undefined;
    }

    received(): boolean {
        return this.lastSeen > 0;
    }

    snapshot(): LiveSnapshot {
        return {
            switches: Array.from(this.switches).filter(([, v]) => v),
            variables: Array.from(this.variables).filter(([, v]) => v !== 0),
            selfSwitches: Array.from(this.selfSwitches).filter(([, v]) => v).map(([k]) => k),
            items: Array.from(this.items).filter(([, v]) => v > 0),
            gold: this.gold,
            actors: this.actors,
            parallel: this.parallel,
            pages: Array.from(this.pages),
            mapId: this.mapId
        };
    }

    changedSince(since: number): LiveChanges {
        const out: LiveChanges = { switches: [], variables: [], selfSwitches: [], items: [], gold: false };
        this.changedAt.forEach((at, key) => {
            if (at <= since) return;
            const colon = key.indexOf(':');
            const kind = key.slice(0, colon);
            const id = key.slice(colon + 1);
            if (kind === 'switch') out.switches.push(Number(id));
            else if (kind === 'variable') out.variables.push(Number(id));
            else if (kind === 'item') out.items.push(id);
            else if (kind === 'gold') out.gold = true;
            else out.selfSwitches.push(id);
        });
        return out;
    }

    sinceChange(kind: 'switch' | 'variable', id: number, now: number): number | undefined {
        const at = this.changedAt.get(`${kind}:${id}`);
        return at === undefined ? undefined : now - at;
    }
}

export function formatLiveValue(kind: 'switch' | 'variable', value: LiveValue): string {
    if (kind === 'switch') return value ? 'ON' : 'OFF';
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

const RANGE_LIST_LIMIT = 10;

export function selfSwitchLine(state: LiveState, mapId: number, eventId: number, letter: string, now: number): string {
    const head = state.connected(now) ? 'テストプレイ中' : 'テストプレイの最後の値';
    return `${head}: セルフスイッチ ${letter} = ${state.selfSwitchValue(mapId, eventId, letter) ? 'ON' : 'OFF'}`;
}

export function liveLine(state: LiveState, kind: string, id: number, endId: number | undefined, now: number): string | undefined {
    if (kind !== 'switch' && kind !== 'variable') return undefined;
    const head = state.connected(now) ? 'テストプレイ中' : 'テストプレイの最後の値';
    const value = (n: number): LiveValue => (kind === 'switch' ? state.switchValue(n) : state.variableValue(n));
    const last = Math.min(endId ?? id, MAX_ID);
    if (last <= id) return `${head}: ${formatLiveValue(kind, value(id))}`;
    const ids: number[] = [];
    for (let n = id; n <= last; n++) ids.push(n);
    if (kind === 'switch') {
        const on = ids.filter((n) => state.switchValue(n));
        const shown = on.slice(0, RANGE_LIST_LIMIT).map(padId).join(', ');
        return `${head}: ON ${on.length}件 / ${ids.length}件${on.length ? ` (${shown}${on.length > RANGE_LIST_LIMIT ? ', …' : ''})` : ''}`;
    }
    const shown = ids.slice(0, RANGE_LIST_LIMIT).map((n) => `${padId(n)} = ${formatLiveValue(kind, value(n))}`).join(', ');
    return `${head}: ${shown}${ids.length > RANGE_LIST_LIMIT ? ', …' : ''}`;
}
