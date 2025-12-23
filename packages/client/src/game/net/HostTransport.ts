import Peer, { DataConnection } from 'peerjs';
import { Transport } from './Transport';
import { ClientMessage, ServerMessage } from './protocol';
import { HostEngine } from '@roguewar/authority';
import { ModRegistry } from '@roguewar/rules';

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
    private onLogUpdate: ((log: any) => void) | null = null;

    // Buffer for messages before callback is registered
    private messageQueue: ServerMessage[] = [];

    // Callback for when the *Host* receives a delta (from the engine)
    private messageCallback: ((msg: ServerMessage) => void) | null = null;
    private logger: (msg: string) => void;

    constructor(logger: (msg: string) => void = console.log, engine?: HostEngine, requestedPeerId?: string, registry?: ModRegistry, gameName?: string) {
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
        this.engine = engine || new HostEngine(undefined, undefined, registry, gameName);
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

                if (this.onLogUpdate) this.onLogUpdate(this.engine.getGameLog());

                resolve(id);
            });

            this.peer.on('error', (err) => {
                this.logger(`Host Peer Error: ${err}`);
                reject(err);
            });

            this.peer.on('connection', (conn) => {
                this.logger(`Host received connection from: ${conn.peer}`);

                const setupConnection = () => {
                    this.logger(`Peer connection open: ${conn.peer}. Waiting for identity...`);
                    this.connections.set(conn.peer, conn);

                    conn.on('data', (data) => {
                        console.log("[HostTransport] Received data from", conn.peer, "type:", typeof data);
                        try {
                            const msg = (typeof data === 'string' ? JSON.parse(data) : data) as ClientMessage;
                            console.log("[HostTransport] Message type:", msg.type);

                            if (msg.type === 'identity') {
                                this.logger(`Peer identity received: ${conn.peer} -> ${msg.userId}`);
                                const { welcome, broadcast } = this.engine.connect(conn.peer, msg.userId);

                                const payload = JSON.stringify(welcome);
                                conn.send(payload);

                                this.broadcast(broadcast, conn.peer);
                                if (this.onLogUpdate) this.onLogUpdate(this.engine.getGameLog());

                            } else if (msg.type === 'spectate') {
                                console.log("[HostTransport] Processing spectate request from", conn.peer);
                                this.logger(`Peer connected as SPECTATOR: ${conn.peer}`);
                                const welcome = {
                                    type: 'welcome' as const,
                                    playerId: `spectator-${conn.peer.slice(0, 4)}`,
                                    initialState: this.engine.getState(),
                                    mods: this.engine.getGameLog().config.mods || [],
                                    connectedEntityIds: this.engine.getConnectedEntityIds()
                                };
                                const payload = JSON.stringify(welcome);
                                console.log("[HostTransport] Sending spectate welcome, payload length:", payload.length);
                                conn.send(payload);
                                console.log("[HostTransport] Spectate welcome sent");
                            } else if (msg.type === 'action') {
                                this.processAction(conn.peer, msg.action);
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
                };

                if (conn.open) {
                    setupConnection();
                } else {
                    conn.on('open', setupConnection);
                }
            });
        });
    }

    private processAction(playerId: string, action: any) {
        const result = this.engine.processAction(playerId, action);
        if (result.type === 'delta') {
            this.broadcast(result);
            if (this.onLogUpdate) this.onLogUpdate(this.engine.getGameLog());
        } else if (result.type === 'error') {
            const conn = this.connections.get(playerId);
            if (conn) conn.send(result);
        }
    }

    public setLogUpdateCallback(callback: (log: any) => void) {
        this.onLogUpdate = callback;
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
