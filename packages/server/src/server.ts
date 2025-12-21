import { WebSocketServer, WebSocket } from 'ws';
import { DungeonAuthority } from './dungeon-authority.js';
import { ClientMessage, ServerMessage } from './protocol.js';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

// Single Authoritative Instance for this server process
// In real life, we'd route based on URL path to a specific Durable Object
const authority = new DungeonAuthority(12345);

interface Client {
    ws: WebSocket;
    playerId: string;
}

const clients = new Set<Client>();

console.log(`RogueWar Authority listening on port ${PORT}`);

wss.on('connection', (ws) => {
    // Generate unique player ID
    // random string for now
    const playerId = `player_${Math.floor(Math.random() * 10000)}`;
    console.log(`Client connected: ${playerId}`);

    // Connect to authority
    const { welcome, broadcast } = authority.connect(playerId);

    const client: Client = { ws, playerId };
    clients.add(client);

    // Send welcome to new client
    ws.send(JSON.stringify(welcome));

    // Broadcast join delta to EVERYONE (including the new player, to confirm spawn?)
    // Actually, welcome includes the state *with* the new player.
    // So new player doesn't strictly need the delta, but sending it is fine (idempotent).
    // But existing players NEED it.
    const deltaMsg = JSON.stringify(broadcast);
    for (const c of clients) {
        if (c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(deltaMsg);
        }
    }

    ws.on('message', (data) => {
        try {
            const raw = data.toString();
            const msg = JSON.parse(raw) as ClientMessage;

            if (msg.type === 'action') {
                const response = authority.processAction(msg.playerId, msg.action);

                // Broadcast delta to ALL clients (including sender)
                // In optimization, we might not send to sender if they predict, 
                // but Phase 3 goal is "Broadcasts state deltas".
                const responseStr = JSON.stringify(response);
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(responseStr);
                    }
                });
            }
        } catch (e) {
            console.error("Invalid message", e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${playerId}`);
    });
});
