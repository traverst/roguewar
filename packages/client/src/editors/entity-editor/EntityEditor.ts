import { ExtendedEntityTemplate, validateEntity, createContentAsset, AIBehaviorParams } from '@roguewar/rules';
import { ContentLibrary } from '../utils/ContentLibrary';

export class EntityEditor {
    private entity: ExtendedEntityTemplate = {
        id: `entity:${Date.now()}`,
        name: 'New Enemy',
        description: 'A custom enemy entity',
        hp: 100,
        maxHp: 100,
        attack: 0,  // Default attack bonus
        defense: 10,  // Default AC (lower is better)
        aiBehavior: {
            detectionRange: 5,
            attackRange: 1,
            aggressionLevel: 0.5,
            movementPattern: 'chase'
        },
        color: '#f85149',
        sprite: 'goblin',
        tags: [],
        inventory: { slots: [] },  // Loot items this entity drops on death
        equipment: { slots: {} }    // Equipped weapons and armor
    } as any;

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
                        <div class="panel-title">⚔️ D20 Combat Stats</div>
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
                        
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);"></div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">🎲 D&D Ability Scores</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">
                                    STR <span class="slider-value" id="strength-value">${(this.entity as any).strength || 10}</span>
                                </label>
                                <input type="range" class="form-slider" id="entity-strength" min="1" max="20" value="${(this.entity as any).strength || 10}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">
                                    DEX <span class="slider-value" id="dexterity-value">${(this.entity as any).dexterity || 10}</span>
                                </label>
                                <input type="range" class="form-slider" id="entity-dexterity" min="1" max="20" value="${(this.entity as any).dexterity || 10}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">
                                    CON <span class="slider-value" id="constitution-value">${(this.entity as any).constitution || 10}</span>
                                </label>
                                <input type="range" class="form-slider" id="entity-constitution" min="1" max="20" value="${(this.entity as any).constitution || 10}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">
                                    INT <span class="slider-value" id="intelligence-value">${(this.entity as any).intelligence || 10}</span>
                                </label>
                                <input type="range" class="form-slider" id="entity-intelligence" min="1" max="20" value="${(this.entity as any).intelligence || 10}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">
                                    WIS <span class="slider-value" id="wisdom-value">${(this.entity as any).wisdom || 10}</span>
                                </label>
                                <input type="range" class="form-slider" id="entity-wisdom" min="1" max="20" value="${(this.entity as any).wisdom || 10}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">
                                    CHA <span class="slider-value" id="charisma-value">${(this.entity as any).charisma || 10}</span>
                                </label>
                                <input type="range" class="form-slider" id="entity-charisma" min="1" max="20" value="${(this.entity as any).charisma || 10}" />
                            </div>
                        </div>
                        
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);"></div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">⚔️ Combat Modifiers</div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                Attack Bonus (to-hit)
                                <span class="slider-value" id="attack-value">${this.entity.attack || 0}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-attack" min="0" max="10" value="${this.entity.attack || 0}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Damage Dice</label>
                            <input type="text" class="form-input" id="entity-damage" placeholder="1d6" value="${(this.entity as any).damage || '1d6'}" />
                            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button class="damage-preset-btn" data-dice="1d4" style="padding: 0.3rem 0.6rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem;">1d4</button>
                                <button class="damage-preset-btn" data-dice="1d6" style="padding: 0.3rem 0.6rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem;">1d6</button>
                                <button class="damage-preset-btn" data-dice="1d8" style="padding: 0.3rem 0.6rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem;">1d8</button>
                                <button class="damage-preset-btn" data-dice="2d6" style="padding: 0.3rem 0.6rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem;">2d6</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Defense (AC - lower is better)
                                <span class="slider-value" id="defense-value">${this.entity.defense || 10}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-defense" min="0" max="15" value="${this.entity.defense || 10}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                ✨ XP Value (reward when killed)
                                <span class="slider-value" id="xp-value">${(this.entity as any).xpValue || 10}</span>
                            </label>
                            <input type="range" class="form-slider" id="entity-xp" min="1" max="100" value="${(this.entity as any).xpValue || 10}" />
                            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                💡 Auto-calculated if left at 10
                            </div>
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
                    
                    <div class="panel">
                        <div class="panel-title">⚔️ Equipment</div>
                        <div style="margin-bottom: var(--spacing-md);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--spacing-sm);">
                                🗡️ Weapon Slot
                            </div>
                            <select id="equipment-weapon-select" class="form-select" style="width: 100%;">
                                <option value="">-- No weapon equipped --</option>
                                ${this.getLibraryWeaponOptions()}
                            </select>
                            <button id="btn-equip-weapon" class="btn btn-success" style="width: 100%; margin-top: var(--spacing-xs);">Equip Weapon</button>
                            <div id="equipped-weapon-display" style="margin-top: var(--spacing-xs);">
                                ${this.renderEquippedWeapon()}
                            </div>
                        </div>
                        
                        <div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--spacing-sm);">
                                🛡️ Armor Slot
                            </div>
                            <select id="equipment-armor-select" class="form-select" style="width: 100%;">
                                <option value="">-- No armor equipped --</option>
                                ${this.getLibraryArmorOptions()}
                            </select>
                            <button id="btn-equip-armor" class="btn btn-success" style="width: 100%; margin-top: var(--spacing-xs);">Equip Armor</button>
                            <div id="equipped-armor-display" style="margin-top: var(--spacing-xs);">
                                ${this.renderEquippedArmor()}
                            </div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: var(--spacing-sm);">
                            💡 Enemy spawns with this equipment
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">🎁 Loot Drops</div>
                        <div style="margin-bottom: var(--spacing-sm);">
                            <select id="loot-item-select" class="form-select" style="width: 100%;">
                                <option value="">-- Select item to add --</option>
                                ${this.getLibraryItemOptions()}
                            </select>
                            <button id="btn-add-loot" class="btn btn-success" style="width: 100%; margin-top: var(--spacing-xs);">+ Add to Loot Table</button>
                        </div>
                        <div id="loot-list" style="display: flex; flex-direction: column; gap: var(--spacing-xs);">
                            ${this.renderLootList()}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: var(--spacing-xs);">
                            💡 Items here drop when this enemy dies
                        </div>
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

            // D&D Ability Scores
            (this.entity as any).strength = parseInt((document.getElementById('entity-strength') as HTMLInputElement)?.value || '10');
            (this.entity as any).dexterity = parseInt((document.getElementById('entity-dexterity') as HTMLInputElement)?.value || '10');
            (this.entity as any).constitution = parseInt((document.getElementById('entity-constitution') as HTMLInputElement)?.value || '10');
            (this.entity as any).intelligence = parseInt((document.getElementById('entity-intelligence') as HTMLInputElement)?.value || '10');
            (this.entity as any).wisdom = parseInt((document.getElementById('entity-wisdom') as HTMLInputElement)?.value || '10');
            (this.entity as any).charisma = parseInt((document.getElementById('entity-charisma') as HTMLInputElement)?.value || '10');

            // Combat modifiers
            this.entity.attack = parseInt((document.getElementById('entity-attack') as HTMLInputElement).value);
            (this.entity as any).damage = (document.getElementById('entity-damage') as HTMLInputElement).value;
            this.entity.defense = parseInt((document.getElementById('entity-defense') as HTMLInputElement).value);
            (this.entity as any).xpValue = parseInt((document.getElementById('entity-xp') as HTMLInputElement)?.value || '10');
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
            { id: 'entity-strength', valueId: 'strength-value' },
            { id: 'entity-dexterity', valueId: 'dexterity-value' },
            { id: 'entity-constitution', valueId: 'constitution-value' },
            { id: 'entity-intelligence', valueId: 'intelligence-value' },
            { id: 'entity-wisdom', valueId: 'wisdom-value' },
            { id: 'entity-charisma', valueId: 'charisma-value' },
            { id: 'entity-attack', valueId: 'attack-value' },
            { id: 'entity-defense', valueId: 'defense-value' },
            { id: 'entity-xp', valueId: 'xp-value' },
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
        ['entity-id', 'entity-name', 'entity-desc', 'entity-color', 'entity-tags', 'entity-damage'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateEntity);
        });

        // Damage dice preset buttons
        document.querySelectorAll('.damage-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const dice = (e.target as HTMLElement).getAttribute('data-dice');
                const damageInput = document.getElementById('entity-damage') as HTMLInputElement;
                if (dice && damageInput) {
                    damageInput.value = dice;
                    updateEntity();
                }
            });
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

        // Equipment buttons
        document.getElementById('btn-equip-weapon')?.addEventListener('click', () => {
            const select = document.getElementById('equipment-weapon-select') as HTMLSelectElement;
            if (select && select.value) {
                this.equipWeapon(select.value);
                select.value = '';
            }
        });

        document.getElementById('btn-equip-armor')?.addEventListener('click', () => {
            const select = document.getElementById('equipment-armor-select') as HTMLSelectElement;
            if (select && select.value) {
                this.equipArmor(select.value);
                select.value = '';
            }
        });

        // Loot panel
        document.getElementById('btn-add-loot')?.addEventListener('click', () => {
            const select = document.getElementById('loot-item-select') as HTMLSelectElement;
            if (select && select.value) {
                this.addLootItem(select.value);
                select.value = '';  // Reset dropdown
            }
        });

        // Initial loot remove buttons
        this.refreshLootList();
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

        // Get emoji icon from sprite template
        const icon = this.getSpriteEmoji();

        ContentLibrary.saveItem({
            id: this.entity.id,
            name: this.entity.name,
            type: 'entity',
            data: { ...this.entity, icon } // Include icon for rendering
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

    private getLibraryWeaponOptions(): string {
        const items = ContentLibrary.getItems('item');
        const weapons = items.filter((item: any) => item.data?.type === 'weapon');
        if (weapons.length === 0) {
            return '<option value="" disabled>No weapons in library - create some in Item Editor</option>';
        }
        return weapons.map((item: any) =>
            `<option value="${item.id}">${item.data?.icon || '⚔️'} ${item.name}</option>`
        ).join('');
    }

    private getLibraryArmorOptions(): string {
        const items = ContentLibrary.getItems('item');
        const armors = items.filter((item: any) => item.data?.type === 'armor');
        if (armors.length === 0) {
            return '<option value="" disabled>No armor in library - create some in Item Editor</option>';
        }
        return armors.map((item: any) =>
            `<option value="${item.id}">${item.data?.icon || '🛡️'} ${item.name}</option>`
        ).join('');
    }

    private renderEquippedWeapon(): string {
        const weapon = (this.entity as any).equipment?.slots?.weapon;
        if (!weapon) {
            return '<div style="color: var(--text-secondary); font-size: 0.8rem; font-style: italic;">No weapon equipped</div>';
        }
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: var(--spacing-xs); border-radius: var(--radius-sm);">
                <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                    <span>${weapon.icon || '⚔️'}</span>
                    <span style="font-size: 0.85rem;">${weapon.name}</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">${weapon.damage || ''}</span>
                </div>
                <button class="btn-unequip-weapon" style="background: #a44; border: none; color: #fff; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 0.7rem;">✕</button>
            </div>
        `;
    }

    private renderEquippedArmor(): string {
        const armor = (this.entity as any).equipment?.slots?.armor;
        if (!armor) {
            return '<div style="color: var(--text-secondary); font-size: 0.8rem; font-style: italic;">No armor equipped</div>';
        }
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: var(--spacing-xs); border-radius: var(--radius-sm);">
                <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                    <span>${armor.icon || '🛡️'}</span>
                    <span style="font-size: 0.85rem;">${armor.name}</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">AC +${armor.armorBonus || 0}</span>
                </div>
                <button class="btn-unequip-armor" style="background: #a44; border: none; color: #fff; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 0.7rem;">✕</button>
            </div>
        `;
    }

    private getLibraryItemOptions(): string {
        const items = ContentLibrary.getItems('item');
        if (items.length === 0) {
            return '<option value="" disabled>No items in library - create some in Item Editor</option>';
        }
        return items.map((item: any) =>
            `<option value="${item.id}">${item.data?.icon || '🎁'} ${item.name}</option>`
        ).join('');
    }

    private renderLootList(): string {
        const inventory = (this.entity as any).inventory?.slots || [];
        if (inventory.length === 0) {
            return '<div style="color: var(--text-secondary); font-size: 0.8rem; font-style: italic;">No loot items added yet</div>';
        }
        return inventory.map((item: any, index: number) => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: var(--spacing-xs); border-radius: var(--radius-sm);">
                <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                    <span>${item.icon || '🎁'}</span>
                    <span style="font-size: 0.85rem;">${item.name || item.itemId}</span>
                </div>
                <button class="btn-remove-loot" data-index="${index}" style="background: #a44; border: none; color: #fff; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 0.7rem;">✕</button>
            </div>
        `).join('');
    }

    private refreshLootList(): void {
        const lootListEl = document.getElementById('loot-list');
        if (lootListEl) {
            lootListEl.innerHTML = this.renderLootList();
            // Re-attach remove button listeners
            lootListEl.querySelectorAll('.btn-remove-loot').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt((btn as HTMLElement).dataset.index || '0');
                    this.removeLootItem(index);
                });
            });
        }
    }

    private equipWeapon(itemId: string): void {
        const libraryItem = ContentLibrary.getItem(itemId) as any;
        if (libraryItem && libraryItem.data) {
            if (!(this.entity as any).equipment) {
                (this.entity as any).equipment = { slots: {} };
            }
            // Store complete item data
            (this.entity as any).equipment.slots.weapon = {
                ...libraryItem.data,
                itemId: libraryItem.id
            };
            console.log('[EntityEditor] Equipped weapon:', libraryItem.name);
            this.refreshEquipmentDisplay();
        }
    }

    private equipArmor(itemId: string): void {
        const libraryItem = ContentLibrary.getItem(itemId) as any;
        if (libraryItem && libraryItem.data) {
            if (!(this.entity as any).equipment) {
                (this.entity as any).equipment = { slots: {} };
            }
            // Store complete item data
            (this.entity as any).equipment.slots.armor = {
                ...libraryItem.data,
                itemId: libraryItem.id
            };
            console.log('[EntityEditor] Equipped armor:', libraryItem.name);
            this.refreshEquipmentDisplay();
        }
    }

    private refreshEquipmentDisplay(): void {
        const weaponDisplay = document.getElementById('equipped-weapon-display');
        const armorDisplay = document.getElementById('equipped-armor-display');

        if (weaponDisplay) {
            weaponDisplay.innerHTML = this.renderEquippedWeapon();
            // Re-attach unequip button listener
            weaponDisplay.querySelector('.btn-unequip-weapon')?.addEventListener('click', () => {
                (this.entity as any).equipment.slots.weapon = null;
                this.refreshEquipmentDisplay();
            });
        }

        if (armorDisplay) {
            armorDisplay.innerHTML = this.renderEquippedArmor();
            // Re-attach unequip button listener
            armorDisplay.querySelector('.btn-unequip-armor')?.addEventListener('click', () => {
                (this.entity as any).equipment.slots.armor = null;
                this.refreshEquipmentDisplay();
            });
        }
    }

    private addLootItem(itemId: string): void {
        const libraryItem = ContentLibrary.getItem(itemId) as any;
        if (libraryItem && libraryItem.data) {
            if (!(this.entity as any).inventory) {
                (this.entity as any).inventory = { slots: [] };
            }
            // Use libraryItem.data which contains actual item properties (icon, type, damage, etc.)
            const itemData = libraryItem.data;
            (this.entity as any).inventory.slots.push({
                ...itemData,
                itemId: libraryItem.id  // Use itemId format for inventory
            });
            console.log('[EntityEditor] Added loot item:', { itemId: libraryItem.id, icon: itemData.icon, name: itemData.name });
            this.refreshLootList();
        }
    }

    private removeLootItem(index: number): void {
        const inventory = (this.entity as any).inventory?.slots;
        if (inventory && index >= 0 && index < inventory.length) {
            inventory.splice(index, 1);
            this.refreshLootList();
        }
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
