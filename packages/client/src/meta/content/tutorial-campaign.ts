import { Campaign } from '../types';

/**
 * Tutorial Campaign - First Steps  
 * Multi-level dungeons (3, 5, 7 levels progressively)
 */
export const tutorialCampaign: Campaign = {
    id: 'campaign:tutorial',
    name: 'First Steps',
    description: 'Learn the basics of dungeon exploration and combat',
    startNodeId: 'node:tutorial-1',
    nodes: [
        {
            id: 'node:tutorial-1',
            name: 'The Entrance',
            description: 'A small cave entrance. Perfect for learning the ropes.',
            dungeonConfig: {
                dungeonSeed: 1000,
                rngSeed: 1000,
                maxLevels: 3,  // 3 level dungeon
                players: []
            },
            unlocksOnComplete: ['hero:warrior'],
            nextNodes: ['node:tutorial-2'],
            requiredNodes: []
        },
        {
            id: 'node:tutorial-2',
            name: 'Deeper Chambers',
            description: 'The dungeon grows more dangerous. Stay alert.',
            dungeonConfig: {
                dungeonSeed: 1001,
                rngSeed: 1001,
                maxLevels: 5,  // 5 level dungeon
                players: []
            },
            unlocksOnComplete: ['hero:scout'],
            nextNodes: ['node:tutorial-3'],
            requiredNodes: ['node:tutorial-1']
        },
        {
            id: 'node:tutorial-3',
            name: 'The Trial',
            description: 'Prove your worth in a final challenge.',
            dungeonConfig: {
                dungeonSeed: 1002,
                rngSeed: 1002,
                maxLevels: 7,  // 7 level dungeon
                players: []
            },
            unlocksOnComplete: ['theme:ice-caves'],
            nextNodes: [],
            requiredNodes: ['node:tutorial-2']
        }
    ]
};
