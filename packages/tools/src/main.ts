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
