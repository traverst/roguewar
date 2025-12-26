import { DungeonDefinition, validateDungeon, createContentAsset, DungeonGenerator, mulberry32 } from '@roguewar/rules';
import type { TileType } from '@roguewar/rules';
import { ContentLibrary } from '../utils/ContentLibrary';
import { TabbedLibrary } from '../utils/TabbedLibrary';

type ToolType = TileType | 'player_spawn' | 'enemy_spawn' | 'item' | 'exit';

export class LevelEditor {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private width = 50;
    private height = 50;
    private tileSize = 16;
    private tiles: TileType[][] = [];
    private playerSpawn = { x: 5, y: 5 };
    private enemySpawns: { x: number; y: number; entityId?: string; entityName?: string; index?: number }[] = [];
    private placedEntities: { id: string; name: string; index: number }[] = [];
    private currentTool: ToolType = 'floor';
    private isDrawing = false;
    private activeLibraryTab: 'levels' | 'entities' | 'items' = 'levels';
    private selectedEntity: { id: string; name: string } | null = null;
    private selectedItem: { id: string; name: string; icon?: string } | null = null;
    private placedItems: { id: string; name: string; icon?: string; x: number; y: number }[] = [];
    private sidebarTab: 'generation' | 'properties' | 'actions' = 'generation';

    // Level metadata properties
    private levelName: string = 'My Level';
    private levelDesc: string = '';
    private loadedLevelId: string | null = null; // Track which level is loaded for overwrite

    constructor(private root: HTMLElement) {
        this.init();
    }

    private init(): void {
        this.initTiles();
        this.render();
    }

    private initTiles(): void {
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            const row: TileType[] = [];
            for (let x = 0; x < this.width; x++) {
                row.push('wall');
            }
            this.tiles.push(row);
        }
    }

    private render(): void {
        this.root.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 400px; gap: var(--spacing-lg); height: 100%;">
                <div style="display: flex; flex-direction: column;">
                    <div class="panel" style="margin-bottom: var(--spacing-md);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>Level Grid</strong>
                                <span style="color: var(--text-secondary); margin-left: var(--spacing-md);">
                                    ${this.width} × ${this.height}
                                </span>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-secondary" id="btn-clear">Clear</button>
                                <button class="btn btn-secondary" id="btn-fill">Fill Floor</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="editor-canvas" style="flex: 1; display: flex; align-items: center; justify-content: center;">
                        <canvas id="level-canvas"></canvas>
                    </div>
                </div>
                
                ${this.renderSidebar()}
            </div>
        `;

        this.renderTabbedLibrary();
        this.setupCanvas();
        this.attachEventListeners();
        this.attachSidebarTabListeners();
        this.attachTabContentListeners();
        this.drawGrid();
    }

    private renderSidebar(): string {
        return `
            <div class="editor-sidebar" style="display: flex; flex-direction: column; gap: var(--spacing-md); overflow-y: auto;">
                ${this.renderTilePalette()}
                
                <div id="library-panel">
                    <!-- Content library will be rendered here -->
                </div>
                
                ${this.renderTabbedPanel()}
            </div>
        `;
    }

    private renderTilePalette(): string {
        return `
            <div class="panel">
                <div class="panel-title">🎨 Tile Palette</div>
                <div class="palette" id="tile-palette">
                    <div class="palette-item active" data-tool="floor" style="background-color: #444;">
                        <div class="palette-icon">·</div>
                        <div>Floor</div>
                    </div>
                    <div class="palette-item" data-tool="wall" style="background-color: #222;">
                        <div class="palette-icon">█</div>
                        <div>Wall</div>
                    </div>
                    <div class="palette-item" data-tool="door" style="background-color: #964B00;">
                        <div class="palette-icon">▯</div>
                        <div>Door</div>
                    </div>
                    <div class="palette-item" data-tool="stairs_up" style="background-color: #4169E1;">
                        <div class="palette-icon">▲</div>
                        <div>Stairs Up</div>
                    </div>
                    <div class="palette-item" data-tool="stairs_down" style="background-color: #1E90FF;">
                        <div class="palette-icon">▼</div>
                        <div>Stairs Down</div>
                    </div>
                    <div class="palette-item" data-tool="player_spawn" style="background-color: #FFD700; color: #000;">
                        <div class="palette-icon">@</div>
                        <div>Player</div>
                    </div>
                    <div class="palette-item" data-tool="enemy_spawn" style="background-color: #FF4500;">
                        <div class="palette-icon">E</div>
                        <div>Enemy</div>
                    </div>
                    <div class="palette-item" data-tool="item" style="background-color: #9932CC;">
                        <div class="palette-icon">🎁</div>
                        <div>Item</div>
                    </div>
                    <div class="palette-item" data-tool="exit" style="background-color: #00ff00;">
                        <div class="palette-icon">★</div>
                        <div>Exit</div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderTabbedPanel(): string {
        return `
            <div class="panel">
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-md);">
                    <button class="btn ${this.sidebarTab === 'generation' ? 'btn-primary' : 'btn-secondary'}" data-sidebar-tab="generation" style="flex: 1; padding: var(--spacing-sm); font-size: 0.875rem;">🎲 Gen</button>
                    <button class="btn ${this.sidebarTab === 'properties' ? 'btn-primary' : 'btn-secondary'}" data-sidebar-tab="properties" style="flex: 1; padding: var(--spacing-sm); font-size: 0.875rem;">📝 Props</button>
                    <button class="btn ${this.sidebarTab === 'actions' ? 'btn-primary' : 'btn-secondary'}" data-sidebar-tab="actions" style="flex: 1; padding: var(--spacing-sm); font-size: 0.875rem;">💾 Action</button>
                </div>
                <div id="sidebar-tab-content">
                    ${this.renderSidebarTabContent()}
                </div>
            </div>
        `;
    }

    private renderSidebarTabContent(): string {
        switch (this.sidebarTab) {
            case 'generation':
                return `
                    <div class="form-group">
                        <label class="form-label">Seed</label>
                        <input type="number" class="form-input" id="gen-seed" value="12345" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Room Count: <span id="gen-rooms-value">6</span></label>
                        <input type="range" class="form-input" id="gen-rooms" min="3" max="15" value="6" style="width: 100%;" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Min Room Size: <span id="gen-min-size-value">4</span></label>
                        <input type="range" class="form-input" id="gen-min-size" min="3" max="10" value="4" style="width: 100%;" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Max Room Size: <span id="gen-max-size-value">10</span></label>
                        <input type="range" class="form-input" id="gen-max-size" min="5" max="15" value="10" style="width: 100%;" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Level Type</label>
                        <select class="form-input" id="gen-level-type">
                            <option value="entrance">Entrance (stairs down only)</option>
                            <option value="middle" selected>Middle (stairs up & down)</option>
                            <option value="final">Final (stairs up & exit)</option>
                        </select>
                    </div>
                    <div style="margin-top: var(--spacing-md);">
                        <button class="btn btn-primary" id="btn-generate" style="width: 100%;">Generate Level</button>
                        <button class="btn btn-secondary" id="btn-random-seed" style="width: 100%; margin-top: var(--spacing-xs);">Random Seed</button>
                    </div>
                `;
            case 'properties':
                return `
                    <div class="form-group">
                        <label class="form-label">Level Name</label>
                        <input type="text" class="form-input" id="level-name" value="${this.levelName}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-input" id="level-desc" rows="3" placeholder="A custom level layout">${this.levelDesc}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Width</label>
                        <input type="number" class="form-input" id="level-width" value="${this.width}" min="10" max="100" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Height</label>
                        <input type="number" class="form-input" id="level-height" value="${this.height}" min="10" max="100" />
                    </div>
                    <button class="btn btn-secondary" id="btn-resize" style="width: 100%;">Resize Grid</button>
                `;
            case 'actions':
                const entityLegendHtml = this.placedEntities.length > 0
                    ? `
                        <div style="margin-bottom: var(--spacing-md);">
                            <div style="font-weight: bold; margin-bottom: var(--spacing-xs);">Entity Legend:</div>
                            <table style="width: 100%; font-size: 0.875rem; border-collapse: collapse;">
                                <thead>
                                    <tr style="background-color: var(--surface-secondary);">
                                        <th style="padding: 4px; text-align: center; border: 1px solid var(--border-color);">#</th>
                                        <th style="padding: 4px; text-align: left; border: 1px solid var(--border-color);">Entity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.placedEntities.map(e => `
                                        <tr>
                                            <td style="padding: 4px; text-align: center; border: 1px solid var(--border-color); background-color: #FF4500; color: white; font-weight: bold;">${e.index}</td>
                                            <td style="padding: 4px; border: 1px solid var(--border-color);">${e.name}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `
                    : '';

                // Build saved levels list for dropdown
                const savedLevels = ContentLibrary.getItems('level');
                const levelOptionsHtml = savedLevels.length > 0
                    ? savedLevels.map(l => `<option value="${l.id}">${l.name}</option>`).join('')
                    : '<option value="" disabled>No saved levels</option>';

                return `
                    ${entityLegendHtml}
                    
                    <!-- Library Section -->
                    <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); background: var(--surface-secondary); border-radius: var(--radius-md);">
                        <div style="font-weight: bold; margin-bottom: var(--spacing-xs); color: var(--primary-color);">📚 Library</div>
                        <div class="form-group" style="margin-bottom: var(--spacing-xs);">
                            <select class="form-input" id="library-level-select" style="width: 100%;">
                                <option value="">-- Select a level to load --</option>
                                ${levelOptionsHtml}
                            </select>
                        </div>
                        <div style="display: flex; gap: var(--spacing-xs);">
                            <button class="btn btn-info" id="btn-load-library" style="flex: 1;">📂 Load</button>
                            <button class="btn btn-danger" id="btn-delete-library" style="flex: 1;">🗑️ Delete</button>
                        </div>
                        <button class="btn btn-success" id="btn-save-library" style="width: 100%; margin-top: var(--spacing-xs);">💾 Save to Library</button>
                    </div>
                    
                    <!-- Export/Import Section -->
                    <div class="btn-group" style="flex-direction: column; width: 100%;">
                        <button class="btn btn-secondary" id="btn-export">Export JSON</button>
                        <button class="btn btn-secondary" id="btn-import">Import JSON</button>
                    </div>
                    <div id="validation-messages" class="validation-messages"></div>
                `;
        }
    }

    private renderTabbedLibrary(): void {
        const panel = document.getElementById('library-panel');
        if (!panel) return;

        panel.innerHTML = TabbedLibrary.renderTabbedLibrary(
            [
                { id: 'levels', label: '🗺️ Levels', type: 'level' },
                { id: 'entities', label: '👾 Entities', type: 'entity' },
                { id: 'items', label: '⚔️ Items', type: 'item' }
            ],
            this.activeLibraryTab,
            () => { }
        );

        TabbedLibrary.attachTabbedLibraryListeners(
            (tabId) => {
                this.activeLibraryTab = tabId as 'levels' | 'entities' | 'items';
                this.renderTabbedLibrary();
            },
            (item) => {
                this.handleLibrarySelection(item);
            },
            panel
        );
    }

    private handleLibrarySelection(item: any): void {
        switch (this.activeLibraryTab) {
            case 'levels':
                const level = item.data;
                // Set all class properties from level data
                this.loadedLevelId = item.id; // Track for overwrite support
                this.levelName = item.name;
                this.levelDesc = level.description || '';
                this.width = level.width || 50;
                this.height = level.height || 50;
                this.tiles = level.tiles || [];
                this.playerSpawn = level.playerSpawn || { x: 5, y: 5 };
                this.enemySpawns = level.enemySpawns || [];
                this.placedEntities = level.placedEntities || [];
                this.placedItems = level.items || [];

                // Re-initialize tiles if empty
                if (this.tiles.length === 0) {
                    this.initTiles();
                }

                this.setupCanvas();
                this.drawGrid();
                this.refreshSidebarTab(); // Refresh to show new values in Properties tab
                this.showMessage(`✅ Loaded "${item.name}" from library`);
                break;

            case 'entities':
                this.selectedEntity = { id: item.data.id, name: item.name };
                this.selectedItem = null;
                this.showMessage(`✅ Selected entity: <strong>${this.selectedEntity.name}</strong><br/>Click grid to place enemy spawn`);
                break;

            case 'items':
                this.selectedItem = { id: item.data.id, name: item.name, icon: item.data.icon || '🎁' };
                this.selectedEntity = null;
                this.currentTool = 'item'; // Switch to item tool automatically
                this.showMessage(`✅ Selected item: <strong>${this.selectedItem.name}</strong> ${this.selectedItem.icon}<br/>Click grid to place item`);
                break;
        }
    }

    private attachSidebarTabListeners(): void {
        document.querySelectorAll('[data-sidebar-tab]').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-sidebar-tab');
                if (tabId) {
                    this.sidebarTab = tabId as 'generation' | 'properties' | 'actions';
                    this.refreshSidebarTab();
                }
            });
        });
    }

    private refreshSidebarTab(): void {
        const content = document.getElementById('sidebar-tab-content');
        if (content) {
            content.innerHTML = this.renderSidebarTabContent();
            this.attachTabContentListeners();
        }

        // Update button states
        document.querySelectorAll('[data-sidebar-tab]').forEach(button => {
            const tabId = button.getAttribute('data-sidebar-tab');
            if (tabId === this.sidebarTab) {
                button.classList.remove('btn-secondary');
                button.classList.add('btn-primary');
            } else {
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
            }
        });
    }

    private attachTabContentListeners(): void {
        // Slider event listeners
        ['gen-rooms', 'gen-min-size', 'gen-max-size'].forEach(sliderId => {
            const slider = document.getElementById(sliderId) as HTMLInputElement;
            if (slider) {
                slider.addEventListener('input', () => {
                    const valueId = `${sliderId}-value`;
                    const valueSpan = document.getElementById(valueId);
                    if (valueSpan) valueSpan.textContent = slider.value;
                });
            }
        });

        // Generation tab buttons
        const generateBtn = document.getElementById('btn-generate');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateDungeon());
        }

        const randomSeedBtn = document.getElementById('btn-random-seed');
        if (randomSeedBtn) {
            randomSeedBtn.addEventListener('click', () => {
                const seedInput = document.getElementById('gen-seed') as HTMLInputElement;
                if (seedInput) seedInput.value = Math.floor(Math.random() * 100000).toString();
            });
        }

        // Properties tab input sync (update class properties immediately)
        document.getElementById('level-name')?.addEventListener('input', (e) => {
            this.levelName = (e.target as HTMLInputElement).value;
        });
        document.getElementById('level-desc')?.addEventListener('input', (e) => {
            this.levelDesc = (e.target as HTMLTextAreaElement).value;
        });
        document.getElementById('level-width')?.addEventListener('input', (e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            if (!isNaN(val) && val >= 10 && val <= 100) {
                this.width = val;
            }
        });
        document.getElementById('level-height')?.addEventListener('input', (e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            if (!isNaN(val) && val >= 10 && val <= 100) {
                this.height = val;
            }
        });

        // Properties tab buttons
        document.getElementById('btn-resize')?.addEventListener('click', () => this.resizeGrid());

        // Actions tab buttons
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportDungeon());
        document.getElementById('btn-import')?.addEventListener('click', () => this.importDungeon());

        // Library buttons
        document.getElementById('btn-save-library')?.addEventListener('click', () => this.saveToLibrary());
        document.getElementById('btn-load-library')?.addEventListener('click', () => this.loadFromLibrary());
        document.getElementById('btn-delete-library')?.addEventListener('click', () => this.deleteFromLibrary());
    }

    private saveToLibrary(): void {
        const levelData = {
            width: this.width,
            height: this.height,
            tiles: this.tiles,
            playerSpawn: this.playerSpawn,
            enemySpawns: this.enemySpawns,
            placedEntities: this.placedEntities,
            items: this.placedItems, // Add placed items to level data
            description: this.levelDesc
        };

        // If a level is loaded, ask whether to overwrite or save as new
        let levelId = `level-${Date.now()}`;
        let isOverwrite = false;

        if (this.loadedLevelId) {
            const choice = confirm(`Overwrite existing level "${this.levelName}"?\n\nClick OK to overwrite, Cancel to save as new.`);
            if (choice) {
                levelId = this.loadedLevelId;
                isOverwrite = true;
            }
        }

        ContentLibrary.saveItem({
            id: levelId,
            name: this.levelName || 'Unnamed Level',
            type: 'level',
            data: levelData
        });

        // Update loaded ID to the saved one
        this.loadedLevelId = levelId;

        const action = isOverwrite ? 'updated' : 'saved';
        this.showMessage(`✅ Level "${this.levelName}" ${action} in library!`);
        this.refreshSidebarTab(); // Refresh to show new level in dropdown
        this.renderTabbedLibrary(); // Refresh library panel
    }

    private loadFromLibrary(): void {
        const select = document.getElementById('library-level-select') as HTMLSelectElement;
        if (!select || !select.value) {
            this.showMessage('⚠️ Please select a level to load');
            return;
        }

        const levelItem = ContentLibrary.getItem(select.value);
        if (!levelItem || levelItem.type !== 'level') {
            this.showMessage('⚠️ Level not found');
            return;
        }

        const data = levelItem.data;

        // Load level data and track the loaded ID
        this.loadedLevelId = levelItem.id;
        this.levelName = levelItem.name;
        this.levelDesc = data.description || '';
        this.width = data.width || 50;
        this.height = data.height || 50;
        this.tiles = data.tiles || [];
        this.playerSpawn = data.playerSpawn || { x: 5, y: 5 };
        this.enemySpawns = data.enemySpawns || [];
        this.placedEntities = data.placedEntities || [];

        // If tiles is empty, reinitialize
        if (this.tiles.length === 0) {
            this.initTiles();
        }

        this.setupCanvas();
        this.drawGrid();
        this.refreshSidebarTab();
        this.showMessage(`✅ Level "${levelItem.name}" loaded!`);
    }

    private deleteFromLibrary(): void {
        const select = document.getElementById('library-level-select') as HTMLSelectElement;
        if (!select || !select.value) {
            this.showMessage('⚠️ Please select a level to delete');
            return;
        }

        const levelItem = ContentLibrary.getItem(select.value);
        if (!levelItem) {
            this.showMessage('⚠️ Level not found');
            return;
        }

        if (!confirm(`Delete level "${levelItem.name}"?`)) {
            return;
        }

        ContentLibrary.deleteItem(select.value);
        this.showMessage(`🗑️ Level "${levelItem.name}" deleted`);
        this.refreshSidebarTab(); // Refresh dropdown
        this.renderTabbedLibrary(); // Refresh library panel
    }

    private showMessage(html: string): void {
        const messagesDiv = document.getElementById('validation-messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = `<div class="validation-warning">${html}</div>`;
        }
    }

    private setupCanvas(): void {
        this.canvas = document.getElementById('level-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        this.canvas.width = this.width * this.tileSize;
        this.canvas.height = this.height * this.tileSize;
    }

    private attachEventListeners(): void {
        // Tile palette
        document.querySelectorAll('.palette-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.palette-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const tool = item.getAttribute('data-tool');
                if (tool) this.currentTool = tool as ToolType;
            });
        });

        // Canvas events
        this.canvas?.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            this.handleCanvasClick(e);
        });
        this.canvas?.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.handleCanvasClick(e);
        });
        this.canvas?.addEventListener('mouseup', () => {
            this.isDrawing = false;
        });
        this.canvas?.addEventListener('mouseleave', () => {
            this.isDrawing = false;
        });

        // Buttons
        document.getElementById('btn-clear')?.addEventListener('click', () => this.clearGrid());
        document.getElementById('btn-fill')?.addEventListener('click', () => this.fillFloor());
    }

    private handleCanvasClick(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.tileSize);
        const y = Math.floor((e.clientY - rect.top) / this.tileSize);

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        // Check if this position is on stairs
        const isOnStairs = this.tiles[y][x] === 'stairs_up' ||
            this.tiles[y][x] === 'stairs_down' ||
            this.tiles[y][x] === 'exit';

        // If entity is selected, place enemy spawn
        if (this.selectedEntity) {
            if (isOnStairs) {
                this.showMessage('⚠️ Cannot place enemy spawn on stairs!');
                return;
            }

            // Check if this entity already has an index
            let entityEntry = this.placedEntities.find(e => e.id === this.selectedEntity!.id);

            if (!entityEntry) {
                // Assign new index (1, 2, 3, 4...)
                const nextIndex = this.placedEntities.length + 1;
                entityEntry = {
                    id: this.selectedEntity.id,
                    name: this.selectedEntity.name,
                    index: nextIndex
                };
                this.placedEntities.push(entityEntry);
            }

            this.enemySpawns.push({
                x,
                y,
                entityId: this.selectedEntity.id,
                entityName: this.selectedEntity.name,
                index: entityEntry.index
            });
            this.drawGrid();
            this.showMessage(`✅ Placed ${this.selectedEntity.name} spawn [${entityEntry.index}] at (${x}, ${y})`);
            return;
        }

        // If item is selected and currentTool is 'item', place on the map
        if (this.selectedItem && this.currentTool === 'item') {
            // Check if there's already an item at this position
            const existingIndex = this.placedItems.findIndex(i => i.x === x && i.y === y);
            if (existingIndex >= 0) {
                // Remove existing item
                this.placedItems.splice(existingIndex, 1);
                this.showMessage(`🗑️ Removed item at (${x}, ${y})`);
            } else {
                // Add new item
                this.placedItems.push({
                    id: this.selectedItem.id,
                    name: this.selectedItem.name,
                    icon: this.selectedItem.icon,
                    x,
                    y
                });
                this.showMessage(`🎁 Placed ${this.selectedItem.name} at (${x}, ${y})`);
            }
            this.drawGrid();
            return;
        }

        // Normal tile placement
        if (this.currentTool === 'player_spawn') {
            if (isOnStairs) {
                this.showMessage('⚠️ Cannot place player spawn on stairs!');
                return;
            }
            this.playerSpawn = { x, y };
        } else if (this.currentTool === 'enemy_spawn') {
            if (isOnStairs) {
                this.showMessage('⚠️ Cannot place enemy spawn on stairs!');
                return;
            }
            const existingIndex = this.enemySpawns.findIndex(s => s.x === x && s.y === y);
            if (existingIndex >= 0) {
                this.enemySpawns.splice(existingIndex, 1);
            } else {
                this.enemySpawns.push({ x, y });
            }
        } else {
            this.tiles[y][x] = this.currentTool as TileType;
        }

        this.drawGrid();
    }

    private drawGrid(): void {
        if (!this.ctx) return;

        const colors: Record<string, string> = {
            floor: '#444',
            wall: '#222',
            door: '#964B00',
            stairs_up: '#4169E1',
            stairs_down: '#1E90FF',
            exit: '#32CD32'
        };

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                this.ctx.fillStyle = colors[tile] || '#666';
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

                this.ctx.strokeStyle = '#000';
                this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            }
        }

        // Draw player spawn (only if it exists)
        if (this.playerSpawn) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(
                this.playerSpawn.x * this.tileSize + 2,
                this.playerSpawn.y * this.tileSize + 2,
                this.tileSize - 4,
                this.tileSize - 4
            );
        }

        // Draw enemy spawns
        this.ctx.fillStyle = '#FF4500';
        this.enemySpawns.forEach(spawn => {
            this.ctx.fillRect(
                spawn.x * this.tileSize + 2,
                spawn.y * this.tileSize + 2,
                this.tileSize - 4,
                this.tileSize - 4
            );

            // Draw index number if present
            if (spawn.index) {
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.font = 'bold 10px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    spawn.index.toString(),
                    spawn.x * this.tileSize + this.tileSize / 2,
                    spawn.y * this.tileSize + this.tileSize / 2
                );
                this.ctx.fillStyle = '#FF4500'; // Reset color
            }
        });

        // Draw placed items
        this.placedItems.forEach(item => {
            // Draw purple background for item
            this.ctx.fillStyle = '#9932CC';
            this.ctx.fillRect(
                item.x * this.tileSize + 2,
                item.y * this.tileSize + 2,
                this.tileSize - 4,
                this.tileSize - 4
            );

            // Draw item icon
            const icon = item.icon || '🎁';
            this.ctx.font = `${this.tileSize * 0.7}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                icon,
                item.x * this.tileSize + this.tileSize / 2,
                item.y * this.tileSize + this.tileSize / 2
            );
        });

        // Draw stairs symbols on top to make them more visible
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (tile === 'stairs_up' || tile === 'stairs_down' || tile === 'exit') {
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.font = 'bold 12px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    const symbol = tile === 'stairs_up' ? '▲' : tile === 'stairs_down' ? '▼' : '✓';
                    this.ctx.fillText(
                        symbol,
                        x * this.tileSize + this.tileSize / 2,
                        y * this.tileSize + this.tileSize / 2
                    );
                }
            }
        }
    }

    private clearGrid(): void {
        this.initTiles();
        this.enemySpawns = [];
        this.placedEntities = [];
        this.drawGrid();
    }

    private fillFloor(): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 'floor';
            }
        }
        this.drawGrid();
    }

    private resizeGrid(): void {
        const widthInput = document.getElementById('level-width') as HTMLInputElement;
        const heightInput = document.getElementById('level-height') as HTMLInputElement;

        const newWidth = Math.max(10, Math.min(100, parseInt(widthInput.value)));
        const newHeight = Math.max(10, Math.min(100, parseInt(heightInput.value)));

        this.width = newWidth;
        this.height = newHeight;

        this.initTiles();
        this.setupCanvas();
        this.drawGrid();
        this.render();
    }

    private generateDungeon(): void {
        const seedInput = document.getElementById('gen-seed') as HTMLInputElement;
        const levelTypeSelect = document.getElementById('gen-level-type') as HTMLSelectElement;
        const roomsSlider = document.getElementById('gen-rooms') as HTMLInputElement;
        const minSizeSlider = document.getElementById('gen-min-size') as HTMLInputElement;
        const maxSizeSlider = document.getElementById('gen-max-size') as HTMLInputElement;

        const seed = parseInt(seedInput.value);
        const levelType = levelTypeSelect?.value || 'middle';
        const maxRooms = parseInt(roomsSlider?.value) || 6;
        const minSize = parseInt(minSizeSlider?.value) || 4;
        const maxSize = parseInt(maxSizeSlider?.value) || 10;

        const rng = mulberry32(seed);
        const generator = new DungeonGenerator(this.width, this.height, rng);

        // Determine level info based on type
        let levelInfo: { isEntrance?: boolean; isFinal?: boolean } = {};
        if (levelType === 'entrance') {
            levelInfo.isEntrance = true;
        } else if (levelType === 'final') {
            levelInfo.isFinal = true;
        }

        // Pass room configuration to generator
        const roomConfig = { maxRooms, minSize, maxSize };
        const result = generator.generate(levelInfo, roomConfig);

        console.log('Generation result:', {
            stairsUp: result.stairsUp,
            stairsDown: result.stairsDown,
            exit: result.exit,
            levelType,
            roomConfig
        });

        // Convert Tile[][] to TileType[][]
        this.tiles = result.tiles.map(row => row.map(tile => tile.type));
        // Clear player spawn during auto-generation - there's only one player for the whole dungeon
        this.playerSpawn = null as any;

        // Check if stairs were placed in tiles
        let stairsCount = 0;
        const stairsPositions: { x: number; y: number; type: string }[] = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x] === 'stairs_up' || this.tiles[y][x] === 'stairs_down' || this.tiles[y][x] === 'exit') {
                    stairsCount++;
                    stairsPositions.push({ x, y, type: this.tiles[y][x] });
                    console.log(`Found ${this.tiles[y][x]} at (${x}, ${y})`);
                }
            }
        }
        console.log(`Total stairs/exit tiles found: ${stairsCount}`);

        // Helper to check if position is on stairs
        const isOnStairs = (x: number, y: number) => {
            const tile = this.tiles[y]?.[x];
            return tile === 'stairs_up' || tile === 'stairs_down' || tile === 'exit';
        };

        // Don't touch player spawn during generation - it should only be set manually

        console.log('Player spawn:', this.playerSpawn);

        // Get entities from library
        const entities = ContentLibrary.getItems('entity');

        if (entities.length > 0) {
            // Filter out enemies that spawn on stairs
            const validEnemies = result.enemies.filter(pos => !isOnStairs(pos.x, pos.y));

            if (validEnemies.length < result.enemies.length) {
                console.log(`Filtered out ${result.enemies.length - validEnemies.length} enemy spawns on stairs`);
            }

            // Auto-assign entities to spawns
            this.enemySpawns = validEnemies.map((pos, index) => {
                // Randomly pick an entity (with wrapping if more spawns than entities)
                const entityIndex = index % entities.length;
                const entity = entities[entityIndex];

                // Check if this entity already has an index
                let entityEntry = this.placedEntities.find(e => e.id === entity.id);

                if (!entityEntry) {
                    const nextIndex = this.placedEntities.length + 1;
                    entityEntry = {
                        id: entity.id,
                        name: entity.name,
                        index: nextIndex
                    };
                    this.placedEntities.push(entityEntry);
                }

                return {
                    x: pos.x,
                    y: pos.y,
                    entityId: entity.id,
                    entityName: entity.name,
                    index: entityEntry.index
                };
            });
        } else {
            // No entities in library, just place spawns without entity info (but still filter stairs)
            const validEnemies = result.enemies.filter(pos => !isOnStairs(pos.x, pos.y));
            this.enemySpawns = validEnemies.map(pos => ({ x: pos.x, y: pos.y }));
            this.placedEntities = [];
        }

        this.drawGrid();
        this.showMessage(`✅ Level generated! (${maxRooms} rooms, size ${minSize}-${maxSize})${entities.length > 0 ? ` - ${entities.length} entity type${entities.length > 1 ? 's' : ''} assigned` : ''}`);
    }

    private exportDungeon(): void {
        const nameInput = document.getElementById('level-name') as HTMLInputElement;
        const descInput = document.getElementById('level-desc') as HTMLTextAreaElement;

        const dungeon: DungeonDefinition = {
            id: `level:${Date.now()}`,
            name: nameInput?.value || 'My Level',
            version: '1.0.0',
            description: descInput?.value || 'A custom level',
            width: this.width,
            height: this.height,
            tiles: this.tiles,
            playerSpawn: this.playerSpawn,
            enemySpawns: this.enemySpawns,
            items: this.placedItems as any // Add placed items to export
        };

        const result = validateDungeon(dungeon);
        if (!result.valid) {
            this.showMessage(`❌ Validation failed:<br/>${result.errors.join('<br/>')}`);
            return;
        }

        const asset = createContentAsset(dungeon.id, dungeon.version, dungeon);

        // Save to library
        ContentLibrary.saveItem({
            id: dungeon.id,
            name: dungeon.name,
            type: 'level',
            data: dungeon
        });
        this.renderTabbedLibrary();

        const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dungeon.id}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showMessage('✅ Level exported successfully!');
    }

    private importDungeon(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event: any) => {
                try {
                    const asset = JSON.parse(event.target.result);
                    const dungeon = asset.content as DungeonDefinition;

                    this.width = dungeon.width;
                    this.height = dungeon.height;
                    this.tiles = dungeon.tiles;
                    this.playerSpawn = dungeon.playerSpawn;
                    this.enemySpawns = dungeon.enemySpawns || [];

                    const nameInput = document.getElementById('level-name') as HTMLInputElement;
                    const descInput = document.getElementById('level-desc') as HTMLTextAreaElement;
                    if (nameInput) nameInput.value = dungeon.name;
                    if (descInput) descInput.value = dungeon.description || '';

                    this.setupCanvas();
                    this.drawGrid();
                    this.showMessage('✅ Level imported successfully!');
                } catch (error) {
                    this.showMessage('❌ Failed to import level');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
