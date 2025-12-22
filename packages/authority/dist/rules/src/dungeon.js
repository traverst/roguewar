import { randomInt } from './rng.js';
export class DungeonGenerator {
    width;
    height;
    tiles;
    rooms;
    rng;
    constructor(width, height, rng) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.rooms = [];
        this.rng = rng;
    }
    generate() {
        // Initialize with walls
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({ type: 'wall', seen: false });
            }
            this.tiles.push(row);
        }
        const maxRooms = 15;
        const minSize = 4;
        const maxSize = 10;
        for (let i = 0; i < maxRooms; i++) {
            const w = randomInt(this.rng, minSize, maxSize);
            const h = randomInt(this.rng, minSize, maxSize);
            const x = randomInt(this.rng, 1, this.width - w - 1);
            const y = randomInt(this.rng, 1, this.height - h - 1);
            const newRoom = new Room(x, y, w, h);
            let failed = false;
            for (const other of this.rooms) {
                if (newRoom.intersects(other)) {
                    failed = true;
                    break;
                }
            }
            if (!failed) {
                this.createRoom(newRoom);
                const center = newRoom.center();
                if (this.rooms.length > 0) {
                    const prevCenter = this.rooms[this.rooms.length - 1].center();
                    if (randomInt(this.rng, 0, 2) === 1) {
                        this.createHTunnel(prevCenter.x, center.x, prevCenter.y);
                        this.createVTunnel(prevCenter.y, center.y, center.x);
                    }
                    else {
                        this.createVTunnel(prevCenter.y, center.y, prevCenter.x);
                        this.createHTunnel(prevCenter.x, center.x, center.y);
                    }
                }
                this.rooms.push(newRoom);
            }
        }
        const spawn = this.rooms[0].center();
        const enemies = this.rooms.slice(1).map(r => r.center());
        return { tiles: this.tiles, spawn, enemies };
    }
    createRoom(room) {
        for (let y = room.y1; y < room.y2; y++) {
            for (let x = room.x1; x < room.x2; x++) {
                this.tiles[y][x].type = 'floor';
            }
        }
    }
    createHTunnel(x1, x2, y) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            this.tiles[y][x].type = 'floor';
        }
    }
    createVTunnel(y1, y2, x) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            this.tiles[y][x].type = 'floor';
        }
    }
}
class Room {
    x1;
    y1;
    x2;
    y2;
    constructor(x, y, w, h) {
        this.x1 = x;
        this.y1 = y;
        this.x2 = x + w;
        this.y2 = y + h;
    }
    intersects(other) {
        return (this.x1 <= other.x2 && this.x2 >= other.x1 &&
            this.y1 <= other.y2 && this.y2 >= other.y1);
    }
    center() {
        return {
            x: Math.floor((this.x1 + this.x2) / 2),
            y: Math.floor((this.y1 + this.y2) / 2)
        };
    }
}
