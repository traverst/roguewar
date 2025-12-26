/**
 * Generic Combat Engine
 * Data-driven combat resolution using stat definitions
 */

import { StatDefinition, CombatResult, CombatEvent } from './statDefinitions';
import { evaluateFormula } from './formulaEvaluator';
import {
    getEffectiveStats,
    calculateEffectiveStat,
    getEquippedWeapon,
    getEquippedArmor
} from './combatHelpers';

/**
 * Resolve an attack between two entities using stat definitions
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

    // 1. Calculate base damage from attack stat
    let damage = calculateEffectiveStat(attacker, 'attack', statDefs);

    // 2. Get weapon and apply armor effectiveness bonuses
    const weapon = getEquippedWeapon(attacker);
    const targetArmor = getEquippedArmor(target);

    if (weapon && targetArmor?.armorType) {
        // Apply armor effectiveness bonus based on target's armor type
        if (targetArmor.armorType === 'light' && weapon.lightArmorBonus) {
            damage += weapon.lightArmorBonus;
        } else if (targetArmor.armorType === 'medium' && weapon.mediumArmorBonus) {
            damage += weapon.mediumArmorBonus;
        } else if (targetArmor.armorType === 'heavy' && weapon.heavyArmorBonus) {
            damage += weapon.heavyArmorBonus;
        }
    }

    const attackerStats = getEffectiveStats(attacker);
    const targetStats = getEffectiveStats(target);

    // 3. Apply chance_on_attack effects (critical hits, etc.)
    Object.keys(attackerStats).forEach(statKey => {
        const statValue = attackerStats[statKey];
        const def = statDefs[statKey];
        if (!def) return;

        def.effects.forEach(effect => {
            if (effect.type === 'chance_on_attack' && effect.effect) {
                const chance = evaluateFormula(effect.chance, { value: statValue });

                if (Math.random() * 100 < chance) {
                    // Effect triggered!
                    if (effect.effect.type === 'multiply_damage') {
                        damage *= effect.effect.multiplier || 1;
                        events.push({
                            type: 'critical_hit',
                            entityId: attacker.id,
                            amount: damage
                        });
                    } else if (effect.effect.type === 'add_damage') {
                        const addAmount = evaluateFormula(effect.effect.amount, {
                            value: statValue,
                            baseDamage: damage
                        });
                        damage += addAmount;
                    }
                }
            }
        });
    });

    // 4. Check chance_on_defend effects (dodge, block)
    Object.keys(targetStats).forEach(statKey => {
        const statValue = targetStats[statKey];
        const def = statDefs[statKey];
        if (!def) return;

        def.effects.forEach(effect => {
            if (effect.type === 'chance_on_defend' && effect.effect) {
                const chance = evaluateFormula(effect.chance, { value: statValue });

                if (Math.random() * 100 < chance) {
                    if (effect.effect.type === 'negate_damage') {
                        // Full dodge!
                        damage = 0;
                        events.push({
                            type: 'dodge',
                            entityId: target.id
                        });
                    }
                }
            }
        });
    });

    // 5. Apply defense reduction (if attack wasn't dodged)
    if (damage > 0) {
        const defense = calculateEffectiveStat(target, 'defense', statDefs);
        damage = Math.max(1, damage - defense);
    }

    const finalDamage = Math.floor(damage);

    // 6. Apply on_attack_hit effects (lifesteal, etc.)
    if (finalDamage > 0) {
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
    }

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
