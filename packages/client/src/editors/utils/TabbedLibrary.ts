/**
 * Multi-tab Library Component
 * Renders tabbed interface for viewing multiple content types
 */

import { ContentLibrary } from './ContentLibrary';

export class TabbedLibrary {
    /**
     * Render tabbed library with multiple content types
     */
    static renderTabbedLibrary(
        tabs: Array<{ id: string; label: string; type: 'entity' | 'item' | 'level' | 'dungeon' | 'campaign' }>,
        activeTab: string,
        onSelect: (tabId: string, item: any) => void
    ): string {
        const tabButtons = tabs.map(tab => `
            <button 
                class="btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}" 
                data-library-tab="${tab.id}"
                style="flex: 1; padding: var(--spacing-sm); font-size: 0.875rem;"
            >
                ${tab.label}
            </button>
        `).join('');

        const activeTabConfig = tabs.find(t => t.id === activeTab);
        if (!activeTabConfig) return '';

        const items = ContentLibrary.getItems(activeTabConfig.type);

        let tableContent = '';

        if (items.length === 0) {
            tableContent = `
                <div style="padding: var(--spacing-lg); color: var(--text-secondary); text-align: center; font-size: 0.875rem;">
                    No ${activeTabConfig.type}s in library yet.<br/>
                    Create and export ${activeTabConfig.type}s to use them here.
                </div>
            `;
        } else {
            const itemsRows = items.map(item => {
                const date = new Date(item.modified).toLocaleDateString();
                let summary = '';

                // Generate summary based on type
                switch (activeTabConfig.type) {
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
                    <tr style="cursor: pointer; border-bottom: 1px solid var(--border-color);" 
                        data-library-select="${item.id}" 
                        data-library-type="${activeTabConfig.type}">
                        <td style="padding: var(--spacing-sm); font-weight: 600; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</td>
                        <td style="padding: var(--spacing-sm); font-size: 0.8rem; color: var(--text-secondary);">${summary}</td>
                        <td style="padding: var(--spacing-sm); font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap;">${date}</td>
                    </tr>
                `;
            }).join('');

            tableContent = `
                <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                    <thead style="position: sticky; top: 0; background: var(--bg-secondary); border-bottom: 2px solid var(--border-color); z-index: 1;">
                        <tr>
                            <th style="padding: var(--spacing-sm); text-align: left; font-weight: 600;">Name</th>
                            <th style="padding: var(--spacing-sm); text-align: left; font-weight: 600;">Info</th>
                            <th style="padding: var(--spacing-sm); text-align: left; font-weight: 600;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
            `;
        }

        return `
            <div class="panel">
                <div class="panel-title">📚 Content Library</div>
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-md);">
                    ${tabButtons}
                </div>
                <div style="max-height: 500px; overflow-y: auto;">
                    ${tableContent}
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners for tabbed library
     * @param panelElement - The specific panel element to attach listeners to (prevents duplicate listeners)
     */
    static attachTabbedLibraryListeners(
        onTabChange: (tabId: string) => void,
        onSelect: (item: any) => void,
        panelElement?: HTMLElement
    ): void {
        const root = panelElement || document;

        // Tab switching
        root.querySelectorAll('[data-library-tab]').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-library-tab');
                if (tabId) {
                    onTabChange(tabId);
                }
            });
        });

        // Item selection - query for table rows
        const rows = root.querySelectorAll('tr[data-library-select]');
        console.log(`TabbedLibrary: Found ${rows.length} selectable rows`);

        rows.forEach(row => {
            row.addEventListener('click', () => {
                const id = row.getAttribute('data-library-select');
                const type = row.getAttribute('data-library-type');
                console.log(`TabbedLibrary: Row clicked - ID: ${id}, Type: ${type}`);

                if (id && type) {
                    const item = ContentLibrary.getItem(id);
                    if (item) {
                        console.log(`TabbedLibrary: Calling onSelect with item:`, item);
                        onSelect(item);
                    } else {
                        console.error(`TabbedLibrary: Item not found for ID: ${id}`);
                    }
                } else {
                    console.error(`TabbedLibrary: Missing ID or type on row`);
                }
            });
        });
    }
}
