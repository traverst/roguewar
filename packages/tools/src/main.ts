import './style.css';

/**
 * Main application entry point for Roguewar Content Tools
 */
class ToolsApp {
    private currentEditor: string = 'home';

    constructor() {
        this.init();
    }

    private init(): void {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <nav class="nav-bar">
                <div class="nav-title">⚔️ Roguewar Content Tools</div>
                <button class="nav-btn active" data-editor="home">Home</button>
                <button class="nav-btn" data-editor="level">Level Editor</button>
                <button class="nav-btn" data-editor="dungeon">Dungeon Editor</button>
                <button class="nav-btn" data-editor="campaign">Campaign Editor</button>
                <button class="nav-btn" data-editor="entity">Entity Editor</button>
                <button class="nav-btn" data-editor="item">Item Editor</button>
            </nav>
            
            <div class="main-content">
                ${this.renderHomePanel()}
                ${this.renderPlaceholderPanel('level', 'Level Editor', 'Create and edit dungeon floors')}
                ${this.renderPlaceholderPanel('dungeon', 'Dungeon Editor', 'Group floors into multi-level dungeons')}
                ${this.renderPlaceholderPanel('campaign', 'Campaign Editor', 'Design campaign flows')}
                ${this.renderPlaceholderPanel('entity', 'Entity Editor', 'Configure enemies and NPCs')}
                ${this.renderPlaceholderPanel('item', 'Item Editor', 'Design weapons, armor, and items')}
            </div>
        `;

        this.attachEventListeners();
    }

    private renderHomePanel(): string {
        return `
            <div class="editor-panel active" data-panel="home">
                <div class="editor-header">
                    <h1 class="editor-title">Welcome to Roguewar Content Tools</h1>
                    <p class="editor-description">
                        Create game content without modifying engine code.
                        All tools consume and emit the same schemas used by the game.
                    </p>
                </div>
                
                <div class="editor-body">
                    <div style="flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-lg);">
                        <div class="panel">
                            <div class="panel-title">🗺️ Level Editor</div>
                            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                                Create individual dungeon floors with a visual grid editor.
                                Place tiles, spawn points, and zone annotations.
                            </p>
                            <button class="btn" onclick="window.switchEditor('level')">Open Level Editor</button>
                        </div>
                        
                        <div class="panel">
                            <div class="panel-title">🏰 Dungeon Editor</div>
                            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                                Group multiple floors into a dungeon connected by stairs.
                                Define the vertical structure and flow.
                            </p>
                            <button class="btn" onclick="window.switchEditor('dungeon')">Open Dungeon Editor</button>
                        </div>
                        
                        <div class="panel">
                            <div class="panel-title">🎯 Campaign Editor</div>
                            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                                Link multiple dungeons together into a campaign.
                                Create branching paths and unlock conditions.
                            </p>
                            <button class="btn" onclick="window.switchEditor('campaign')">Open Campaign Editor</button>
                        </div>
                        
                        <div class="panel">
                            <div class="panel-title">👾 Entity Editor</div>
                            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                                Configure enemy stats, AI behavior, and movement patterns.
                            </p>
                            <button class="btn" onclick="window.switchEditor('entity')">Open Entity Editor</button>
                        </div>
                        
                        <div class="panel">
                            <div class="panel-title">⚔️ Item Editor</div>
                            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                                Design weapons, armor, and consumables with damage types and status effects.
                            </p>
                            <button class="btn" onclick="window.switchEditor('item')">Open Item Editor</button>
                        </div>
                    </div>
                </div>
                
                <div class="panel" style="margin-top: var(--spacing-lg);">
                    <div class="panel-title">📋 Phase 11 Principles</div>
                    <ul style="color: var(--text-secondary); padding-left: var(--spacing-lg);">
                        <li>✅ All content is data, not logic</li>
                        <li>✅ Static hosting compatible (no backend required)</li>
                        <li>✅ Deterministic outcomes preserved</li>
                        <li>✅ Content validated before export</li>
                        <li>✅ Compatible with mods, multiplayer, and replays</li>
                    </ul>
                </div>
                
                <div class="panel" style="margin-top: var(--spacing-lg); border: 1px solid var(--primary-color);">
                    <div class="panel-title">🛠️ Library Admin</div>
                    <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                        Export your entire content library to a JSON file for backup or to transfer to another machine.
                    </p>
                    <div id="library-stats" style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); background: var(--bg-tertiary); border-radius: var(--radius-md); font-size: 0.9rem;"></div>
                    <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                        <button class="btn btn-success" id="btn-export-library">📦 Export Full Library</button>
                        <button class="btn btn-secondary" id="btn-import-library">📂 Import Library</button>
                        <button class="btn btn-secondary" id="btn-clear-library" style="margin-left: auto; color: #f66;">🗑️ Clear All</button>
                    </div>
                    <input type="file" id="library-file-input" style="display: none;" accept=".json">
                    <div id="library-messages" style="margin-top: var(--spacing-sm);"></div>
                </div>
            </div>
        `;
    }

    private renderPlaceholderPanel(id: string, title: string, description: string): string {
        return `
            <div class="editor-panel" data-panel="${id}">
                <div class="editor-header">
                    <h1 class="editor-title">${title}</h1>
                    <p class="editor-description">${description}</p>
                </div>
                <div class="editor-body">
                    <div id="${id}-editor-root"></div>
                </div>
            </div>
        `;
    }

    private attachEventListeners(): void {
        // Navigation
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLButtonElement;
                const editor = target.dataset.editor;
                if (editor) {
                    this.switchEditor(editor);
                }
            });
        });

        // Expose switchEditor globally for inline onclick handlers
        (window as any).switchEditor = this.switchEditor.bind(this);

        // Library Admin - show stats
        this.updateLibraryStats();

        // Library Admin - Export
        document.getElementById('btn-export-library')?.addEventListener('click', () => {
            this.exportLibrary();
        });

        // Library Admin - Import
        document.getElementById('btn-import-library')?.addEventListener('click', () => {
            document.getElementById('library-file-input')?.click();
        });

        document.getElementById('library-file-input')?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                this.importLibrary(file);
            }
        });

        // Library Admin - Clear All
        document.getElementById('btn-clear-library')?.addEventListener('click', () => {
            if (confirm('⚠️ Are you sure you want to delete ALL content from the library? This cannot be undone!')) {
                localStorage.removeItem('roguewar_content_library');
                this.showLibraryMessage('🗑️ Library cleared!', 'warning');
                this.updateLibraryStats();
            }
        });
    }

    private updateLibraryStats(): void {
        const statsEl = document.getElementById('library-stats');
        if (!statsEl) return;

        const libraryJson = localStorage.getItem('roguewar_content_library');
        if (!libraryJson) {
            statsEl.innerHTML = '<span style="color: var(--text-secondary);">Library is empty</span>';
            return;
        }

        try {
            const library = JSON.parse(libraryJson);
            const counts: Record<string, number> = {};
            library.forEach((item: any) => {
                counts[item.type] = (counts[item.type] || 0) + 1;
            });

            const summary = Object.entries(counts)
                .map(([type, count]) => `<strong>${count}</strong> ${type}${count > 1 ? 's' : ''}`)
                .join(' • ');

            const totalSize = new Blob([libraryJson]).size;
            const sizeStr = totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} KB` : `${totalSize} bytes`;

            statsEl.innerHTML = `📊 ${summary} <span style="color: var(--text-tertiary);">(${sizeStr})</span>`;
        } catch (e) {
            statsEl.innerHTML = '<span style="color: #f66;">Error reading library</span>';
        }
    }

    private exportLibrary(): void {
        const libraryJson = localStorage.getItem('roguewar_content_library');
        if (!libraryJson) {
            this.showLibraryMessage('⚠️ Library is empty, nothing to export', 'warning');
            return;
        }

        const blob = new Blob([libraryJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roguewar-library-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showLibraryMessage('✅ Library exported successfully!', 'success');
    }

    private importLibrary(file: File): void {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                const imported = JSON.parse(json);

                if (!Array.isArray(imported)) {
                    throw new Error('Invalid library format');
                }

                // Merge with existing
                const existingJson = localStorage.getItem('roguewar_content_library');
                const existing = existingJson ? JSON.parse(existingJson) : [];

                // Merge by ID (imported overwrites existing)
                const merged = [...existing];
                imported.forEach((item: any) => {
                    const idx = merged.findIndex((e: any) => e.id === item.id);
                    if (idx >= 0) {
                        merged[idx] = item;
                    } else {
                        merged.push(item);
                    }
                });

                localStorage.setItem('roguewar_content_library', JSON.stringify(merged));
                this.showLibraryMessage(`✅ Imported ${imported.length} items (merged with existing)`, 'success');
                this.updateLibraryStats();

                // Reset file input
                (document.getElementById('library-file-input') as HTMLInputElement).value = '';
            } catch (err) {
                this.showLibraryMessage('❌ Invalid library file format', 'error');
            }
        };
        reader.readAsText(file);
    }

    private showLibraryMessage(message: string, type: 'success' | 'warning' | 'error'): void {
        const el = document.getElementById('library-messages');
        if (!el) return;

        const colors: Record<string, string> = {
            success: '#4a6',
            warning: '#a64',
            error: '#f66'
        };

        el.innerHTML = `<div style="padding: var(--spacing-sm); color: ${colors[type]}; font-size: 0.9rem;">${message}</div>`;
        setTimeout(() => { el.innerHTML = ''; }, 5000);
    }

    private switchEditor(editorId: string): void {
        // Update nav buttons
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-editor') === editorId);
        });

        // Update panels
        const panels = document.querySelectorAll('.editor-panel');
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.getAttribute('data-panel') === editorId);
        });

        this.currentEditor = editorId;

        // Initialize editor if needed
        this.initializeEditor(editorId);
    }

    private initializeEditor(editorId: string): void {
        const root = document.getElementById(`${editorId}-editor-root`);
        if (!root) return;

        // Check if already initialized (has child content)
        if (root.hasAttribute('data-initialized')) {
            return; // Already initialized, skip
        }

        // Mark as initialized
        root.setAttribute('data-initialized', 'true');

        // Import and initialize specific editors
        switch (editorId) {
            case 'level':
                import('./level-editor/LevelEditor').then(module => {
                    new module.LevelEditor(root);
                });
                break;
            case 'dungeon':
                import('./dungeon-editor/DungeonEditor').then(module => {
                    new module.DungeonEditor(root);
                });
                break;
            case 'campaign':
                import('./campaign-editor/CampaignEditor').then(module => {
                    new module.CampaignEditor(root);
                });
                break;
            case 'entity':
                import('./entity-editor/EntityEditor').then(module => {
                    new module.EntityEditor(root);
                });
                break;
            case 'item':
                import('./item-editor/ItemEditor').then(module => {
                    new module.ItemEditor(root);
                });
                break;
        }
    }
}

// Start the app
new ToolsApp();
