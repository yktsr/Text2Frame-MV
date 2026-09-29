import * as vscode from 'vscode';
import * as path from 'path';
import { DbContext } from './dbService';
import { LiveCommand, LiveMessage, LiveState } from './liveState';

export interface LiveSession {
    gameRoot: string;
    projectRoot: string;
    state: LiveState;
    send: (command: LiveCommand) => number;
    touched: number;
}

export class LiveService implements vscode.Disposable {
    private readonly sessions = new Map<string, LiveSession>();
    private readonly emitter = new vscode.EventEmitter<string>();
    readonly onDidChange = this.emitter.event;
    private readonly runEmitter = new vscode.EventEmitter<string>();
    readonly onDidChangeRun = this.runEmitter.event;
    private readonly debugEmitter = new vscode.EventEmitter<string>();
    readonly onDidChangeDebug = this.debugEmitter.event;

    start(gameRoot: string, projectRoot: string, send: (command: LiveCommand) => number): void {
        const old = this.sessions.get(gameRoot);
        this.sessions.set(gameRoot, { gameRoot, projectRoot, send, state: old ? old.state : new LiveState(), touched: Date.now() });
        this.emitter.fire(gameRoot);
    }

    apply(gameRoot: string, message: LiveMessage): void {
        const session = this.sessions.get(gameRoot);
        if (!session) return;
        const wasReceived = session.state.received();
        session.touched = Date.now();
        const changed = session.state.apply(message, session.touched);
        if (changed.values || !wasReceived) this.emitter.fire(gameRoot);
        if (changed.run) this.runEmitter.fire(gameRoot);
        if (changed.debug) this.debugEmitter.fire(gameRoot);
    }

    clear(gameRoot: string): void {
        if (!this.sessions.delete(gameRoot)) return;
        this.emitter.fire(gameRoot);
        this.runEmitter.fire(gameRoot);
        this.debugEmitter.fire(gameRoot);
    }

    forContext(ctx: DbContext): LiveState | undefined {
        const session = this.sessions.get(path.dirname(ctx.dataDir));
        return session && session.state.received() ? session.state : undefined;
    }

    current(): LiveSession | undefined {
        let latest: LiveSession | undefined;
        this.sessions.forEach((s) => { if (!latest || s.touched > latest.touched) latest = s; });
        return latest;
    }

    dispose(): void {
        this.emitter.dispose();
        this.runEmitter.dispose();
        this.debugEmitter.dispose();
    }
}
