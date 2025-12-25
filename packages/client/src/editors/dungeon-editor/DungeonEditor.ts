import { createContentAsset } from '@roguewar/rules';
import { TabbedLibrary } from '../utils/TabbedLibrary';
import { ContentLibrary } from '../utils/ContentLibrary';

interface LevelReference {
    levelNumber: number;
    levelId: string;
    displayName: string;
    upStairsTo?: number;
    downStairsTo?: number;
}

interface DungeonDefinition {
    id: string;
    name: string;
    description: string;
    startLevel: number;
    levels: LevelReference[];
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

export class DungeonEditor {
    private dungeon: DungeonDefinition = {
        id: `dungeon:${Date.now()}`,
        name: 'New Dungeon',
        description: 'A multi-level dungeon',
        startLevel: 1,
        levels: [
            {
                levelNumber: 1,
                levelId: 'level:level_1',
                displayName: 'Entrance',
                downStairsTo: 2
            }
        ],
        difficulty: 'medium'
    };

    private selectedLevelIndex: number = 0;
    private activeLibraryTab: 'dungeons' | 'levels' = 'dungeons';
    private selectedLevel: { id: string; name: string } | null = null;
    private activeSidebarTab: 'structure' | 'actions' | 'tips' = 'structure';

    constructor(private root: HTMLElement) {
        this.render();
    }

    private render(): void {
        this.root.innerHTML = `
            <div style="display: flex; gap: var(--spacing-lg); height: 100%;">
                <div style="flex: 1; display: flex; flex-direction: column; gap: var(--spacing-lg); overflow-y: auto;">
                    <div class="panel">
                        <div class="panel-title">🏰 Dungeon Properties</div>
                        <div class="form-group">
                            <label class="form-label">Dungeon ID</label>
                            <input type="text" class="form-input" id="dungeon-id" value="${this.dungeon.id}" placeholder="dungeon:goblin_caves" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-input" id="dungeon-name" value="${this.dungeon.name}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" id="dungeon-desc">${this.dungeon.description || ''}</textarea>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                            <div class="form-group">
                                <label class="form-label">Difficulty</label>
                                <select class="form-select" id="dungeon-difficulty">
                                    <option value="easy" ${this.dungeon.difficulty === 'easy' ? 'selected' : ''}>😊 Easy</option>
                                    <option value="medium" ${this.dungeon.difficulty === 'medium' ? 'selected' : ''}>😐 Medium</option>
                                    <option value="hard" ${this.dungeon.difficulty === 'hard' ? 'selected' : ''}>😰 Hard</option>
                                    <option value="extreme" ${this.dungeon.difficulty === 'extreme' ? 'selected' : ''}>💀 Extreme</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Starting Level</label>
                                <input type="number" class="form-input" id="dungeon-start-level" value="${this.dungeon.startLevel}" min="1" />
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 300px 1fr; gap: var(--spacing-lg);">
                        <div class="panel">
                            <div class="panel-title">
                                🗺️ Levels
                                <button class="btn btn-success" id="btn-add-level" style="margin-left: auto; padding: 4px 8px; font-size: 0.75rem;">+</button>
                            </div>
                            <div id="levels-list" style="display: flex; flex-direction: column; gap: 2px;">
                                ${this.renderLevelsList()}
                            </div>
                        </div>
                        
                        ${this.renderLevelEditor()}
                    </div>
                </div>
                
                <div class="editor-sidebar">
                    ${TabbedLibrary.renderTabbedLibrary([
            { id: 'dungeons', label: '🏰 Dungeons', type: 'dungeon' },
            { id: 'levels', label: '🗺️ Levels', type: 'level' }
        ], this.activeLibraryTab, () => { })}
                    
                    ${this.renderSidebarTabs()}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private renderLevelsList(): string {
        return this.dungeon.levels
            .sort((a, b) => a.levelNumber - b.levelNumber)
            .map((lvl, index) => {
                const isActive = index === this.selectedLevelIndex;
                const bgColor = isActive ? 'var(--primary-color-light, rgba(59, 130, 246, 0.2))' : 'transparent';
                return `
                    <div data-level-index="${index}"
                         style="cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 3px 6px; font-size: 0.7rem; border-radius: 4px; background: ${bgColor}; transition: background 0.15s;">
                        <div style="background: var(--primary-color); color: white; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 0.65rem; line-height: 1.2;">
                            ${lvl.levelNumber}
                        </div>
                        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.7rem;">${lvl.displayName}</div>
                        <button class="btn btn-secondary" data-delete-level="${index}" style="padding: 1px 4px; font-size: 0.6rem; line-height: 1.1; opacity: 0.6;">×</button>
                    </div>
                `;
            }).join('');
    }

    private renderLevelEditor(): string {
        const lvl = this.dungeon.levels[this.selectedLevelIndex];
        if (!lvl) return '';

        const otherLevels = this.dungeon.levels.filter(l => l.levelNumber !== lvl.levelNumber);

        return `
            <div class="panel">
                <div class="panel-title">✏️ Edit Level ${lvl.levelNumber}: ${lvl.displayName}</div>
                
                <div class="form-group">
                    <label class="form-label">Level Number</label>
                    <input type="number" class="form-input" id="level-number" value="${lvl.levelNumber}" min="1" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Display Name</label>
                    <input type="text" class="form-input" id="level-name" value="${lvl.displayName}" placeholder="Entrance Hall" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Level (from Level Editor)</label>
                    <select class="form-select" id="level-select" style="width: 100%;">
                        <option value="">-- Select a Level --</option>
                        ${ContentLibrary.getItems('level').map(libLvl => `
                            <option value="${libLvl.id}" ${lvl.levelId === libLvl.id ? 'selected' : ''}>
                                ${libLvl.name} (${libLvl.data.width}×${libLvl.data.height})
                            </option>
                        `).join('')}
                    </select>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                        💡 Create levels in the Level Editor first, then select them here
                    </div>
                </div>
                
                <hr style="border: none; border-top: 1px solid var(--border-color); margin: var(--spacing-md) 0;" />
                
                <div class="form-group">
                    <label class="form-label">Up Stairs To Level</label>
                    <select class="form-select" id="level-up-stairs">
                        <option value="">None</option>
                        ${otherLevels.map(l => `
                            <option value="${l.levelNumber}" ${lvl.upStairsTo === l.levelNumber ? 'selected' : ''}>
                                Level ${l.levelNumber}: ${l.displayName}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Down Stairs To Level</label>
                    <select class="form-select" id="level-down-stairs">
                        <option value="">None</option>
                        ${otherLevels.map(l => `
                            <option value="${l.levelNumber}" ${lvl.downStairsTo === l.levelNumber ? 'selected' : ''}>
                                Level ${l.levelNumber}: ${l.displayName}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    private renderStructurePreview(): string {
        const sorted = [...this.dungeon.levels].sort((a, b) => b.levelNumber - a.levelNumber);

        let preview = `${this.dungeon.name}\n${'='.repeat(this.dungeon.name.length)}\n\n`;

        sorted.forEach((lvl, index) => {
            const isStart = lvl.levelNumber === this.dungeon.startLevel;
            const startMarker = isStart ? '🚪 ' : '   ';

            preview += `${startMarker}Level ${lvl.levelNumber}: ${lvl.displayName}\n`;
            preview += `   📍 ${lvl.levelId}\n`;

            if (lvl.upStairsTo) {
                preview += `   ↑ Up to Level ${lvl.upStairsTo}\n`;
            }
            if (lvl.downStairsTo) {
                preview += `   ↓ Down to Level ${lvl.downStairsTo}\n`;
            }

            if (index < sorted.length - 1) {
                preview += `   │\n`;
            }
        });

        return preview;
    }

    private renderSidebarTabs(): string {
        const tabs = [
            { id: 'structure', label: '🏗️ Structure', icon: '🏗️' },
            { id: 'actions', label: '💾 Actions', icon: '💾' },
            { id: 'tips', label: '💡 Tips', icon: '💡' }
        ];

        const tabButtons = tabs.map(tab => `
            <button 
                class="btn ${this.activeSidebarTab === tab.id ? 'btn-primary' : 'btn-secondary'}" 
                data-sidebar-tab="${tab.id}"
                style="flex: 1; padding: var(--spacing-sm); font-size: 0.875rem;"
            >
                ${tab.icon}
            </button>
        `).join('');

        let tabContent = '';

        if (this.activeSidebarTab === 'structure') {
            tabContent = `
                <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--spacing-md); font-family: monospace; font-size: 0.875rem; max-height: 400px; overflow-y: auto;">
                    ${this.renderStructurePreview()}
                </div>
            `;
        } else if (this.activeSidebarTab === 'actions') {
            tabContent = `
                <div class="btn-group" style="flex-direction: column; width: 100%;">
                    <button class="btn btn-success" id="btn-save-library">💾 Add to Library</button>
                    <button class="btn btn-secondary" id="btn-export">📥 Export JSON</button>
                    <button class="btn btn-secondary" id="btn-import">📤 Import JSON</button>
                    <button class="btn btn-secondary" id="btn-validate">✅ Validate Structure</button>
                </div>
                <div id="validation-messages" class="validation-messages"></div>
            `;
        } else if (this.activeSidebarTab === 'tips') {
            tabContent = `
                <ul style="font-size: 0.875rem; color: var(--text-secondary); padding-left: var(--spacing-lg); margin: 0;">
                    <li>Each level references a Level ID from the Level Editor</li>
                    <li>Connect levels with up/down stairs</li>
                    <li>Starting level determines entry point</li>
                    <li>Create levels first, then reference them here</li>
                </ul>
            `;
        }

        return `
            <div class="panel">
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-md);">
                    ${tabButtons}
                </div>
                ${tabContent}
            </div>
        `;
    }

    private attachEventListeners(): void {
        // Dungeon properties
        document.getElementById('dungeon-id')?.addEventListener('input', (e) => {
            this.dungeon.id = (e.target as HTMLInputElement).value;
        });

        document.getElementById('dungeon-name')?.addEventListener('input', (e) => {
            this.dungeon.name = (e.target as HTMLInputElement).value;
            this.updateStructurePreview();
        });

        document.getElementById('dungeon-desc')?.addEventListener('input', (e) => {
            this.dungeon.description = (e.target as HTMLTextAreaElement).value;
        });

        document.getElementById('dungeon-difficulty')?.addEventListener('change', (e) => {
            this.dungeon.difficulty = (e.target as HTMLSelectElement).value as DungeonDefinition['difficulty'];
        });

        document.getElementById('dungeon-start-level')?.addEventListener('input', (e) => {
            this.dungeon.startLevel = parseInt((e.target as HTMLInputElement).value);
            this.updateStructurePreview();
        });

        // Level selection
        document.querySelectorAll('[data-level-index]').forEach(item => {
            item.addEventListener('click', () => {
                this.selectedLevelIndex = parseInt(item.getAttribute('data-level-index') || '0');
                this.render();
            });
        });

        // Delete level
        document.querySelectorAll('[data-delete-level]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-delete-level') || '0');
                if (this.dungeon.levels.length > 1) {
                    this.dungeon.levels.splice(index, 1);
                    this.selectedLevelIndex = Math.max(0, this.selectedLevelIndex - 1);
                    this.render();
                } else {
                    alert('Cannot delete the last level!');
                }
            });
        });

        // Add level
        document.getElementById('btn-add-level')?.addEventListener('click', () => {
            const maxLevel = Math.max(...this.dungeon.levels.map(l => l.levelNumber), 0);
            const newLevel: LevelReference = {
                levelNumber: maxLevel + 1,
                levelId: `level:level_${maxLevel + 1}`,
                displayName: `Level ${maxLevel + 1}`
            };
            this.dungeon.levels.push(newLevel);
            this.selectedLevelIndex = this.dungeon.levels.length - 1;
            this.render();
        });

        // Level editor
        this.attachLevelEditorListeners();

        // Buttons
        document.getElementById('btn-save-library')?.addEventListener('click', () => this.saveDungeonToLibrary());
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportDungeon());
        document.getElementById('btn-import')?.addEventListener('click', () => this.importDungeon());
        document.getElementById('btn-validate')?.addEventListener('click', () => this.validateDungeon());

        // Sidebar tab switching
        document.querySelectorAll('[data-sidebar-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-sidebar-tab');
                if (tabId) {
                    this.activeSidebarTab = tabId as 'structure' | 'actions' | 'tips';
                    this.render();
                }
            });
        });

        // Library listeners
        const sidebar = this.root.querySelector('.editor-sidebar') as HTMLElement;
        TabbedLibrary.attachTabbedLibraryListeners(
            (tabId) => {
                this.activeLibraryTab = tabId as 'dungeons' | 'levels';
                this.render();
            },
            (item) => this.handleLibrarySelection(item),
            sidebar
        );
    }

    private handleLibrarySelection(item: any): void {
        if (item.type === 'dungeon') {
            // Load dungeon for editing
            if (confirm(`Load dungeon "${item.name}"? Current dungeon will be replaced.`)) {
                this.dungeon = item.data;
                this.selectedLevelIndex = 0;
                this.render();
            }
        } else if (item.type === 'level') {
            // Store selected level for use in level editing
            this.selectedLevel = { id: item.id, name: item.name };

            // If editing a level, auto-fill the level ID
            const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
            if (levelSelect) {
                levelSelect.value = item.id;
                // Trigger update
                const lvl = this.dungeon.levels[this.selectedLevelIndex];
                if (lvl) {
                    lvl.levelId = item.id;
                    this.updateStructurePreview();
                }
            }
        }
    }

    private attachLevelEditorListeners(): void {
        const lvl = this.dungeon.levels[this.selectedLevelIndex];
        if (!lvl) return;

        const updateLevel = () => {
            const newLevelNumber = parseInt((document.getElementById('level-number') as HTMLInputElement).value);
            lvl.levelNumber = newLevelNumber;
            lvl.displayName = (document.getElementById('level-name') as HTMLInputElement).value;

            const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
            lvl.levelId = levelSelect.value;

            const upStairsValue = (document.getElementById('level-up-stairs') as HTMLSelectElement).value;
            lvl.upStairsTo = upStairsValue ? parseInt(upStairsValue) : undefined;

            const downStairsValue = (document.getElementById('level-down-stairs') as HTMLSelectElement).value;
            lvl.downStairsTo = downStairsValue ? parseInt(downStairsValue) : undefined;

            this.updateStructurePreview();
        };

        ['level-number', 'level-name'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateLevel);
        });

        ['level-select', 'level-up-stairs', 'level-down-stairs'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updateLevel);
        });
    }

    private updateStructurePreview(): void {
        const previewDiv = document.querySelector('.panel:has(.panel-title:contains("Dungeon Structure"))');
        if (previewDiv) {
            const structureDiv = previewDiv.querySelector('div[style*="monospace"]');
            if (structureDiv) {
                structureDiv.innerHTML = this.renderStructurePreview();
            }
        }
    }

    private validateDungeon(): boolean {
        const messagesDiv = document.getElementById('validation-messages')!;
        const errors: string[] = [];

        if (!this.dungeon.id || !this.dungeon.name) {
            errors.push('Dungeon ID and Name are required');
        }

        if (this.dungeon.levels.length === 0) {
            errors.push('Dungeon must have at least one level');
        }

        // Check level numbers are unique
        const levelNumbers = this.dungeon.levels.map(l => l.levelNumber);
        const uniqueLevels = new Set(levelNumbers);
        if (levelNumbers.length !== uniqueLevels.size) {
            errors.push('Level numbers must be unique');
        }

        // Check start level exists
        if (!this.dungeon.levels.find(l => l.levelNumber === this.dungeon.startLevel)) {
            errors.push(`Start level ${this.dungeon.startLevel} does not exist`);
        }

        // Check stair connections
        this.dungeon.levels.forEach(lvl => {
            if (lvl.upStairsTo && !this.dungeon.levels.find(l => l.levelNumber === lvl.upStairsTo)) {
                errors.push(`Level ${lvl.levelNumber} has invalid up stairs to level ${lvl.upStairsTo}`);
            }
            if (lvl.downStairsTo && !this.dungeon.levels.find(l => l.levelNumber === lvl.downStairsTo)) {
                errors.push(`Level ${lvl.levelNumber} has invalid down stairs to level ${lvl.downStairsTo}`);
            }
        });

        if (errors.length > 0) {
            messagesDiv.innerHTML = errors.map(err =>
                `<div class="validation-error">⚠️ ${err}</div>`
            ).join('');
            return false;
        }

        messagesDiv.innerHTML = '<div class="validation-warning">✅ Dungeon structure is valid!</div>';
        return true;
    }

    private saveDungeonToLibrary(): void {
        if (!this.validateDungeon()) return;

        // Save to library
        ContentLibrary.saveItem({
            id: this.dungeon.id,
            name: this.dungeon.name,
            type: 'dungeon',
            data: this.dungeon
        });

        const messagesDiv = document.getElementById('validation-messages')!;
        messagesDiv.innerHTML = '<div class="validation-warning">✅ Dungeon added to library!</div>';
    }

    private exportDungeon(): void {
        if (!this.validateDungeon()) return;

        const asset = createContentAsset(this.dungeon.id, '1.0.0', this.dungeon);

        const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.dungeon.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        const messagesDiv = document.getElementById('validation-messages')!;
        messagesDiv.innerHTML = '<div class="validation-warning">✅ Dungeon exported to JSON file!</div>';
    }

    private importDungeon(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = JSON.parse(e.target?.result as string);
                    this.dungeon = content.data || content;
                    this.selectedLevelIndex = 0;
                    this.render();

                    const messagesDiv = document.getElementById('validation-messages')!;
                    messagesDiv.innerHTML = '<div class="validation-warning">✅ Dungeon imported successfully!</div>';
                } catch (err) {
                    alert('Invalid dungeon file: ' + err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
