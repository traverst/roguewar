const { PeerServer } = require('peer');

const port = 9000;

const peerServer = PeerServer({
    port: port,
    path: '/roguewar',
    allow_discovery: true,
    corsOptions: {
        origin: '*'
    }
});

console.log(`RogueWar Signaling Server running on port ${port}`);
console.log(`Path: /roguewar`);
