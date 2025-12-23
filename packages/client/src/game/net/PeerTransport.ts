import Peer, { DataConnection } from 'peerjs';
import { Transport } from './Transport';
import { ClientMessage, ServerMessage } from './protocol';

/**
 * Transport for a client connecting to a Host.
 */
export class PeerTransport implements Transport {
    private peer: Peer;
    private conn: DataConnection | null = null;

    // Buffer for messages before callback is registered
    private messageQueue: ServerMessage[] = [];

    private messageCallback: ((msg: ServerMessage) => void) | null = null;
    private logger: (msg: string) => void;

    constructor(logger: (msg: string) => void = console.log) {
        // Explicitly configure PeerJS cloud server  
        this.peer = new Peer({
            host: '0.peerjs.com',
            port: 443,
            path: '/',
            secure: true,
            debug: 3,  // Maximum debug output
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        this.logger = logger;
    }

    private async internalConnect(targetId: string): Promise<DataConnection> {
        return new Promise((resolve, reject) => {
            // If peer isn't open yet, wait for it
            if (!this.peer.id) {
                this.peer.once('open', () => {
                    this.internalConnect(targetId).then(resolve).catch(reject);
                });
                return;
            }

            this.logger(`Attempting to connect to ${targetId}...`);
            const conn = this.peer.connect(targetId);
            const timeout = setTimeout(() => reject("Connection timed out"), 15000);

            conn.on('open', () => {
                clearTimeout(timeout);
                this.conn = conn;
                conn.on('data', (data) => {
                    console.log("[PeerTransport] Data received, type:", typeof data);
                    if (typeof data === 'string') {
                        try {
                            const parsed = JSON.parse(data);
                            console.log("[PeerTransport] Parsed message:", parsed.type);
                            this.dispatch(parsed as ServerMessage);
                        } catch (e) {
                            console.error("[PeerTransport] Failed to parse JSON:", e);
                        }
                    } else {
                        console.log("[PeerTransport] Object message:", data.type);
                        this.dispatch(data as ServerMessage);
                    }
                });
                resolve(conn);
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                console.error("Peer connection error:", err);
                reject(err);
            });

            conn.on('close', () => {
                this.logger("Connection closed");
            });
        });
    }

    async connect(targetId: string, userId: string): Promise<string> {
        const conn = await this.internalConnect(targetId);
        this.logger(`Connected to Host: ${targetId}. Sending identity: ${userId}`);
        // Give Host time to wire up listeners
        await new Promise(r => setTimeout(r, 500));
        conn.send({ type: 'identity', userId });
        return this.peer.id;
    }

    async spectate(targetId: string): Promise<string> {
        const conn = await this.internalConnect(targetId);
        console.log("[PeerTransport] Connected to Host, sending spectate message...");
        this.logger(`Connected to Host: ${targetId} as SPECTATOR.`);
        // Give Host time to wire up listeners
        await new Promise(r => setTimeout(r, 500));
        const msg = { type: 'spectate' };
        console.log("[PeerTransport] Sending:", msg);
        conn.send(msg);
        console.log("[PeerTransport] Spectate message sent");
        return this.peer.id;
    }

    private dispatch(msg: ServerMessage) {
        console.log("[PeerTransport] dispatch() called, callback exists:", !!this.messageCallback, "msg type:", msg.type);
        if (this.messageCallback) {
            console.log("[PeerTransport] Calling callback immediately");
            this.messageCallback(msg);
        } else {
            console.log("[PeerTransport] Queueing message, queue length:", this.messageQueue.length);
            this.messageQueue.push(msg);
        }
    }

    send(msg: ClientMessage): void {
        if (this.conn && this.conn.open) {
            this.conn.send(msg);
        } else {
            console.warn("Cannot send, not connected");
        }
    }

    onMessage(callback: (msg: ServerMessage) => void): void {
        console.log("[PeerTransport] onMessage() called, queue length:", this.messageQueue.length);
        this.messageCallback = callback;
        // Flush queue
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift()!;
            console.log("[PeerTransport] Flushing queued message:", msg.type);
            this.messageCallback(msg);
        }
        console.log("[PeerTransport] Queue flushed");
    }

    disconnect(): void {
        if (this.conn) {
            this.conn.close();
        }
        this.peer.destroy();
    }
}
