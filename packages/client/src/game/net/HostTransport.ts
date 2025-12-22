import Peer, { DataConnection } from 'peerjs';
import { Transport } from './Transport';
import { ClientMessage, ServerMessage } from './protocol';
import { HostEngine, AuthorityMessage } from '@roguewar/authority';

/**
 * Transport for the HOST.
 * It does NOT send over network to itself.
 * It manages the HostEngine and broadcasts to peers.
 */
export class HostTransport implements Transport {
    private peer: Peer;
    private engine: HostEngine;
    private connections: Map<string, DataConnection> = new Map();
    private localPlayerId: string | null = null;

    // Buffer for messages before callback is registered
    private messageQueue: ServerMessage[] = [];

    // Callback for when the *Host* receives a delta (from the engine)
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
        this.engine = new HostEngine();
        this.logger = logger;
    }

    async connect(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.peer.on('open', (id) => {
                this.logger(`Host initialized. Share this ID: ${id}`);
                this.localPlayerId = id;

                // Host also "joins" the game logic
                const result = this.engine.connect(id);
                // Host gets welcome manually (no network)
                this.dispatch(result.welcome);

                // Broadcast Join to everyone ELSE.
                this.broadcast(result.broadcast, id);

                resolve(id);
            });

            this.peer.on('error', (err) => {
                // Log but don't reject immediately as some errors are non-fatal
                console.error("Host Peer Error:", err);
            });

            this.peer.on('connection', (conn) => {
                this.logger(`Host received connection from: ${conn.peer}`);

                conn.on('open', () => {
                    this.logger(`Peer connected: ${conn.peer}`);
                    this.connections.set(conn.peer, conn);

                    // Connect peer to Engine
                    const { welcome, broadcast } = this.engine.connect(conn.peer);

                    // Send Welcome to Peer (PeerJS auto-serializes)
                    conn.send(welcome);

                    // Broadcast Join to EVERYONE ELSE
                    this.broadcast(broadcast, conn.peer);
                });

                conn.on('data', (data) => {
                    try {
                        // PeerJS auto-deserializes, data is already an object
                        const msg = data as ClientMessage;
                        if (msg.type === 'action') {
                            this.processAction(msg.playerId, msg.action);
                        }
                    } catch (e) {
                        console.error("Host Error parsing data", e);
                    }
                });

                conn.on('close', () => {
                    this.connections.delete(conn.peer);
                    this.logger(`Peer disconnected: ${conn.peer}`);
                });

                conn.on('error', (err) => {
                    this.logger(`Host Connection Error with peer ${conn.peer}: ${err.type || err}`);
                });
            });
        });
    }

    private processAction(playerId: string, action: any) {
        const result = this.engine.processAction(playerId, action);
        if (result.type === 'delta') {
            this.broadcast(result);
        } else if (result.type === 'error') {
            const conn = this.connections.get(playerId);
            if (conn) conn.send(result);
        }
    }

    private broadcast(msg: ServerMessage, excludeId?: string) {
        // 1. Send to network peers (PeerJS auto-serializes)
        for (const [peerId, conn] of this.connections) {
            if (peerId !== excludeId && conn.open) {
                conn.send(msg);
            }
        }

        // 2. Loopback to Host (local)
        if (this.localPlayerId !== excludeId) {
            this.dispatch(msg);
        }
    }

    private dispatch(msg: ServerMessage) {
        if (this.messageCallback) {
            this.messageCallback(msg);
        } else {
            this.messageQueue.push(msg);
        }
    }

    send(msg: ClientMessage): void {
        // Host sending an action (loopback)
        if (this.localPlayerId) {
            this.processAction(this.localPlayerId, msg.action);
        }
    }

    onMessage(callback: (msg: ServerMessage) => void): void {
        this.messageCallback = callback;
        // Flush queue
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift()!;
            this.messageCallback(msg);
        }
    }

    disconnect(): void {
        this.peer.destroy();
    }
}
