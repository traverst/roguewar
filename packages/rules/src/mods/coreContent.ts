import { ContentPack } from '../mods';
import { EntityType, TileType } from '../types';

export const CORE_CONTENT: ContentPack = {
    manifest: {
        id: 'core',
        version: '1.0.0',
        description: 'Standard Roguewar content'
    },
    entities: [
        {
            id: 'player',
            name: 'Hero',
            type: EntityType.Player,
            hp: 100,
            maxHp: 100,
            attack: 0,  // Base attack bonus (to-hit)
            defense: 0,  // Base defense bonus (AC = 10 + defense + dex)
            strength: 12,
            dexterity: 14,
            constitution: 13,
            intelligence: 10,
            wisdom: 11,
            charisma: 10,
            inventoryCapacity: 10,
            visionRange: 8
        },
        {
            id: 'goblin',
            name: 'Goblin',
            type: EntityType.Enemy,
            hp: 30,
            maxHp: 30,
            attack: 0,  // Base attack bonus (to-hit)
            defense: 0,  // Base defense bonus (AC = 10 + defense + dex)
            strength: 10,
            dexterity: 12,
            constitution: 10,
            intelligence: 8,
            wisdom: 8,
            charisma: 6,
            inventoryCapacity: 3,
            visionRange: 6,
            aiBehavior: {
                movementPattern: 'chase',
                detectionRange: 6,
                attackRange: 1,
                aggressionLevel: 0.8,
                fleeThreshold: 0.25,
                groupBehavior: 'independent'
            }
        }
    ],
    tiles: [
        {
            id: 'floor',
            name: 'Stone Floor',
            type: 'floor' as TileType
        },
        {
            id: 'wall',
            name: 'Dungeon Wall',
            type: 'wall' as TileType
        }
    ],
    items: [
        {
            id: 'health_potion',
            type: 'consumable',
            name: 'Health Potion',
            description: 'Restores 25 HP',
            rarity: 'common'
        },
        {
            id: 'iron_sword',
            type: 'weapon',
            name: 'Iron Sword',
            description: 'A sturdy iron blade',
            rarity: 'common',
            damage: 8,
            damageType: 'physical'
        },
        {
            id: 'leather_armor',
            type: 'armor',
            name: 'Leather Armor',
            description: 'Basic protection',
            rarity: 'common',
            armorBonus: 2,  // Light armor: +2 AC
            armorType: 'light'
        }
    ]
};
