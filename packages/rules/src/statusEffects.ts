/**
 * Status Effect System
 * Manages temporary status effects like stunned, poisoned, etc.
 */

export interface StatusEffect {
    type: 'stunned' | 'poisoned' | 'blessed' | 'cursed';
    duration: number;  // Turns remaining (0 = expires this turn)
    source?: string;   // Entity ID that applied the effect
}

/**
 * Apply a status effect to an entity
 */
export function applyStatusEffect(entity: any, effect: StatusEffect): void {
    if (!entity.statusEffects) {
        entity.statusEffects = [];
    }

    // Check if effect already exists
    const existing = entity.statusEffects.find((e: StatusEffect) => e.type === effect.type);
    if (existing) {
        // Refresh duration if new duration is longer
        existing.duration = Math.max(existing.duration, effect.duration);
    } else {
        entity.statusEffects.push({ ...effect });
    }

    console.log(`[StatusEffects] Applied ${effect.type} to ${entity.name || entity.id} for ${effect.duration} turn(s)`);
}

/**
 * Check if entity has a specific status effect
 */
export function hasStatusEffect(entity: any, type: StatusEffect['type']): boolean {
    return entity.statusEffects?.some((e: StatusEffect) => e.type === type && e.duration > 0) || false;
}

/**
 * Tick all status effects on an entity (call at end of turn)
 * Decrements duration and removes expired effects
 */
export function tickStatusEffects(entity: any): void {
    if (!entity.statusEffects || entity.statusEffects.length === 0) {
        return;
    }

    // Decrement all durations
    entity.statusEffects.forEach((effect: StatusEffect) => {
        effect.duration = Math.max(0, effect.duration - 1);
    });

    // Remove expired effects
    const expired = entity.statusEffects.filter((e: StatusEffect) => e.duration === 0);
    entity.statusEffects = entity.statusEffects.filter((e: StatusEffect) => e.duration > 0);

    if (expired.length > 0) {
        console.log(`[StatusEffects] Removed expired effects from ${entity.name || entity.id}:`, expired.map((e: StatusEffect) => e.type));
    }
}

/**
 * Get all active status effects on an entity
 */
export function getActiveStatusEffects(entity: any): StatusEffect[] {
    return entity.statusEffects?.filter((e: StatusEffect) => e.duration > 0) || [];
}

/**
 * Remove a specific status effect from an entity
 */
export function removeStatusEffect(entity: any, type: StatusEffect['type']): boolean {
    if (!entity.statusEffects) {
        return false;
    }

    const initialLength = entity.statusEffects.length;
    entity.statusEffects = entity.statusEffects.filter((e: StatusEffect) => e.type !== type);

    return entity.statusEffects.length < initialLength;
}
