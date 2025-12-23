import { PlayerProfile, UnlockableContent } from './types';

/**
 * UnlockRegistry - Manages unlockable content definitions and checks
 * This registry is static content that never changes based on player progress
 */
export class UnlockRegistry {
    private content: Map<string, UnlockableContent> = new Map();

    constructor() {
        this.registerDefaultContent();
    }

    /**
     * Register default unlockable content
     */
    private registerDefaultContent(): void {
        // Default hero (always unlocked)
        this.register({
            id: 'hero:default',
            type: 'hero',
            name: 'Wanderer',
            description: 'A nameless adventurer seeking fortune in the depths.'
        });

        // Unlockable heroes
        this.register({
            id: 'hero:warrior',
            type: 'hero',
            name: 'Warrior',
            description: 'A battle-hardened fighter with enhanced combat prowess.',
            unlockRequirement: 'Complete the tutorial campaign'
        });

        this.register({
            id: 'hero:scout',
            type: 'hero',
            name: 'Scout',
            description: 'A nimble explorer with enhanced visibility range.',
            unlockRequirement: 'Defeat 10 enemies in a single run'
        });

        // Themes (future expansion)
        this.register({
            id: 'theme:ice-caves',
            type: 'theme',
            name: 'Ice Caves',
            description: 'Frozen caverns with crystalline walls.',
            unlockRequirement: 'Complete 5 runs'
        });
    }

    /**
     * Register a single unlockable content definition
     */
    register(content: UnlockableContent): void {
        this.content.set(content.id, content);
    }

    /**
     * Check if content is unlocked for a player
     */
    isUnlocked(profile: PlayerProfile, contentId: string): boolean {
        return profile.unlockedContent.includes(contentId);
    }

    /**
     * Get all content of a specific type
     */
    getContentByType(type: UnlockableContent['type']): UnlockableContent[] {
        return Array.from(this.content.values())
            .filter(c => c.type === type);
    }

    /**
     * Get unlocked content of a specific type for a player
     */
    getUnlockedByType(profile: PlayerProfile, type: UnlockableContent['type']): UnlockableContent[] {
        return this.getContentByType(type)
            .filter(c => this.isUnlocked(profile, c.id));
    }

    /**
     * Get all unlocked heroes for a player
     */
    getUnlockedHeroes(profile: PlayerProfile): UnlockableContent[] {
        return this.getUnlockedByType(profile, 'hero');
    }

    /**
     * Get content definition by ID
     */
    getContent(contentId: string): UnlockableContent | undefined {
        return this.content.get(contentId);
    }

    /**
     * Apply unlocks to a profile (modifies profile in place)
     */
    applyUnlocks(profile: PlayerProfile, unlockIds: string[]): string[] {
        const newUnlocks: string[] = [];

        for (const id of unlockIds) {
            if (!this.content.has(id)) {
                console.warn(`[UnlockRegistry] Unknown unlock ID: ${id}`);
                continue;
            }

            if (!this.isUnlocked(profile, id)) {
                profile.unlockedContent.push(id);
                newUnlocks.push(id);
            }
        }

        return newUnlocks;
    }
}

/**
 * Global singleton instance
 */
export const unlockRegistry = new UnlockRegistry();
