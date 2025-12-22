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

    async connect(targetId: string, userId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // Failsafe timeout
            const timeout = setTimeout(() => {
                reject("Connection timed out (15s). Host not found or blocked.");
            }, 15000);

            let myPeerId: string;

            this.peer.on('open', (id) => {
                this.logger('My Peer ID is: ' + id);
                myPeerId = id;

                // Now that we're connected to signaling server, connect to target
                this.logger(`Attempting to connect to ${targetId}...`);
                const conn = this.peer.connect(targetId);

                conn.on('open', () => {
                    clearTimeout(timeout);
                    this.logger(`Connected to Host: ${targetId}. Sending identity: ${userId}`);
                    this.conn = conn;

                    // Immediately send identity
                    this.conn.send({ type: 'identity', userId });

                    resolve(myPeerId);
                });

                conn.on('data', (data) => {
                    const msg = data as ServerMessage;
                    this.dispatch(msg);
                });

                conn.on('error', (err) => {
                    this.logger(`Connection Error: ${err.type || err}`);
                    reject(`Conn Error: ${err.type}`);
                });

                conn.on('close', () => {
                    this.logger("Connection closed");
                });
            });

            this.peer.on('error', (err) => {
                this.logger(`Peer Error: ${err.type || err}`);
                reject(`Peer Error: ${err.type}`);
            });
        });
    }

    private dispatch(msg: ServerMessage) {
        if (this.messageCallback) {
            this.messageCallback(msg);
        } else {
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
        this.messageCallback = callback;
        // Flush queue
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift()!;
            this.messageCallback(msg);
        }
    }

    disconnect(): void {
        if (this.conn) {
            this.conn.close();
        }
        this.peer.destroy();
    }
}
