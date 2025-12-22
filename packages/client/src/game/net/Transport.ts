import { ClientMessage, ServerMessage } from './protocol'; // We will move protocol here or redefine

export interface Transport {
    /**
     * Connect to the network.
     * Host: Opens a room.
     * Peer: Connects to a room.
     * Returns the local player ID.
     */
    connect(targetId?: string): Promise<string>;

    send(msg: ClientMessage): void; // Sending INTENT

    onMessage(callback: (msg: ServerMessage) => void): void;

    disconnect(): void;
}
