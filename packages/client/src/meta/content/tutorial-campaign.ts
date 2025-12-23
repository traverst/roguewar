import { Campaign } from '../types';

/**
 * Tutorial Campaign - First Steps
 * A 3-node linear campaign teaching basic mechanics
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
                players: []
            },
            unlocksOnComplete: [],
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
                players: []
            },
            unlocksOnComplete: [],
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
                players: []
            },
            unlocksOnComplete: ['hero:warrior'], // Unlock warrior hero
            nextNodes: [],
            requiredNodes: ['node:tutorial-2']
        }
    ]
};
