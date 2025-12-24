import { GameState, EntityType, TILE_SIZE } from '@roguewar/rules';

const COLOR_FLOOR = '#222';
const COLOR_WALL = '#555';
const COLOR_PLAYER = '#0f0';
const COLOR_ENEMY = '#ff8800'; // Orange for non-AI enemies
const COLOR_STAIRS_DOWN = '#44a'; // Blue for down stairs
const COLOR_STAIRS_UP = '#a44'; // Red for up stairs
const COLOR_EXIT = '#ff0'; // Yellow for exit

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

        // Camera offset
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        let offsetX = centerX;
        let offsetY = centerY;

        if (centerEntity) {
            offsetX -= centerEntity.pos.x * TILE_SIZE + TILE_SIZE / 2;
            offsetY -= centerEntity.pos.y * TILE_SIZE + TILE_SIZE / 2;
        } else if (state.dungeon.length > 0) {
            // Fallback: Center on dungeon map center
            const mapH = state.dungeon.length;
            const mapW = state.dungeon[0].length;
            offsetX -= (mapW * TILE_SIZE) / 2;
            offsetY -= (mapH * TILE_SIZE) / 2;
        }

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);

        // Draw tiles
        state.dungeon.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile.type === 'floor') {
                    this.ctx.fillStyle = COLOR_FLOOR;
                } else if (tile.type === 'wall') {
                    this.ctx.fillStyle = COLOR_WALL;
                } else if (tile.type === 'stairs_down') {
                    this.ctx.fillStyle = COLOR_STAIRS_DOWN;
                } else if (tile.type === 'stairs_up') {
                    this.ctx.fillStyle = COLOR_STAIRS_UP;
                } else if (tile.type === 'exit') {
                    this.ctx.fillStyle = COLOR_EXIT;
                }
                this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Draw symbols for special tiles
                if (tile.type === 'stairs_down') {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 16px monospace';
                    this.ctx.fillText('▼', x * TILE_SIZE + 6, y * TILE_SIZE + 18);
                } else if (tile.type === 'stairs_up') {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 16px monospace';
                    this.ctx.fillText('▲', x * TILE_SIZE + 6, y * TILE_SIZE + 18);
                } else if (tile.type === 'exit') {
                    this.ctx.fillStyle = '#000';
                    this.ctx.font = 'bold 20px monospace';
                    this.ctx.fillText('✦', x * TILE_SIZE + 4, y * TILE_SIZE + 20);
                }
            });
        });

        // Draw entities
        state.entities.forEach(entity => {
            // Debug: log AI entities
            if (entity.id.startsWith('ai-')) {
                console.log(`[Renderer] AI ${entity.id}: aiBehavior=${entity.aiBehavior}`);
            }

            // Determine color based on AI behavior (if present)
            if (entity.aiBehavior) {
                // AI entities - color by behavior (distinct from player green)
                switch (entity.aiBehavior) {
                    case 'CHASE':
                        this.ctx.fillStyle = '#00ffff'; // Cyan
                        break;
                    case 'ATTACK':
                        this.ctx.fillStyle = '#ff00ff'; // Magenta
                        break;
                    case 'FLEE':
                        this.ctx.fillStyle = '#ffff00'; // Yellow
                        break;
                    case 'WAIT':
                        this.ctx.fillStyle = '#ffffff'; // White
                        break;
                    default:
                        this.ctx.fillStyle = COLOR_ENEMY;
                }
            } else if (entity.id.startsWith('ai-')) {
                // AI entity without behavior yet - default to white
                this.ctx.fillStyle = '#ffffff'; // White
            } else {
                // Non-AI entities - use type color
                if (entity.type === EntityType.Player) {
                    this.ctx.fillStyle = COLOR_PLAYER;
                } else {
                    this.ctx.fillStyle = COLOR_ENEMY;
                }
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
