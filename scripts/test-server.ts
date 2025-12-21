import WebSocket from 'ws';
import { ClientMessage, ServerMessage } from '../packages/server/src/protocol';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
    console.log('Connected to server');

    const actionMsg: ClientMessage = {
        type: 'action',
        playerId: 'player',
        action: {
            type: 'move',
            actorId: 'player',
            payload: { dx: 1, dy: 0 }
        }
    };

    console.log('Sending action:', actionMsg);
    ws.send(JSON.stringify(actionMsg));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString()) as ServerMessage;
    console.log('Received:', msg);

    if (msg.type === 'delta') {
        console.log('SUCCESS: Received delta!');
        if (msg.events.length > 0) {
            console.log('Events:', msg.events);
        }
        ws.close();
        process.exit(0);
    } else if (msg.type === 'error') {
        console.error('ERROR:', msg.message);
        process.exit(1);
    }
});
