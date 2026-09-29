import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { injectMonitor, LIVE_EVENTS_PATH, LIVE_STATE_PATH, LIVE_TOKEN_HEADER } from './liveMonitor';
import { LiveCommand, LiveMessage, parseLiveMessage } from './liveState';

/**
 * テストプレイ用に、ゲームのフォルダ(index.html のあるフォルダ)を HTTP で配る。VS Code に依存しない。
 *
 * ツクール MV / MZ のゲームは HTML5 なので、ブラウザで index.html を開けば動く。ただし file:// では
 * data/*.json や画像を読めないので、ローカルの HTTP サーバーを通す。拡張ホスト(node)の中で開き、
 * 自分のマシン(127.0.0.1)からしか繋げない。フォルダの外のファイルは返さない。
 * 反映したデータがすぐ効くよう、キャッシュはさせない。
 */

const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.wasm': 'application/wasm',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.efkefc': 'application/octet-stream'
};

export interface GameServerOptions {
    onState?: (message: LiveMessage) => void;
}

interface Live {
    token: string;
    onState: (message: LiveMessage) => void;
    listeners: Set<http.ServerResponse>;
}

const EVENTS_KEEPALIVE = 15000;

const MAX_STATE_BYTES = 4 * 1024 * 1024;

export interface GameServer {
    /** 配っているフォルダ。 */
    root: string;
    port: number;
    /** 末尾に / の付いた URL(http://127.0.0.1:port/)。 */
    url: string;
    send(command: LiveCommand): number;
    close(): Promise<void>;
}

/**
 * フォルダごとに決まったポート番号。ブラウザのセーブデータ(localStorage など)はポートごとに分かれるので、
 * 毎回同じ番号にしておけば、前回のセーブが残る。空いていなければ空いている番号を使う。
 */
export function stablePort(root: string): number {
    const hash = crypto.createHash('md5').update(path.resolve(root)).digest().readUInt32BE(0);
    return 40000 + (hash % 20000);
}

/** URL のパスを、フォルダの中のファイルに直す。フォルダの外を指していれば undefined。 */
export function resolveRequestPath(root: string, urlPath: string): string | undefined {
    let decoded: string;
    try {
        decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    } catch (e) {
        return undefined;
    }
    if (decoded.includes('\0')) return undefined;
    const base = path.resolve(root);
    const file = path.resolve(base, '.' + path.posix.normalize('/' + decoded.replace(/\\/g, '/')));
    return file === base || file.startsWith(base + path.sep) ? file : undefined;
}

const sameToken = (live: Live, token: unknown): boolean =>
    typeof token === 'string' && token.length === live.token.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(live.token));

function receiveState(live: Live, req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method !== 'POST' || !sameToken(live, req.headers[LIVE_TOKEN_HEADER])) {
        res.writeHead(403).end();
        return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_STATE_BYTES) {
            res.writeHead(413).end();
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => {
        if (res.writableEnded) return;
        let message: LiveMessage | undefined;
        try {
            message = parseLiveMessage(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
            message = undefined;
        }
        if (!message) {
            res.writeHead(400).end();
            return;
        }
        res.writeHead(204).end();
        live.onState(message);
    });
}

function openEvents(live: Live, req: http.IncomingMessage, res: http.ServerResponse): void {
    const token = new URL(req.url || '/', 'http://127.0.0.1').searchParams.get('token');
    if (req.method !== 'GET' || !sameToken(live, token)) {
        res.writeHead(403).end();
        return;
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    live.listeners.add(res);
    const keepalive = setInterval(() => res.write(': keepalive\n\n'), EVENTS_KEEPALIVE);
    res.on('close', () => {
        clearInterval(keepalive);
        live.listeners.delete(res);
    });
}

function handle(root: string, req: http.IncomingMessage, res: http.ServerResponse, live: Live | undefined): void {
    const urlPath = (req.url || '').split('?')[0];
    if (live && urlPath === LIVE_STATE_PATH) {
        receiveState(live, req, res);
        return;
    }
    if (live && urlPath === LIVE_EVENTS_PATH) {
        openEvents(live, req, res);
        return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
    }
    let file = resolveRequestPath(root, req.url || '/');
    if (!file) {
        res.writeHead(403).end();
        return;
    }
    let stat: fs.Stats;
    try {
        stat = fs.statSync(file);
        if (stat.isDirectory()) {
            file = path.join(file, 'index.html');
            stat = fs.statSync(file);
        }
    } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
    }
    const ext = path.extname(file).toLowerCase();
    if (live && ext === '.html') {
        let html: Buffer;
        try {
            html = Buffer.from(injectMonitor(fs.readFileSync(file, 'utf8'), live.token), 'utf8');
        } catch (e) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'no-store', 'Content-Length': html.length });
        res.end(req.method === 'HEAD' ? undefined : html);
        return;
    }
    const headers: http.OutgoingHttpHeaders = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'bytes'
    };
    // 動画(ムービーの再生)の <video> は範囲を指定して読みにくる。
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    if (range && (range[1] || range[2])) {
        if (range[1]) {
            start = Number(range[1]);
            if (range[2]) end = Math.min(Number(range[2]), end);
        } else {
            start = Math.max(0, stat.size - Number(range[2])); // 末尾から n バイト
        }
        if (start > end || start >= stat.size) {
            res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end();
            return;
        }
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = stat.size === 0 ? 0 : end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || stat.size === 0) {
        res.end();
        return;
    }
    fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
}

function listen(server: http.Server, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const onError = (e: Error) => { server.off('listening', onListening); reject(e); };
        const onListening = () => {
            server.off('error', onError);
            const address = server.address();
            resolve(typeof address === 'object' && address ? address.port : port);
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, '127.0.0.1');
    });
}

/** フォルダを配るサーバーを開く。preferredPort が埋まっていれば空いている番号で開く。 */
export async function startGameServer(root: string, preferredPort = stablePort(root), options: GameServerOptions = {}): Promise<GameServer> {
    const base = path.resolve(root);
    const live: Live | undefined = options.onState
        ? { token: crypto.randomBytes(16).toString('hex'), onState: options.onState, listeners: new Set() }
        : undefined;
    const server = http.createServer((req, res) => handle(base, req, res, live));
    let port: number;
    try {
        port = await listen(server, preferredPort);
    } catch (e) {
        port = await listen(server, 0);
    }
    return {
        root: base,
        port,
        url: `http://127.0.0.1:${port}/`,
        send: (command) => {
            if (!live) return 0;
            const data = `data: ${JSON.stringify(command)}\n\n`;
            live.listeners.forEach((res) => res.write(data));
            return live.listeners.size;
        },
        close: () => new Promise<void>((resolve) => {
            server.close(() => resolve());
            server.closeAllConnections?.();
        })
    };
}
