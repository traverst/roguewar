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

    render(state: GameState, localPlayerId?: string | null) {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Find player to center camera
        // If localPlayerId is known, center on THAT player. Otherwise find ANY player (fallback).
        let centerEntity = state.entities.find(e => e.id === localPlayerId);
        if (!centerEntity) {
            centerEntity = state.entities.find(e => e.type === EntityType.Player);
        }

        if (!centerEntity) return;

        // Camera offset
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        const offsetX = centerX - centerEntity.pos.x * TILE_SIZE - TILE_SIZE / 2;
        const offsetY = centerY - centerEntity.pos.y * TILE_SIZE - TILE_SIZE / 2;

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

            // Highlight Local Player
            if (localPlayerId && entity.id === localPlayerId) {
                this.ctx.strokeStyle = '#ffd700'; // Gold
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(entity.pos.x * TILE_SIZE, entity.pos.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        });

        this.ctx.restore();

        // Draw UI overlay
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        if (centerEntity && centerEntity.type === EntityType.Player) {
            this.ctx.fillText(`Turn: ${state.turn} | HP: ${centerEntity.hp}/${centerEntity.maxHp}`, 10, 20);
        } else {
            this.ctx.fillText(`Turn: ${state.turn} | Spectating`, 10, 20);
        }
    }
}
