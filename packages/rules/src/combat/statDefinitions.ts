/**
 * Stat Definition Schema
 * Defines how stats affect gameplay through configurable effects
 */

export type EffectType =
    | 'modify_stat'        // Passive stat modification (e.g., strength → attack)
    | 'chance_on_attack'   // Trigger on attacking (critical hits)
    | 'chance_on_defend'   // Trigger on being attacked (dodge)
    | 'on_attack_hit'      // Always trigger when attack lands (lifesteal)
    | 'on_turn_start';     // Per-turn effects (regeneration)

export type EffectActionType =
    | 'multiply_damage'    // Increase damage by multiplier
    | 'add_damage'         // Flat damage increase
    | 'negate_damage'      // Cancel incoming damage
    | 'heal'               // Restore HP
    | 'modify_turn_order'; // Change action speed

export interface EffectAction {
    type: EffectActionType;
    multiplier?: number;      // For multiply_damage
    amount?: string;          // Formula string for calculations
}

export interface StatEffect {
    type: EffectType;
    target?: string;          // For modify_stat (which stat to modify)
    formula?: string;         // Formula for calculations (uses 'value' variable)
    chance?: string;          // Formula for chance-based effects
    timing?: 'on_equip' | 'in_combat' | 'always';
    effect?: EffectAction;    // What happens when effect triggers
}

export interface StatDefinition {
    key: string;              // Unique identifier (e.g., 'strength', 'critBonus')
    name: string;             // Display name
    icon: string;             // Emoji icon
    description: string;      // What the stat does
    category: 'core' | 'derived' | 'bonus';
    baseValue?: number;       // Default starting value
    effects: StatEffect[];    // List of effects this stat provides
}

export interface CombatEvent {
    type: 'damage' | 'heal' | 'critical_hit' | 'dodge' | 'lifesteal' | 'regeneration';
    entityId?: string;
    amount?: number;
    [key: string]: any;
}

export interface CombatResult {
    damage: number;
    events: CombatEvent[];
}

// Example stat definitions
export const DEFAULT_STAT_DEFINITIONS: Record<string, StatDefinition> = {
    strength: {
        key: 'strength',
        name: 'Strength',
        icon: '💪',
        description: 'Increases physical damage',
        category: 'core',
        baseValue: 10,
        effects: [
            {
                type: 'modify_stat',
                target: 'attack',
                formula: 'Math.floor(value / 10)',
                timing: 'always'
            }
        ]
    },

    constitution: {
        key: 'constitution',
        name: 'Constitution',
        icon: '❤️',
        description: 'Increases max HP and regeneration',
        category: 'core',
        baseValue: 10,
        effects: [
            {
                type: 'modify_stat',
                target: 'maxHp',
                formula: 'Math.floor(value / 5)',
                timing: 'always'
            },
            {
                type: 'on_turn_start',
                effect: {
                    type: 'heal',
                    amount: 'Math.floor(value / 20)'
                }
            }
        ]
    },

    attack: {
        key: 'attack',
        name: 'Attack',
        icon: '⚔️',
        description: 'Base damage dealt in combat',
        category: 'derived',
        baseValue: 5,
        effects: []
    },

    defense: {
        key: 'defense',
        name: 'Defense',
        icon: '🛡️',
        description: 'Reduces incoming damage',
        category: 'derived',
        baseValue: 2,
        effects: []
    },

    critBonus: {
        key: 'critBonus',
        name: 'Critical Hit Chance',
        icon: '💥',
        description: 'Chance to deal double damage',
        category: 'bonus',
        baseValue: 0,
        effects: [
            {
                type: 'chance_on_attack',
                chance: 'value',
                effect: {
                    type: 'multiply_damage',
                    multiplier: 2
                }
            }
        ]
    },

    dodgeBonus: {
        key: 'dodgeBonus',
        name: 'Dodge Chance',
        icon: '🌊',
        description: 'Chance to avoid incoming damage',
        category: 'bonus',
        baseValue: 0,
        effects: [
            {
                type: 'chance_on_defend',
                chance: 'value',
                effect: {
                    type: 'negate_damage'
                }
            }
        ]
    },

    lifestealBonus: {
        key: 'lifestealBonus',
        name: 'Lifesteal',
        icon: '🩸',
        description: 'Percentage of damage dealt returned as HP',
        category: 'bonus',
        baseValue: 0,
        effects: [
            {
                type: 'on_attack_hit',
                effect: {
                    type: 'heal',
                    amount: 'damageDealt * (value / 100)'
                }
            }
        ]
    },

    regenerationBonus: {
        key: 'regenerationBonus',
        name: 'Regeneration',
        icon: '💚',
        description: 'HP restored per turn',
        category: 'bonus',
        baseValue: 0,
        effects: [
            {
                type: 'on_turn_start',
                effect: {
                    type: 'heal',
                    amount: 'value'
                }
            }
        ]
    },

    speedBonus: {
        key: 'speedBonus',
        name: 'Speed',
        icon: '⚡',
        description: 'Affects turn order and movement',
        category: 'bonus',
        baseValue: 0,
        effects: [
            {
                type: 'modify_stat',
                target: 'turnPriority',
                formula: 'value',
                timing: 'always'
            }
        ]
    }
};
