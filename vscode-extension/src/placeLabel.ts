import { DatabaseService, DbContext } from './dbService';
import { padId } from './db/database';
import { eventId as eventLabelId } from './db/describe';
import { tr } from './db/lang';

/** テキストが受け持つ場所。マップのイベントのページか、コモンイベント。 */
export type Place =
    | { kind: 'event'; mapId: number; eventId?: number; pageId?: number }
    | { kind: 'common'; commonEventId: number };

const int = (v: unknown): number | undefined => {
    const n = parseInt(String(v ?? ''), 10);
    return Number.isInteger(n) ? n : undefined;
};

/** フロントマターから。 */
export function placeFromMeta(meta: { [key: string]: string }): Place | undefined {
    if (String(meta.kind || '').toLowerCase() === 'common') {
        const id = int(meta.commonEventId);
        return id === undefined ? undefined : { kind: 'common', commonEventId: id };
    }
    const mapId = int(meta.mapId);
    if (mapId === undefined) return undefined;
    return { kind: 'event', mapId, eventId: int(meta.eventId), pageId: meta.pageId ? int(meta.pageId) : undefined };
}

/** e:マップ:イベント:ページ / c:コモンイベント。ページが無ければ 1 ページ目。 */
export function placeKey(place: Place): string | undefined {
    if (place.kind === 'common') return `c:${place.commonEventId}`;
    return place.eventId === undefined ? undefined : `e:${place.mapId}:${place.eventId}:${place.pageId ?? 1}`;
}

export function placeFromKey(key: string): Place | undefined {
    const e = /^e:(\d+):(\d+):(\d+)$/.exec(key);
    if (e) return { kind: 'event', mapId: Number(e[1]), eventId: Number(e[2]), pageId: Number(e[3]) };
    const c = /^c:(\d+)$/.exec(key);
    return c ? { kind: 'common', commonEventId: Number(c[1]) } : undefined;
}

/** 「水族館 / EV028 ヤドカリ / 1ページ」「コモンイベント 0012 名前」。 */
export function placeLabel(service: DatabaseService, ctx: DbContext, place: Place | undefined): string {
    if (!place) return '';
    if (place.kind === 'common') {
        const ce = ctx.db.lookup('commonEvent', place.commonEventId);
        return tr(`コモンイベント ${padId(place.commonEventId)}${ce.status === 'named' ? ' ' + ce.name : ''}`, `Common event ${padId(place.commonEventId)}${ce.status === 'named' ? ' ' + ce.name : ''}`);
    }
    const map = ctx.db.lookup('map', place.mapId);
    const parts = [map.status === 'named' ? map.name : tr(`マップ${padId(place.mapId)}`, `Map ${padId(place.mapId)}`)];
    if (place.eventId !== undefined) {
        const ev = service.mapEvents(ctx, place.mapId)?.[place.eventId];
        parts.push(`${eventLabelId(place.eventId)}${ev && ev.name ? ' ' + ev.name : ''}`);
    }
    if (place.pageId !== undefined) parts.push(tr(`${place.pageId}ページ`, `page ${place.pageId}`));
    return parts.join(' / ');
}
