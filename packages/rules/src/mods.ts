import { EntityType, TileType, Entity, Position } from './types';
import { ItemTemplate } from './schemas';
import { createInventory } from './inventory';
import { createEquipment } from './equipment';
import { DEFAULT_VISION } from './vision';
// Base types are exported from index.ts, not here, to avoid collisions.

export interface ModManifest {
    id: string;
    version: string;
    description: string;
    dependencies?: string[];
    hash?: string;
}

export interface EntityTemplate {
    id: string; // e.g., 'goblin', 'dragon'
    name: string;
    type: EntityType;
    icon?: string;  // Visual icon emoji for rendering (e.g., '👺')
    sprite?: string;  // Sprite template name (e.g., 'goblin', 'orc')
    hp: number;
    maxHp: number;
    attack: number;
    defense?: number;
    description?: string;
    inventoryCapacity?: number; // Phase 11a
    visionRange?: number;       // Phase 11a

    // D&D Ability Scores
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;

    // AI Behavior Configuration
    aiBehavior?: {
        movementPattern?: 'stationary' | 'patrol' | 'wander' | 'chase';
        detectionRange?: number;
        attackRange?: number;
        aggressionLevel?: number;
        fleeThreshold?: number;
        groupBehavior?: 'independent' | 'pack' | 'defensive';
    };
}

export interface TileTemplate {
    id: string;
    name: string;
    type: TileType;
    description?: string;
}

export interface ContentPack {
    manifest: ModManifest;
    entities: EntityTemplate[];
    tiles: TileTemplate[];
    items: ItemTemplate[]; // Phase 11a
}

/**
 * A registry that holds all loaded mod content.
 * Centralized lookup for the engine to avoid hardcoding.
 */
export class ModRegistry {
    private entities: Map<string, EntityTemplate> = new Map();
    private tiles: Map<string, TileTemplate> = new Map();
    private items: Map<string, ItemTemplate> = new Map(); // Phase 11a
    private manifests: Map<string, ModManifest> = new Map();

    constructor(packs: ContentPack[] = []) {
        for (const pack of packs) {
            this.registerPack(pack);
        }
    }

    public registerPack(pack: ContentPack) {
        this.manifests.set(pack.manifest.id, pack.manifest);

        for (const entity of pack.entities) {
            // Namespace the ID to prevent collisions, e.g., 'core:goblin'
            const namespacedId = `${pack.manifest.id}:${entity.id}`;
            this.entities.set(namespacedId, entity);
        }

        for (const tile of pack.tiles) {
            const namespacedId = `${pack.manifest.id}:${tile.id}`;
            this.tiles.set(namespacedId, tile);
        }

        // Phase 11a: Register items
        for (const item of pack.items || []) {
            const namespacedId = `${pack.manifest.id}:${item.id}`;
            this.items.set(namespacedId, item);
        }
    }

    public getEntity(id: string): EntityTemplate | undefined {
        return this.entities.get(id);
    }

    public getTile(id: string): TileTemplate | undefined {
        return this.tiles.get(id);
    }

    public getItem(id: string): ItemTemplate | undefined {
        return this.items.get(id);
    }

    public getAllItems(): ItemTemplate[] {
        return Array.from(this.items.values());
    }

    /**
     * Create a concrete game Entity from a template ID.
     */
    public createEntity(templateId: string, instanceId: string, pos: Position): Entity | undefined {
        const template = this.entities.get(templateId);
        if (!template) return undefined;

        return {
            id: instanceId,
            type: template.type,
            templateId: templateId,
            pos: { ...pos },
            hp: template.hp,
            maxHp: template.maxHp,
            attack: template.attack,
            defense: template.defense,
            // Phase 11a: Add inventory, equipment, vision
            inventory: createInventory(template.inventoryCapacity || 10),
            equipment: createEquipment(),
            vision: {
                ...DEFAULT_VISION,
                range: template.visionRange || DEFAULT_VISION.range
            }
        };
    }

    public getAllManifests(): ModManifest[] {
        return Array.from(this.manifests.values());
    }
}
