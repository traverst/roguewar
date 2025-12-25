import { GameState, EntityType, TILE_SIZE, Entity, computeVisibility, VisibilityMap, getTileVisibility } from '@roguewar/rules';

const COLOR_FLOOR = '#222';
const COLOR_WALL = '#555';
const COLOR_PLAYER = '#0f0';
const COLOR_ENEMY = '#ff8800'; // Orange for non-AI enemies
const COLOR_STAIRS_DOWN = '#44a'; // Blue for down stairs
const COLOR_STAIRS_UP = '#a44'; // Red for up stairs
const COLOR_EXIT = '#ff0'; // Yellow for exit
const COLOR_GROUND_ITEM = '#a4f'; // Purple for items on ground

// Fog of war colors
const COLOR_FOG_UNSEEN = '#000';
const COLOR_FOG_SEEN = 'rgba(0, 0, 0, 0.6)';

export class CanvasRenderer {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    width: number;
    height: number;

    // Fog of war - track previously seen tiles PER LEVEL
    // Key is level number, value is set of "x,y" coordinate keys
    private seenTilesPerLevel: Map<number, Set<string>> = new Map();
    private fogEnabled: boolean = true;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.width = canvas.width;
        this.height = canvas.height;
    }

    setFogEnabled(enabled: boolean) {
        this.fogEnabled = enabled;
    }

    render(state: GameState, localPlayerId?: string | null) {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Find player to center camera
        let centerEntity = state.entities.find(e => e.id === localPlayerId);
        if (!centerEntity) {
            centerEntity = state.entities.find(e => e.type === EntityType.Player);
        }

        // Compute visibility for the local player
        let visMap: VisibilityMap | null = null;
        const currentLevel = state.currentLevel || 0;

        // Get or create seen tiles set for this level
        if (!this.seenTilesPerLevel.has(currentLevel)) {
            this.seenTilesPerLevel.set(currentLevel, new Set());
        }
        const seenTiles = this.seenTilesPerLevel.get(currentLevel)!;

        if (this.fogEnabled && centerEntity) {
            visMap = computeVisibility(state, centerEntity, seenTiles);

            // Update seen tiles for this level
            for (const [key, visibility] of visMap) {
                if (visibility === 'visible_now') {
                    seenTiles.add(key);
                }
            }
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
                const visibility = visMap ? getTileVisibility(visMap, x, y) : 'visible_now';

                // Skip unseen tiles entirely (black)
                if (visibility === 'unseen') {
                    this.ctx.fillStyle = COLOR_FOG_UNSEEN;
                    this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    return;
                }

                // Draw tile
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

                // Apply fog overlay for previously seen tiles
                if (visibility === 'seen_previously') {
                    this.ctx.fillStyle = COLOR_FOG_SEEN;
                    this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            });
        });

        // Draw ground items (only if visible)
        if (state.groundItems) {
            state.groundItems.forEach(item => {
                const visibility = visMap ? getTileVisibility(visMap, item.pos.x, item.pos.y) : 'visible_now';
                if (visibility === 'visible_now') {
                    this.ctx.fillStyle = COLOR_GROUND_ITEM;
                    const size = TILE_SIZE * 0.5;
                    const offset = (TILE_SIZE - size) / 2;
                    this.ctx.fillRect(item.pos.x * TILE_SIZE + offset, item.pos.y * TILE_SIZE + offset, size, size);

                    // Item indicator
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 10px monospace';
                    this.ctx.fillText('!', item.pos.x * TILE_SIZE + 10, item.pos.y * TILE_SIZE + 15);
                }
            });
        }

        // Draw entities (only if visible or no fog)
        state.entities.forEach(entity => {
            const visibility = visMap ? getTileVisibility(visMap, entity.pos.x, entity.pos.y) : 'visible_now';

            // Only show entities in visible tiles (or all if no fog)
            if (visibility !== 'visible_now' && visMap) {
                return;
            }

            // Determine color
            if (entity.aiBehavior) {
                switch (entity.aiBehavior) {
                    case 'CHASE': this.ctx.fillStyle = '#00ffff'; break;
                    case 'ATTACK': this.ctx.fillStyle = '#ff00ff'; break;
                    case 'FLEE': this.ctx.fillStyle = '#ffff00'; break;
                    case 'WAIT': this.ctx.fillStyle = '#ffffff'; break;
                    default: this.ctx.fillStyle = COLOR_ENEMY;
                }
            } else if (entity.id.startsWith('ai-')) {
                this.ctx.fillStyle = '#ffffff';
            } else {
                if (entity.type === EntityType.Player) {
                    this.ctx.fillStyle = COLOR_PLAYER;
                } else {
                    this.ctx.fillStyle = COLOR_ENEMY;
                }
            }

            this.ctx.fillRect(entity.pos.x * TILE_SIZE, entity.pos.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Highlight Local Player
            if (localPlayerId && entity.id === localPlayerId) {
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(entity.pos.x * TILE_SIZE, entity.pos.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        });

        this.ctx.restore();

        // Draw UI overlay - Turn, HP, Level
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        if (centerEntity && centerEntity.type === EntityType.Player) {
            this.ctx.fillText(`Turn: ${state.turn} | HP: ${centerEntity.hp}/${centerEntity.maxHp} | Level: ${(state.currentLevel || 0) + 1}/${state.maxLevels || 1}`, 10, 20);
        } else {
            this.ctx.fillText(`Turn: ${state.turn} | Spectating`, 10, 20);
        }

        // Draw inventory panel (bottom left)
        this.renderInventoryPanel(centerEntity);
    }

    private renderInventoryPanel(player: Entity | undefined) {
        if (!player || !player.inventory) return;

        const panelX = 10;
        const panelY = this.height - 150;
        const panelW = 200;
        const panelH = 140;

        // Panel background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(panelX, panelY, panelW, panelH);
        this.ctx.strokeStyle = '#444';
        this.ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Title
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.fillText('INVENTORY', panelX + 10, panelY + 18);

        // Items
        this.ctx.font = '11px monospace';
        this.ctx.fillStyle = '#fff';
        const slots = player.inventory.slots;
        if (slots.length === 0) {
            this.ctx.fillStyle = '#666';
            this.ctx.fillText('(empty)', panelX + 10, panelY + 40);
        } else {
            slots.slice(0, 5).forEach((slot, i) => {
                const itemName = slot.itemId.split(':').pop() || slot.itemId;
                const text = slot.quantity > 1 ? `${itemName} x${slot.quantity}` : itemName;
                this.ctx.fillText(`${i + 1}. ${text}`, panelX + 10, panelY + 40 + i * 16);
            });
            if (slots.length > 5) {
                this.ctx.fillStyle = '#666';
                this.ctx.fillText(`...and ${slots.length - 5} more`, panelX + 10, panelY + 40 + 5 * 16);
            }
        }

        // Equipment summary
        if (player.equipment) {
            const equipped = Object.entries(player.equipment.slots).filter(([_, v]) => v);
            if (equipped.length > 0) {
                this.ctx.fillStyle = '#8af';
                this.ctx.fillText('Equipped: ' + equipped.map(([k, _]) => k[0].toUpperCase()).join(','), panelX + 10, panelY + panelH - 10);
            }
        }
    }

    // Reset fog - clears all levels or a specific level
    resetFog(level?: number) {
        if (level !== undefined) {
            this.seenTilesPerLevel.delete(level);
        } else {
            this.seenTilesPerLevel.clear();
        }
    }
}
