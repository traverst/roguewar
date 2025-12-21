import { GameState, EntityType, TILE_SIZE } from '@roguewar/rules';

const COLOR_FLOOR = '#222';
const COLOR_WALL = '#555';
const COLOR_PLAYER = '#0f0';
const COLOR_ENEMY = '#f00';

export class CanvasRenderer {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    width: number;
    height: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.width = canvas.width;
        this.height = canvas.height;
    }

    render(state: GameState) {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Find player to center camera
        const player = state.entities.find(e => e.type === EntityType.Player);
        if (!player) return;

        // Camera offset (player is in center)
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        const offsetX = centerX - player.pos.x * TILE_SIZE - TILE_SIZE / 2;
        const offsetY = centerY - player.pos.y * TILE_SIZE - TILE_SIZE / 2;

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);

        // Draw tiles
        state.dungeon.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile.type === 'floor') {
                    this.ctx.fillStyle = COLOR_FLOOR;
                } else if (tile.type === 'wall') {
                    this.ctx.fillStyle = COLOR_WALL;
                }
                this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            });
        });

        // Draw entities
        state.entities.forEach(entity => {
            if (entity.type === EntityType.Player) {
                this.ctx.fillStyle = COLOR_PLAYER;
            } else {
                this.ctx.fillStyle = COLOR_ENEMY;
            }
            this.ctx.fillRect(entity.pos.x * TILE_SIZE, entity.pos.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        this.ctx.restore();

        // Draw UI overlay
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Turn: ${state.turn} | HP: ${player.hp}/${player.maxHp}`, 10, 20);
    }
}
