import { ExtendedEntityTemplate, validateEntity, createContentAsset, AIBehaviorParams } from '@roguewar/rules';
import { ContentLibrary } from '../utils/ContentLibrary';

export class EntityEditor {
    private entity: ExtendedEntityTemplate = {
        id: `entity:${Date.now()}`,
        name: 'New Enemy',
        description: 'A custom enemy entity',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        aiBehavior: {
            detectionRange: 5,
            attackRange: 1,
            aggressionLevel: 0.5,
            movementPattern: 'chase'
        },
        color: '#f85149',
        sprite: 'goblin',
        tags: []
    };

    private spriteTemplate: string = 'goblin';

    constructor(private root: HTMLElement) {
        // Sync sprite template with entity if it exists
        this.spriteTemplate = this.entity.sprite || 'goblin';
        this.render();
    }

    private render(): void {
        this.root.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 350px 560px; gap: var(--spacing-lg); height: 100%;">
                <div style="display: flex; flex-direction: column; gap: var(--spacing-lg); overflow-y: auto;">
                    <div class="panel">
                        <div class="panel-title">📋 Basic Properties</div>
                        <div class="form-group">
                            <label class="form-label">Entity ID</label>
                            <input type="text" class="form-input" id="entity-id" value="${this.entity.id}" placeholder="entity:goblin" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-input" id="entity-name" value="${this.entity.name}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" id="entity-desc">${this.entity.description || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">⚔️ Combat Stats</div>
                        <div class="form-group">
                            <label class="form-label">
                                Max HP
                                <span class="slider-value" id="maxhp-value">${this.entity.maxHp}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-maxhp" min="10" max="500" value="${this.entity.maxHp}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Starting HP
                                <span class="slider-value" id="hp-value">${this.entity.hp}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-hp" min="1" max="${this.entity.maxHp}" value="${this.entity.hp}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Attack
                                <span class="slider-value" id="attack-value">${this.entity.attack}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-attack" min="1" max="100" value="${this.entity.attack}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Defense
                                <span class="slider-value" id="defense-value">${this.entity.defense || 0}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-defense" min="0" max="50" value="${this.entity.defense || 0}" />
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">🤖 AI Behavior</div>
                        <div class="form-group">
                            <label class="form-label">Movement Pattern</label>
                            <select class="form-select" id="entity-movement">
                                <option value="stationary" ${this.entity.aiBehavior?.movementPattern === 'stationary' ? 'selected' : ''}>Stationary</option>
                                <option value="patrol" ${this.entity.aiBehavior?.movementPattern === 'patrol' ? 'selected' : ''}>Patrol</option>
                                <option value="wander" ${this.entity.aiBehavior?.movementPattern === 'wander' ? 'selected' : ''}>Wander</option>
                                <option value="chase" ${this.entity.aiBehavior?.movementPattern === 'chase' ? 'selected' : ''}>Chase</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Detection Range
                                <span class="slider-value" id="detection-value">${this.entity.aiBehavior?.detectionRange || 5}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-detection" min="1" max="20" value="${this.entity.aiBehavior?.detectionRange || 5}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Attack Range
                                <span class="slider-value" id="range-value">${this.entity.aiBehavior?.attackRange || 1}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-range" min="1" max="10" value="${this.entity.aiBehavior?.attackRange || 1}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Aggression Level
                                <span class="slider-value" id="aggression-value">${((this.entity.aiBehavior?.aggressionLevel || 0.5) * 100).toFixed(0)}%</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-aggression" min="0" max="100" value="${(this.entity.aiBehavior?.aggressionLevel || 0.5) * 100}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Flee Threshold (HP %)
                                <span class="slider-value" id="flee-value">${((this.entity.aiBehavior?.fleeThreshold || 0.2) * 100).toFixed(0)}%</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-flee" min="0" max="100" value="${(this.entity.aiBehavior?.fleeThreshold || 0.2) * 100}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Group Behavior</label>
                            <select class="form-select" id="entity-group">
                                <option value="independent" ${this.entity.aiBehavior?.groupBehavior === 'independent' ? 'selected' : ''}>Independent</option>
                                <option value="pack" ${this.entity.aiBehavior?.groupBehavior === 'pack' ? 'selected' : ''}>Pack (coordinate attacks)</option>
                                <option value="defensive" ${this.entity.aiBehavior?.groupBehavior === 'defensive' ? 'selected' : ''}>Defensive (protect allies)</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="editor-sidebar">
                    <div class="panel">
                        <div class="panel-title">🎨 Appearance</div>
                        <div class="form-group">
                            <label class="form-label">Color</label>
                            <input type="color" class="form-input" id="entity-color" value="${this.entity.color || '#f85149'}" style="height: 60px;" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tags (comma-separated)</label>
                            <input type="text" class="form-input" id="entity-tags" value="${this.entity.tags?.join(', ') || ''}" placeholder="undead, melee" />
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">🎭 Sprite Template</div>
                        <div class="palette" id="sprite-gallery" style="grid-template-columns: repeat(3, 1fr);">
                            <div class="palette-item active" data-sprite="goblin">
                                <div class="palette-icon">👺</div>
                                <div style="font-size: 0.7rem;">Goblin</div>
                            </div>
                            <div class="palette-item" data-sprite="orc">
                                <div class="palette-icon">🧟</div>
                                <div style="font-size: 0.7rem;">Orc</div>
                            </div>
                            <div class="palette-item" data-sprite="skeleton">
                                <div class="palette-icon">💀</div>
                                <div style="font-size: 0.7rem;">Skeleton</div>
                            </div>
                            <div class="palette-item" data-sprite="ghost">
                                <div class="palette-icon">👻</div>
                                <div style="font-size: 0.7rem;">Ghost</div>
                            </div>
                            <div class="palette-item" data-sprite="demon">
                                <div class="palette-icon">😈</div>
                                <div style="font-size: 0.7rem;">Demon</div>
                            </div>
                            <div class="palette-item" data-sprite="dragon">
                                <div class="palette-icon">🐉</div>
                                <div style="font-size: 0.7rem;">Dragon</div>
                            </div>
                            <div class="palette-item" data-sprite="slime">
                                <div class="palette-icon">🟢</div>
                                <div style="font-size: 0.7rem;">Slime</div>
                            </div>
                            <div class="palette-item" data-sprite="elf">
                                <div class="palette-icon">🧝</div>
                                <div style="font-size: 0.7rem;">Elf</div>
                            </div>
                            <div class="palette-item" data-sprite="dwarf">
                                <div class="palette-icon">🧔</div>
                                <div style="font-size: 0.7rem;">Dwarf</div>
                            </div>
                            <div class="palette-item" data-sprite="gnome">
                                <div class="palette-icon">🧙</div>
                                <div style="font-size: 0.7rem;">Gnome</div>
                            </div>
                            <div class="palette-item" data-sprite="zombie">
                                <div class="palette-icon">🧟‍♂️</div>
                                <div style="font-size: 0.7rem;">Zombie</div>
                            </div>
                            <div class="palette-item" data-sprite="vampire">
                                <div class="palette-icon">🧛</div>
                                <div style="font-size: 0.7rem;">Vampire</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">👁️ Preview</div>
                        <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--spacing-lg); text-align: center;">
                            <div id="entity-sprite" style="font-size: 120px; line-height: 1; margin: 0 auto var(--spacing-md);">${this.getSpriteEmoji()}</div>
                            <div style="font-weight: 600; margin-bottom: var(--spacing-xs);" id="preview-name">${this.entity.name}</div>
                            <div style="color: var(--text-secondary); font-size: 0.875rem;">
                                HP: <span id="preview-hp">${this.entity.hp}</span>/<span id="preview-maxhp">${this.entity.maxHp}</span><br/>
                                ATK: <span id="preview-attack">${this.entity.attack}</span> | DEF: <span id="preview-defense">${this.entity.defense}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">💾 Actions</div>
                        <div class="btn-group" style="flex-direction: column; width: 100%;">
                            <button class="btn btn-success" id="btn-save-library">💾 Add to Library</button>
                            <button class="btn btn-secondary" id="btn-export">📥 Export JSON</button>
                            <button class="btn btn-secondary" id="btn-import">📤 Import JSON</button>
                            <button class="btn btn-secondary" id="btn-reset">🔄 Reset to Defaults</button>
                        </div>
                        <div id="validation-messages" class="validation-messages"></div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">💡 AI Tips</div>
                        <ul style="font-size: 0.875rem; color: var(--text-secondary); padding-left: var(--spacing-lg);">
                            <li><strong>Stationary:</strong> Guards a location</li>
                            <li><strong>Patrol:</strong> Walks set paths</li>
                            <li><strong>Wander:</strong> Random movement</li>
                            <li><strong>Chase:</strong> Pursues enemies</li>
                            <li><strong>Pack:</strong> Groups focus targets</li>
                            <li><strong>Defensive:</strong> Protects wounded allies</li>
                        </ul>
                    </div>
                </div>
                
                <div id="library-column" style="overflow-y: auto;">
                    <div id="library-panel">
                        <!-- Library will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        this.renderLibrary();
        this.attachEventListeners();
    }

    private renderLibrary(): void {
        const panel = document.getElementById('library-panel');
        if (!panel) return;

        panel.innerHTML = ContentLibrary.renderLibraryPanel(
            'entity',
            () => { }, // onLoad handled in attachLibraryListeners
            () => { }  // onDelete handled in attachLibraryListeners
        );

        ContentLibrary.attachLibraryListeners('entity', (item) => {
            this.loadFromLibrary(item);
        }, () => {
            this.renderLibrary();
        }, panel);
    }

    private loadFromLibrary(item: any): void {
        this.entity = item.data;
        this.spriteTemplate = this.entity.sprite || 'goblin';
        this.render();

        // Update sprite gallery to show the correct selected sprite
        const spriteItems = document.querySelectorAll('#sprite-gallery .palette-item');
        spriteItems.forEach(spriteItem => {
            const sprite = spriteItem.getAttribute('data-sprite');
            if (sprite === this.spriteTemplate) {
                spriteItem.classList.add('active');
            } else {
                spriteItem.classList.remove('active');
            }
        });

        const messagesDiv = document.getElementById('validation-messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = `<div class="validation-warning">✅ Loaded "${item.name}" from library</div>`;
        }
    }

    private attachEventListeners(): void {
        // Update entity from inputs
        const updateEntity = () => {
            this.entity.id = (document.getElementById('entity-id') as HTMLInputElement).value;
            this.entity.name = (document.getElementById('entity-name') as HTMLInputElement).value;
            this.entity.description = (document.getElementById('entity-desc') as HTMLTextAreaElement).value;
            this.entity.maxHp = parseInt((document.getElementById('entity-maxhp') as HTMLInputElement).value);
            this.entity.hp = parseInt((document.getElementById('entity-hp') as HTMLInputElement).value);
            this.entity.attack = parseInt((document.getElementById('entity-attack') as HTMLInputElement).value);
            this.entity.defense = parseInt((document.getElementById('entity-defense') as HTMLInputElement).value);
            this.entity.color = (document.getElementById('entity-color') as HTMLInputElement).value;

            const tagsInput = (document.getElementById('entity-tags') as HTMLInputElement).value;
            this.entity.tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

            if (!this.entity.aiBehavior) {
                this.entity.aiBehavior = {} as AIBehaviorParams;
            }

            this.entity.aiBehavior.movementPattern = (document.getElementById('entity-movement') as HTMLSelectElement).value as any;
            this.entity.aiBehavior.detectionRange = parseInt((document.getElementById('entity-detection') as HTMLInputElement).value);
            this.entity.aiBehavior.attackRange = parseInt((document.getElementById('entity-range') as HTMLInputElement).value);
            this.entity.aiBehavior.aggressionLevel = parseInt((document.getElementById('entity-aggression') as HTMLInputElement).value) / 100;
            this.entity.aiBehavior.fleeThreshold = parseInt((document.getElementById('entity-flee') as HTMLInputElement).value) / 100;
            this.entity.aiBehavior.groupBehavior = (document.getElementById('entity-group') as HTMLSelectElement).value as any;

            this.updatePreview();
        };

        // Slider updates
        const sliders = [
            { id: 'entity-maxhp', valueId: 'maxhp-value' },
            { id: 'entity-hp', valueId: 'hp-value' },
            { id: 'entity-attack', valueId: 'attack-value' },
            { id: 'entity-defense', valueId: 'defense-value' },
            { id: 'entity-detection', valueId: 'detection-value' },
            { id: 'entity-range', valueId: 'range-value' },
            { id: 'entity-aggression', valueId: 'aggression-value', isPercent: true },
            { id: 'entity-flee', valueId: 'flee-value', isPercent: true }
        ];

        sliders.forEach(({ id, valueId, isPercent }) => {
            const slider = document.getElementById(id) as HTMLInputElement;
            slider?.addEventListener('input', () => {
                const value = parseInt(slider.value);
                const display = isPercent ? `${value}%` : value.toString();
                const valueSpan = document.getElementById(valueId);
                if (valueSpan) valueSpan.textContent = display;
                updateEntity();
            });
        });

        // Text inputs
        ['entity-id', 'entity-name', 'entity-desc', 'entity-color', 'entity-tags'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateEntity);
        });

        // Selects
        ['entity-movement', 'entity-group'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updateEntity);
        });

        // Sprite gallery
        const spriteItems = document.querySelectorAll('#sprite-gallery .palette-item');
        spriteItems.forEach(item => {
            item.addEventListener('click', () => {
                spriteItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.spriteTemplate = item.getAttribute('data-sprite') || 'goblin';
                this.entity.sprite = this.spriteTemplate;
                this.updatePreview();
            });
        });

        // Buttons
        document.getElementById('btn-save-library')?.addEventListener('click', () => this.saveToLibrary());
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportEntity());
        document.getElementById('btn-import')?.addEventListener('click', () => this.importEntity());
        document.getElementById('btn-reset')?.addEventListener('click', () => this.resetEntity());
    }

    private getSpriteEmoji(): string {
        const emojiMap: { [key: string]: string } = {
            'goblin': '👺',
            'orc': '🧟',
            'skeleton': '💀',
            'ghost': '👻',
            'demon': '😈',
            'dragon': '🐉',
            'slime': '🟢',
            'elf': '🧝',
            'dwarf': '🧔',
            'gnome': '🧙',
            'zombie': '🧟‍♂️',
            'vampire': '🧛'
        };
        return emojiMap[this.spriteTemplate] || '👺';
    }

    private updatePreview(): void {
        // Update sprite emoji
        const spriteDiv = document.getElementById('entity-sprite');
        if (spriteDiv) {
            spriteDiv.textContent = this.getSpriteEmoji();
        }

        const update = (id: string, value: string | number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value.toString();
        };

        update('preview-name', this.entity.name);
        update('preview-hp', this.entity.hp);
        update('preview-maxhp', this.entity.maxHp);
        update('preview-attack', this.entity.attack);
        update('preview-defense', this.entity.defense || 0);
    }

    private saveToLibrary(): void {
        const validation = validateEntity(this.entity);
        const messagesDiv = document.getElementById('validation-messages')!;

        if (!validation.valid) {
            messagesDiv.innerHTML = validation.errors.map(err =>
                `<div class="validation-error"><strong>${err.field}:</strong> ${err.message}</div>`
            ).join('');
            return;
        }

        messagesDiv.innerHTML = '';
        if (validation.warnings.length > 0) {
            messagesDiv.innerHTML = validation.warnings.map(warn =>
                `<div class="validation-warning"><strong>${warn.field}:</strong> ${warn.message}</div>`
            ).join('');
        }

        // Check for ID conflicts
        const existing = ContentLibrary.getItem(this.entity.id);
        if (existing) {
            const shouldOverwrite = confirm(
                `An entity with ID "${this.entity.id}" already exists in the library.\n\n` +
                `Click OK to overwrite it, or Cancel to generate a new unique ID.`
            );

            if (!shouldOverwrite) {
                // Generate new unique ID
                const timestamp = Date.now();
                const newId = `entity:${this.entity.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;
                this.entity.id = newId;
                (document.getElementById('entity-id') as HTMLInputElement).value = newId;
                messagesDiv.innerHTML = `<div class="validation-warning">⚠️ Generated new ID: ${newId}</div>`;
            }
        }

        // Save to library
        console.log('[EntityEditor] Saving entity to library:', this.entity.id, 'sprite:', this.entity.sprite);
        ContentLibrary.saveItem({
            id: this.entity.id,
            name: this.entity.name,
            type: 'entity',
            data: { ...this.entity } // deep copy to avoid reference issues
        });
        this.renderLibrary();

        messagesDiv.innerHTML += '<div class="validation-warning">✅ Entity added to library!</div>';
    }

    private exportEntity(): void {
        const validation = validateEntity(this.entity);
        const messagesDiv = document.getElementById('validation-messages')!;

        if (!validation.valid) {
            messagesDiv.innerHTML = validation.errors.map(err =>
                `<div class="validation-error"><strong>${err.field}:</strong> ${err.message}</div>`
            ).join('');
            return;
        }

        const asset = createContentAsset(this.entity.id, '1.0.0', this.entity);

        const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.entity.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        messagesDiv.innerHTML = '<div class="validation-warning">✅ Entity exported to JSON file!</div>';
    }

    private importEntity(): void {
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
                    this.entity = content.data || content;
                    this.render();

                    const messagesDiv = document.getElementById('validation-messages')!;
                    messagesDiv.innerHTML = '<div class="validation-warning">✅ Entity template imported successfully!</div>';
                } catch (err) {
                    alert('Invalid entity file: ' + err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    private resetEntity(): void {
        this.entity = {
            id: `entity:${Date.now()}`,
            name: 'New Enemy',
            description: 'A custom enemy entity',
            hp: 100,
            maxHp: 100,
            attack: 10,
            defense: 5,
            aiBehavior: {
                detectionRange: 5,
                attackRange: 1,
                aggressionLevel: 0.5,
                movementPattern: 'chase'
            },
            color: '#f85149',
            tags: []
        };
        this.render();
    }
}
