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
            attack: 10
        },
        {
            id: 'goblin',
            name: 'Goblin',
            type: EntityType.Enemy,
            hp: 30,
            maxHp: 30,
            attack: 5
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
    ]
};
