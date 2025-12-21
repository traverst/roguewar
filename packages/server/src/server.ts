import { WebSocketServer, WebSocket } from 'ws';
import { DungeonAuthority } from './dungeon-authority';
import { ClientMessage, ServerMessage } from './protocol';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

// Single Authoritative Instance for this server process
// In real life, we'd route based on URL path to a specific Durable Object
const authority = new DungeonAuthority(12345);

console.log(`RogueWar Authority listening on port ${PORT}`);

wss.on('connection', (ws) => {
    // Generate a temporary ID for the socket
    const playerId = 'player'; // For Phase 3 Verification, we assume single player slot 'player'
    // But if we want to confirm multiple connections don't break it:
    // const playerId = `player_${Math.random().toString(36).substring(7)}`;
    // However, the rule logic hardcodes 'player' as the hero.
    // Let's stick to 'player' to allow the client to control the hero.

    console.log(`Client connected: ${playerId}`);

    // Connect to authority
    const welcome = authority.connect(playerId);
    ws.send(JSON.stringify(welcome));

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
