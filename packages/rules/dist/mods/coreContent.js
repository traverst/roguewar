import { EntityType } from '../types';
export const CORE_CONTENT = {
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
            attack: 10,
            defense: 5,
            inventoryCapacity: 10,
            visionRange: 8
        },
        {
            id: 'goblin',
            name: 'Goblin',
            type: EntityType.Enemy,
            hp: 30,
            maxHp: 30,
            attack: 5,
            defense: 2,
            inventoryCapacity: 3,
            visionRange: 6
        }
    ],
    tiles: [
        {
            id: 'floor',
            name: 'Stone Floor',
            type: 'floor'
        },
        {
            id: 'wall',
            name: 'Dungeon Wall',
            type: 'wall'
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
            defense: 3
        }
    ]
};
