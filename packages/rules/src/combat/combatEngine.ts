/**
 * D20 Combat Engine
 * Dice-based combat resolution using D&D-style mechanics
 */

import { StatDefinition, CombatResult, CombatEvent } from './statDefinitions';
import { evaluateFormula } from './formulaEvaluator';
import { rollDice, getAbilityModifier } from './diceRoller';
import {
    getEffectiveStats,
    calculateEffectiveStat,
    getEquippedWeapon,
    getEquippedArmor
} from './combatHelpers';

/**
 * Resolve an attack between two entities using D20 system
 * @param attacker - The attacking entity
 * @param target - The target entity
 * @param statDefs - Stat definition map
 * @returns Combat result with damage and events
 */
export function resolveAttack(
    attacker: any,
    target: any,
    statDefs: Record<string, StatDefinition>
): CombatResult {
    const events: CombatEvent[] = [];

    console.log('[Combat] Attack:', attacker.name || attacker.id, '→', target.name || target.id);

    // === STEP 1: ATTACK ROLL (d20 + modifiers) ===
    const attackRoll = rollDice('1d20');
    const naturalRoll = attackRoll.naturalRoll || 0;

    // Get attack bonuses
    const attackBonus = attacker.attack || 0;
    const dexMod = getAbilityModifier(attacker.dexterity || 10);

    // Get weapon attack bonus
    const weapon = getEquippedWeapon(attacker);
    const weaponAttackBonus = weapon?.attackBonus || 0;

    const totalAttackRoll = attackRoll.total + attackBonus + dexMod + weaponAttackBonus;

    console.log(`[Combat] Attack Roll: d20=${naturalRoll}, total=${totalAttackRoll} (base:${attackBonus}, dex:${dexMod}, weapon:${weaponAttackBonus})`);

    // === STEP 2: CALCULATE TARGET DEFENSE (AC) ===
    // D&D 5e style: Base AC 10 + armor bonus + magic bonus + dex mod
    const BASE_AC = 10;
    const targetDexMod = getAbilityModifier(target.dexterity || 10);
    const armor = getEquippedArmor(target);

    // Get armor bonuses (new system: armor ADDS to AC)
    const armorBonus = armor?.armorBonus || armor?.defense || 0;  // Support both new and legacy field names
    const magicBonus = armor?.magicBonus || 0;

    // Final AC: higher = harder to hit
    const targetAC = BASE_AC + armorBonus + magicBonus + targetDexMod;

    console.log(`[Combat] Target AC: ${targetAC} (base:${BASE_AC} + armor:${armorBonus} + magic:${magicBonus} + dex:${targetDexMod})`);

    // === STEP 3: CHECK HIT ===
    // Natural 1 = automatic miss
    if (naturalRoll === 1) {
        console.log('[Combat] FUMBLE! Natural  1 - auto miss');
        events.push({
            type: 'damage',
            entityId: attacker.id,
            amount: 0,
            miss: true,
            fumble: true,
            attackRoll: totalAttackRoll,
            targetAC
        } as any);
        return { damage: 0, events };
    }

    // Natural 20 = automatic hit + crit
    const isCritical = naturalRoll === 20;
    const isHit = isCritical || totalAttackRoll >= targetAC;

    if (!isHit) {
        console.log(`[Combat] MISS! ${totalAttackRoll} < ${targetAC}`);
        events.push({
            type: 'damage',
            entityId: attacker.id,
            amount: 0,
            miss: true,
            attackRoll: totalAttackRoll,
            targetAC
        } as any);
        return { damage: 0, events };
    }

    console.log(`[Combat] HIT! ${totalAttackRoll} >= ${targetAC}${isCritical ? ' (CRITICAL!)' : ''}`);

    // === STEP 4: DAMAGE ROLL ===
    // Get weapon damage dice
    const weaponDamage = weapon?.damage || '1d4'; // Default punch damage
    const damageRoll = rollDice(weaponDamage);

    // Get strength modifier
    const strMod = getAbilityModifier(attacker.strength || 10);

    // Calculate base damage
    let totalDamage = damageRoll.total + strMod;

    console.log(`[Combat] Damage Roll: ${weaponDamage}=${damageRoll.total}, str:${strMod}`);

    // Critical hit: double damage dice (roll again and add)
    if (isCritical) {
        const critRoll = rollDice(weaponDamage);
        totalDamage = damageRoll.total + critRoll.total + strMod;

        console.log(`[Combat] CRITICAL! Extra ${weaponDamage}=${critRoll.total}, total damage: ${totalDamage}`);

        events.push({
            type: 'critical_hit',
            entityId: attacker.id,
            amount: totalDamage,
            attackRoll: totalAttackRoll,
            targetAC,
            damageRolls: [...damageRoll.rolls, ...critRoll.rolls],
            damageNotation: weaponDamage
        } as any);
    } else {
        events.push({
            type: 'damage',
            entityId: attacker.id,
            amount: totalDamage,
            attackRoll: totalAttackRoll,
            targetAC,
            damageRolls: damageRoll.rolls,
            damageNotation: weaponDamage
        } as any);
    }

    // === STEP 5: APPLY ARMOR EFFECTIVENESS BONUSES ===
    if (weapon && armor?.armorType) {
        if (armor.armorType === 'light' && weapon.lightArmorBonus) {
            totalDamage += weapon.lightArmorBonus;
            console.log(`[Combat] Weapon effective vs light armor: +${weapon.lightArmorBonus}`);
        } else if (armor.armorType === 'medium' && weapon.mediumArmorBonus) {
            totalDamage += weapon.mediumArmorBonus;
            console.log(`[Combat] Weapon effective vs medium armor: +${weapon.mediumArmorBonus}`);
        } else if (armor.armorType === 'heavy' && weapon.heavyArmorBonus) {
            totalDamage += weapon.heavyArmorBonus;
            console.log(`[Combat] Weapon effective vs heavy armor: +${weapon.heavyArmorBonus}`);
        }
    }

    // Minimum 1 damage on hit
    const finalDamage = Math.max(1, Math.floor(totalDamage));

    console.log(`[Combat] Final damage: ${finalDamage}`);

    // === STEP 6: APPLY ON-HIT EFFECTS (lifesteal, etc.) ===
    const attackerStats = getEffectiveStats(attacker);
    Object.keys(attackerStats).forEach(statKey => {
        const statValue = attackerStats[statKey];
        const def = statDefs[statKey];
        if (!def) return;

        def.effects.forEach(effect => {
            if (effect.type === 'on_attack_hit' && effect.effect) {
                if (effect.effect.type === 'heal') {
                    const healAmount = Math.floor(evaluateFormula(effect.effect.amount, {
                        value: statValue,
                        damageDealt: finalDamage
                    }));

                    if (healAmount > 0) {
                        const maxHp = calculateEffectiveStat(attacker, 'maxHp', statDefs);
                        attacker.hp = Math.min(maxHp, (attacker.hp || 0) + healAmount);

                        console.log(`[Combat] Lifesteal: +${healAmount} HP`);

                        events.push({
                            type: 'lifesteal',
                            entityId: attacker.id,
                            amount: healAmount
                        });
                    }
                }
            }
        });
    });

    return {
        damage: finalDamage,
        events
    };
}

/**
 * Apply turn-start effects to an entity (regeneration, etc.)
 * @param entity - The entity to apply effects to
 * @param statDefs - Stat definition map
 * @returns Array of events generated
 */
export function applyTurnStartEffects(
    entity: any,
    statDefs: Record<string, StatDefinition>
): CombatEvent[] {
    const events: CombatEvent[] = [];
    const stats = getEffectiveStats(entity);

    Object.keys(stats).forEach(statKey => {
        const statValue = stats[statKey];
        const def = statDefs[statKey];
        if (!def) return;

        def.effects.forEach(effect => {
            if (effect.type === 'on_turn_start' && effect.effect) {
                if (effect.effect.type === 'heal') {
                    const healAmount = Math.floor(evaluateFormula(effect.effect.amount, {
                        value: statValue
                    }));

                    if (healAmount > 0) {
                        const maxHp = calculateEffectiveStat(entity, 'maxHp', statDefs);
                        const currentHp = entity.hp || 0;

                        if (currentHp < maxHp) {
                            entity.hp = Math.min(maxHp, currentHp + healAmount);

                            events.push({
                                type: 'regeneration',
                                entityId: entity.id,
                                amount: healAmount
                            });
                        }
                    }
                }
            }
        });
    });

    return events;
}
