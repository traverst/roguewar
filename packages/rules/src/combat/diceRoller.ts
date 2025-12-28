/**
 * Dice Rolling System
 * Supports standard dice notation (1d6, 2d8+3, etc.)
 */

export interface DiceRoll {
    notation: string;      // Original notation (e.g., "1d8+2")
    rolls: number[];       // Individual die results
    modifier: number;      // Added/subtracted modifier
    total: number;         // Final result
    naturalRoll?: number;  // For d20, the unmodified roll
}

/**
 * Roll dice using standard notation
 * @param notation - Dice notation (e.g., "1d6", "2d8+3", "1d20")
 * @returns DiceRoll result with individual rolls and total
 */
export function rollDice(notation: string): DiceRoll {
    // Parse notation: NdS+M or NdS-M or NdS
    const match = notation.match(/(\d+)d(\d+)(([+-])(\d+))?/i);

    if (!match) {
        console.error('[Dice] Invalid notation:', notation);
        return {
            notation,
            rolls: [0],
            modifier: 0,
            total: 0
        };
    }

    const numDice = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const sign = match[4] || '+';
    const modifier = match[5] ? parseInt(match[5]) * (sign === '-' ? -1 : 1) : 0;

    // Roll the dice
    const rolls: number[] = [];
    for (let i = 0; i < numDice; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    // Calculate total
    const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollSum + modifier;

    // Store natural roll for d20 (used for crits/fumbles)
    const naturalRoll = (notation.toLowerCase().includes('d20') && rolls.length === 1)
        ? rolls[0]
        : undefined;

    return {
        notation,
        rolls,
        modifier,
        total,
        naturalRoll
    };
}

/**
 * Roll with advantage (roll twice, take higher)
 * Only works with single die rolls
 */
export function rollWithAdvantage(notation: string): DiceRoll {
    const roll1 = rollDice(notation);
    const roll2 = rollDice(notation);

    return roll1.total >= roll2.total ? roll1 : roll2;
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * Only works with single die rolls
 */
export function rollWithDisadvantage(notation: string): DiceRoll {
    const roll1 = rollDice(notation);
    const roll2 = rollDice(notation);

    return roll1.total <= roll2.total ? roll1 : roll2;
}

/**
 * Calculate ability modifier from ability score (D&D 5e style)
 * @param score - Ability score (3-18 in classic D&D)
 * @returns Modifier (-4 to +4 for 3-18 range)
 */
export function getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

/**
 * Test dice roller
 */
if (typeof window !== 'undefined') {
    (window as any).testDice = () => {
        console.log('=== Testing Dice Roller ===');

        // Test basic rolls
        console.log('1d6:', rollDice('1d6'));
        console.log('2d8+3:', rollDice('2d8+3'));
        console.log('1d20:', rollDice('1d20'));
        console.log('3d6:', rollDice('3d6'));

        // Test modifiers
        console.log('1d8+2:', rollDice('1d8+2'));
        console.log('2d4-1:', rollDice('2d4-1'));

        // Test advantage/disadvantage
        console.log('1d20 with advantage:', rollWithAdvantage('1d20'));
        console.log('1d20 with disadvantage:', rollWithDisadvantage('1d20'));

        // Test ability modifiers
        console.log('Ability 3 modifier:', getAbilityModifier(3));  // -4
        console.log('Ability 10 modifier:', getAbilityModifier(10)); // 0
        console.log('Ability 18 modifier:', getAbilityModifier(18)); // +4

        console.log('=== Dice Tests Complete ===');
    };
}
