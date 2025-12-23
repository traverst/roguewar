import { EntityType, TileType, Entity, Position } from './types';
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
    hp: number;
    maxHp: number;
    attack: number;
    description?: string;
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
}

/**
 * A registry that holds all loaded mod content.
 * Centralized lookup for the engine to avoid hardcoding.
 */
export class ModRegistry {
    private entities: Map<string, EntityTemplate> = new Map();
    private tiles: Map<string, TileTemplate> = new Map();
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
    }

    public getEntity(id: string): EntityTemplate | undefined {
        return this.entities.get(id);
    }

    public getTile(id: string): TileTemplate | undefined {
        return this.tiles.get(id);
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
            attack: template.attack
        };
    }

    public getAllManifests(): ModManifest[] {
        return Array.from(this.manifests.values());
    }
}
