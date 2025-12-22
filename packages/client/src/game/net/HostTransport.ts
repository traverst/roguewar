import Peer, { DataConnection } from 'peerjs';
import { Transport } from './Transport';
import { ClientMessage, ServerMessage } from './protocol';
import { HostEngine } from '@roguewar/authority';

/**
 * Transport for the HOST.
 * It does NOT send over network to itself.
 * It manages the HostEngine and broadcasts to peers.
 */
export class HostTransport implements Transport {
    private peer: Peer;
    public engine: HostEngine; // Public so UI can spawn AI
    private connections: Map<string, DataConnection> = new Map();
    private localPlayerId: string | null = null;

    // Buffer for messages before callback is registered
    private messageQueue: ServerMessage[] = [];

    // Callback for when the *Host* receives a delta (from the engine)
    private messageCallback: ((msg: ServerMessage) => void) | null = null;
    private logger: (msg: string) => void;

    constructor(logger: (msg: string) => void = console.log, engine?: HostEngine, requestedPeerId?: string) {
        // Explicitly configure PeerJS cloud server
        this.peer = new Peer(requestedPeerId as any, {
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
        this.engine = engine || new HostEngine();
        this.logger = logger;
    }

    async connect(_targetId?: string, userId?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.peer.on('open', (id) => {
                this.logger(`Host initialized. Share this ID: ${id}`);
                this.localPlayerId = id;

                // Host also "joins" the game logic using their persistent userId
                const result = this.engine.connect(id, userId);
                // Host gets welcome manually (no network)
                this.dispatch(result.welcome);

                // Broadcast Join to everyone ELSE.
                this.broadcast(result.broadcast, id);

                resolve(id);
            });

            this.peer.on('error', (err) => {
                this.logger(`Host Peer Error: ${err}`);
                reject(err);
            });

            this.peer.on('connection', (conn) => {
                this.logger(`Host received connection from: ${conn.peer}`);

                conn.on('open', () => {
                    this.logger(`Peer connection open: ${conn.peer}. Waiting for identity...`);
                    this.connections.set(conn.peer, conn);
                    // We WAIT for 'identity' message before calling engine.connect
                });

                conn.on('data', (data) => {
                    try {
                        const msg = data as ClientMessage;
                        if (msg.type === 'identity') {
                            this.logger(`Peer identity received: ${conn.peer} -> ${msg.userId}`);
                            const { welcome, broadcast } = this.engine.connect(conn.peer, msg.userId);
                            conn.send(welcome);
                            this.broadcast(broadcast, conn.peer);
                        } else if (msg.type === 'action') {
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
        if (msg.type === 'action' && this.localPlayerId) {
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

    /**
     * Spawn an AI player and broadcast the join event to all clients.
     */
    public spawnAI(id?: string): string {
        const result = this.engine.spawnAI(id);

        // Broadcast the join to all clients (including local)
        this.broadcast(result.broadcast);

        return result.welcome.playerId;
    }
}
