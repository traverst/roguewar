/**
 * Content Library - LocalStorage-based content management
 * Stores and retrieves created content across all editors
 */

export interface LibraryItem {
    id: string;
    name: string;
    type: 'entity' | 'item' | 'level' | 'dungeon' | 'campaign';
    data: any;
    created: number;
    modified: number;
}

export class ContentLibrary {
    private static STORAGE_KEY = 'roguewar_content_library';

    /**
     * Get all items of a specific type
     */
    static getItems(type: LibraryItem['type']): LibraryItem[] {
        const library = this.loadLibrary();
        return library
            .filter(item => item.type === type)
            .sort((a, b) => b.modified - a.modified); // Most recent first
    }

    /**
     * Get all items from the library (no type filter)
     */
    static getAllItems(): LibraryItem[] {
        return this.loadLibrary();
    }

    /**
     * Save an item to the library
     */
    static saveItem(item: Omit<LibraryItem, 'created' | 'modified'>): void {
        const library = this.loadLibrary();
        const existingIndex = library.findIndex(i => i.id === item.id);

        const now = Date.now();
        const libraryItem: LibraryItem = {
            ...item,
            created: existingIndex >= 0 ? library[existingIndex].created : now,
            modified: now
        };

        if (existingIndex >= 0) {
            library[existingIndex] = libraryItem;
        } else {
            library.push(libraryItem);
        }

        this.saveLibrary(library);
    }

    /**
     * Get a specific item by ID
     */
    static getItem(id: string): LibraryItem | null {
        const library = this.loadLibrary();
        return library.find(item => item.id === id) || null;
    }

    /**
     * Delete an item from the library
     */
    static deleteItem(id: string): void {
        const library = this.loadLibrary();
        const filtered = library.filter(item => item.id !== id);
        this.saveLibrary(filtered);
    }

    /**
     * Clear all items of a specific type
     */
    static clearType(type: LibraryItem['type']): void {
        const library = this.loadLibrary();
        const filtered = library.filter(item => item.type !== type);
        this.saveLibrary(filtered);
    }

    /**
     * Get total count by type
     */
    static getCount(type: LibraryItem['type']): number {
        return this.getItems(type).length;
    }

    /**
     * Export library to JSON (for backup)
     */
    static exportLibrary(): string {
        return JSON.stringify(this.loadLibrary(), null, 2);
    }

    /**
     * Import library from JSON (merge with existing)
     */
    static importLibrary(json: string, merge: boolean = true): void {
        try {
            const imported = JSON.parse(json) as LibraryItem[];
            if (merge) {
                const existing = this.loadLibrary();
                const combined = [...existing];

                // Add or update imported items
                imported.forEach(importedItem => {
                    const index = combined.findIndex(i => i.id === importedItem.id);
                    if (index >= 0) {
                        combined[index] = importedItem;
                    } else {
                        combined.push(importedItem);
                    }
                });

                this.saveLibrary(combined);
            } else {
                this.saveLibrary(imported);
            }
        } catch (err) {
            throw new Error('Invalid library format');
        }
    }

    /**
     * Load library from localStorage
     */
    private static loadLibrary(): LibraryItem[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (err) {
            console.error('Failed to load library:', err);
            return [];
        }
    }

    /**
     * Save library to localStorage
     */
    private static saveLibrary(library: LibraryItem[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(library));
        } catch (err) {
            console.error('Failed to save library:', err);
            // Handle quota exceeded
            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
                alert('Storage quota exceeded! Please delete some items from your library.');
            }
        }
    }

    /**
     * Generate library panel HTML for editors (TABLE FORMAT)
     */
    static renderLibraryPanel(
        type: LibraryItem['type'],
        _onLoad: (item: LibraryItem) => void,
        _onDelete: (id: string) => void
    ): string {
        const items = this.getItems(type);

        if (items.length === 0) {
            return `
                <div class="panel">
                    <div class="panel-title">📚 Library (0)</div>
                    <div style="padding: var(--spacing-md); color: var(--text-secondary); text-align: center; font-size: 0.875rem;">
                        No saved ${type}s yet.<br/>
                        Export items to save them to your library.
                    </div>
                </div>
            `;
        }

        const itemsRows = items.map(item => {
            const date = new Date(item.modified).toLocaleDateString();
            let summary = '';

            // Generate summary based on type
            switch (type) {
                case 'entity':
                    const entity = item.data;
                    summary = `HP: ${entity.hp} | ATK: ${entity.attack}`;
                    break;
                case 'item':
                    const itm = item.data;
                    summary = `${itm.rarity || 'common'} ${itm.type}`;
                    break;
                case 'level':
                    const level = item.data;
                    summary = `${level.width}×${level.height}`;
                    break;
                case 'dungeon':
                    const dungeon = item.data;
                    summary = `${dungeon.floors?.length || 0} floors`;
                    break;
                case 'campaign':
                    const campaign = item.data;
                    summary = `${campaign.nodes?.length || 0} nodes`;
                    break;
            }

            return `
                <tr style="cursor: pointer; border-bottom: 1px solid var(--border-color);" data-library-item="${item.id}">
                    <td style="padding: var(--spacing-sm); font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</td>
                    <td style="padding: var(--spacing-sm); font-size: 0.8rem; color: var(--text-secondary);">${summary}</td>
                    <td style="padding: var(--spacing-sm); font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap;">${date}</td>
                    <td style="padding: var(--spacing-sm); text-align: center; width: 40px;">
                        <button class="btn btn-secondary" data-delete-library="${item.id}" style="padding: 4px 8px; font-size: 0.75rem;">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="panel">
                <div class="panel-title">📚 Library (${items.length})</div>
                <div style="max-height: 500px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                        <thead style="position: sticky; top: 0; background: var(--bg-secondary); border-bottom: 2px solid var(--border-color); z-index: 1;">
                            <tr>
                                <th style="padding: var(--spacing-sm); text-align: left; font-weight: 600;">Name</th>
                                <th style="padding: var(--spacing-sm); text-align: left; font-weight: 600;">Info</th>
                                <th style="padding: var(--spacing-sm); text-align: left; font-weight: 600;">Date</th>
                                <th style="padding: var(--spacing-sm); width: 40px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners for library panel
     * @param panelElement - The specific panel element to attach listeners to (prevents duplicate listeners across editors)
     */
    static attachLibraryListeners(
        _type: LibraryItem['type'],
        onLoad: (item: LibraryItem) => void,
        onRefresh: () => void,
        panelElement?: HTMLElement
    ): void {
        const root = panelElement || document;

        // Load item on row click
        root.querySelectorAll('tr[data-library-item]').forEach(element => {
            element.addEventListener('click', () => {
                const id = element.getAttribute('data-library-item');
                if (id) {
                    const item = this.getItem(id);
                    if (item) {
                        onLoad(item);
                    }
                }
            });
        });

        // Delete item
        root.querySelectorAll('[data-delete-library]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.getAttribute('data-delete-library');
                if (id && confirm('Delete this item from library?')) {
                    this.deleteItem(id);
                    onRefresh();
                }
            });
        });
    }
}
