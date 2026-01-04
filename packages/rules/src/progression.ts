/**
 * Progression System - Type Definitions
 * 
 * Fully data-driven, deterministic XP and leveling system.
 * All progression rules are configurable via ProgressionConfig.
 */

// =============================================================================
// XP EVENTS
// =============================================================================

/**
 * XP Event - logged when XP is earned
 * All XP gains must go through this for replay determinism
 */
export interface XPEvent {
    id: string;           // Unique event ID for logging
    amount: number;       // XP amount gained
    source: string;       // Source identifier (e.g., 'kill:goblin', 'explore:room')
    timestamp?: number;   // Game turn when earned
}

// =============================================================================
// REWARD TYPES
// =============================================================================

/**
 * Rewards granted when leveling up
 * These queue up and are applied via explicit player action
 */
export type Reward =
    | { type: 'AttributePoints'; amount: number }
    | { type: 'SkillPoints'; amount: number }
    | { type: 'MaxHP'; amount: number }
    | { type: 'AbilityUnlock'; abilityId: string }
    | { type: 'PassiveModifier'; modifierId: string };

// =============================================================================
// LEVEL DEFINITIONS
// =============================================================================

/**
 * Definition for a single level
 */
export interface LevelDefinition {
    level: number;          // Level number (1-based)
    xpRequired: number;     // Total XP needed to reach this level
    rewards: Reward[];      // Rewards granted upon reaching this level
}

// =============================================================================
// SKILLS
// =============================================================================

/**
 * Available skill categories
 * Each skill can be leveled up with skill points
 */
export type SkillType =
    // Combat Skills
    | 'melee'       // Bonus to melee attack rolls
    | 'ranged'      // Bonus to ranged attack rolls  
    | 'defense'     // Bonus to AC
    // Magic Skills
    | 'arcana'      // Magic power and spell effectiveness
    | 'evocation'   // Damage spells
    // Survival Skills
    | 'stealth'     // Avoid detection, sneak attacks
    | 'perception'  // Detect traps, hidden enemies/items
    | 'lockpicking' // Open locked chests/doors
    // Future: Add more as needed
    ;

export interface SkillDefinition {
    id: SkillType;
    name: string;
    description: string;
    maxLevel?: number;      // Optional cap per skill
}

// =============================================================================
// PROGRESSION CONFIG
// =============================================================================

/**
 * Full progression configuration
 * Loaded from editor/mod, defines the entire leveling system
 */
export interface ProgressionConfig {
    levels: LevelDefinition[];

    // Attribute constraints
    attributeCaps?: {
        baseCap: number;           // Maximum attribute value at level 1
        perLevelIncrease?: number; // Cap increases by this much per level
    };

    // Skill constraints
    skillDefinitions?: SkillDefinition[];
    skillCaps?: {
        baseCap: number;
        perLevelIncrease?: number;
    };

    // Starting values
    startingAttributes?: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };

    // XP multipliers (future: for difficulty modes)
    xpMultiplier?: number;
}

// =============================================================================
// ENTITY PROGRESSION STATE
// =============================================================================

/**
 * Progression-related state stored on entities
 * Add these fields to the Entity interface
 */
export interface EntityProgression {
    xp: number;                              // Current total XP
    level: number;                           // Current level (derived from XP)
    xpValue?: number;                        // XP granted when killed (for enemies)

    // Pending rewards (queued, not yet applied)
    pendingRewards?: Reward[];
    unspentAttributePoints?: number;
    unspentSkillPoints?: number;

    // Skills
    skills?: Partial<Record<SkillType, number>>;
}

// =============================================================================
// LEVEL-UP ACTION
// =============================================================================

/**
 * Explicit action to allocate level-up rewards
 * Must be logged for replay determinism
 */
export interface LevelUpAction {
    type: 'level_up';
    actorId: string;
    allocations: {
        attributes?: Partial<Record<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', number>>;
        skills?: Partial<Record<SkillType, number>>;
    };
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

/**
 * Default progression config (levels 1-10)
 * Provides a balanced starting point that can be customized in editor
 */
export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
    levels: [
        { level: 1, xpRequired: 0, rewards: [] },
        { level: 2, xpRequired: 100, rewards: [{ type: 'AttributePoints', amount: 2 }, { type: 'MaxHP', amount: 5 }] },
        { level: 3, xpRequired: 300, rewards: [{ type: 'AttributePoints', amount: 2 }, { type: 'SkillPoints', amount: 1 }] },
        { level: 4, xpRequired: 600, rewards: [{ type: 'AttributePoints', amount: 2 }, { type: 'MaxHP', amount: 5 }] },
        { level: 5, xpRequired: 1000, rewards: [{ type: 'AttributePoints', amount: 3 }, { type: 'SkillPoints', amount: 1 }, { type: 'MaxHP', amount: 10 }] },
        { level: 6, xpRequired: 1500, rewards: [{ type: 'AttributePoints', amount: 2 }, { type: 'MaxHP', amount: 5 }] },
        { level: 7, xpRequired: 2100, rewards: [{ type: 'AttributePoints', amount: 2 }, { type: 'SkillPoints', amount: 1 }] },
        { level: 8, xpRequired: 2800, rewards: [{ type: 'AttributePoints', amount: 2 }, { type: 'MaxHP', amount: 5 }] },
        { level: 9, xpRequired: 3600, rewards: [{ type: 'AttributePoints', amount: 2 }, { type: 'SkillPoints', amount: 1 }] },
        { level: 10, xpRequired: 4500, rewards: [{ type: 'AttributePoints', amount: 4 }, { type: 'SkillPoints', amount: 2 }, { type: 'MaxHP', amount: 15 }] },
    ],

    attributeCaps: {
        baseCap: 20,
        perLevelIncrease: 1
    },

    skillDefinitions: [
        { id: 'melee', name: 'Melee Combat', description: '+1 to melee attack rolls per level' },
        { id: 'ranged', name: 'Ranged Combat', description: '+1 to ranged attack rolls per level' },
        { id: 'defense', name: 'Defense', description: '+1 to AC per 2 levels' },
        { id: 'arcana', name: 'Arcana', description: 'Increases magic effectiveness' },
        { id: 'stealth', name: 'Stealth', description: 'Avoid enemy detection' },
        { id: 'perception', name: 'Perception', description: 'Detect traps and hidden things' },
    ],

    skillCaps: {
        baseCap: 5,
        perLevelIncrease: 1
    },

    startingAttributes: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
    },

    xpMultiplier: 1.0
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate XP required for a specific level
 */
export function getXPForLevel(level: number, config: ProgressionConfig): number {
    const levelDef = config.levels.find(l => l.level === level);
    if (levelDef) return levelDef.xpRequired;

    // If level exceeds defined levels, extrapolate
    const lastLevel = config.levels[config.levels.length - 1];
    if (!lastLevel) return 0;

    // Exponential growth for undefined levels
    const levelsAbove = level - lastLevel.level;
    const growthRate = 1.5;
    return Math.floor(lastLevel.xpRequired * Math.pow(growthRate, levelsAbove));
}

/**
 * Calculate level from current XP
 */
export function getLevelFromXP(xp: number, config: ProgressionConfig): number {
    let level = 1;
    for (const levelDef of config.levels) {
        if (xp >= levelDef.xpRequired) {
            level = levelDef.level;
        } else {
            break;
        }
    }
    return level;
}

/**
 * Get rewards for reaching a specific level
 */
export function getRewardsForLevel(level: number, config: ProgressionConfig): Reward[] {
    const levelDef = config.levels.find(l => l.level === level);
    return levelDef?.rewards || [];
}

/**
 * Calculate attribute cap for a given level
 */
export function getAttributeCap(level: number, config: ProgressionConfig): number {
    const caps = config.attributeCaps;
    if (!caps) return 30; // Default high cap
    return caps.baseCap + (caps.perLevelIncrease || 0) * (level - 1);
}

/**
 * Calculate skill cap for a given level
 */
export function getSkillCap(level: number, config: ProgressionConfig): number {
    const caps = config.skillCaps;
    if (!caps) return 10; // Default cap
    return caps.baseCap + (caps.perLevelIncrease || 0) * (level - 1);
}
