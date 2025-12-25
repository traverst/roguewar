import { createInventory } from './inventory';
import { createEquipment } from './equipment';
import { DEFAULT_VISION } from './vision';
/**
 * A registry that holds all loaded mod content.
 * Centralized lookup for the engine to avoid hardcoding.
 */
export class ModRegistry {
    entities = new Map();
    tiles = new Map();
    items = new Map(); // Phase 11a
    manifests = new Map();
    constructor(packs = []) {
        for (const pack of packs) {
            this.registerPack(pack);
        }
    }
    registerPack(pack) {
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
    getEntity(id) {
        return this.entities.get(id);
    }
    getTile(id) {
        return this.tiles.get(id);
    }
    getItem(id) {
        return this.items.get(id);
    }
    getAllItems() {
        return Array.from(this.items.values());
    }
    /**
     * Create a concrete game Entity from a template ID.
     */
    createEntity(templateId, instanceId, pos) {
        const template = this.entities.get(templateId);
        if (!template)
            return undefined;
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
    getAllManifests() {
        return Array.from(this.manifests.values());
    }
}
