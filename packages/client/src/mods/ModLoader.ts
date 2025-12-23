import { ContentPack, ModRegistry } from '@roguewar/rules';

export class ModLoader {
    /**
     * Load a set of content packs and return a consolidated registry.
     * Ensures deterministic ordering by manifest ID.
     */
    public static async loadPacks(packs: ContentPack[]): Promise<ModRegistry> {
        // Sort by ID to ensure order-independent results
        const sorted = [...packs].sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));

        // Compute hashes for each pack if not already present
        for (const pack of sorted) {
            if (!pack.manifest.hash) {
                pack.manifest.hash = this.computeHash(pack);
            }
        }

        return new ModRegistry(sorted);
    }

    /**
     * Compute a stable content hash for a pack.
     * Used to verify that players have identical content in multiplayer.
     */
    public static computeHash(pack: ContentPack): string {
        // Strip existing hash before computing to ensure stability
        const data = {
            ...pack,
            manifest: { ...pack.manifest, hash: undefined }
        };

        const str = JSON.stringify(data);
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return (hash >>> 0).toString(16);
    }
}
