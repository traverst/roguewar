import { createContentAsset } from '@roguewar/rules';
import { ContentLibrary } from '../utils/ContentLibrary';

interface ItemTemplate {
    id: string;
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'consumable' | 'quest';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon?: string;

    // Weapon-specific
    damage?: number | string;
    damageType?: 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'ice' | 'lightning';
    attackSpeed?: 'slow' | 'normal' | 'fast';
    attackBonus?: number;  // Bonus to attack roll (+1, +2, etc.)

    // Armor effectiveness bonuses (e.g., piercing +3 vs light, +1 vs medium, +0 vs heavy)
    lightArmorBonus?: number;
    mediumArmorBonus?: number;
    heavyArmorBonus?: number;

    // Armor-specific (D&D 5e style: AC = 10 + armorBonus + magicBonus + dexMod)
    armorBonus?: number;   // Base AC bonus from armor type (Light +2, Medium +4, Heavy +6)
    magicBonus?: number;   // Magic enhancement bonus (+1, +2, +3, etc.)
    armorType?: 'light' | 'medium' | 'heavy';

    // Consumable-specific
    healAmount?: number;
    manaAmount?: number;
    durationTurns?: number;

    // Quest-specific
    questItem?: boolean;
    questFlags?: string[];

    // Custom properties for flexible bonuses/effects
    // Can include: critBonus, speedBonus, lifestealBonus, poisonDamage, etc.
    customProperties?: Record<string, any>;
}

export class ItemEditor {
    private item: ItemTemplate = {
        id: `item:${Date.now()}`,
        name: 'New Item',
        description: 'A custom item',
        type: 'weapon',
        rarity: 'common',
        icon: '⚔️',
        damage: 10,
        damageType: 'slashing',
        attackSpeed: 'normal'
    };

    constructor(private root: HTMLElement) {
        this.render();
    }

    private render(): void {
        this.root.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 300px 400px; gap: var(--spacing-lg); height: 100%;">
                <div style="display: flex; flex-direction: column; gap: var(--spacing-lg); overflow-y: auto;">
                    <div class="panel">
                        <div class="panel-title">📋 Basic Properties</div>
                        <div class="form-group">
                            <label class="form-label">Item ID</label>
                            <input type="text" class="form-input" id="item-id" value="${this.item.id}" placeholder="item:iron_sword" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-input" id="item-name" value="${this.item.name}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" id="item-desc">${this.item.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Type</label>
                            <select class="form-select" id="item-type">
                                <option value="weapon" ${this.item.type === 'weapon' ? 'selected' : ''}>⚔️ Weapon</option>
                                <option value="armor" ${this.item.type === 'armor' ? 'selected' : ''}>🛡️ Armor</option>
                                <option value="consumable" ${this.item.type === 'consumable' ? 'selected' : ''}>🧪 Consumable</option>
                                <option value="quest" ${this.item.type === 'quest' ? 'selected' : ''}>📜 Quest Item</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Icon Emoji</label>
                            <input type="text" class="form-input" id="item-icon" value="${this.item.icon || ''}" placeholder="⚔️" maxlength="2" />
                        </div>
                    </div>
                    
                    <div class="panel" id="type-specific-panel">
                        ${this.renderTypeSpecificPanel()}
                    </div>
                    
                    <div class="panel">
                        <div class="form-group">
                            <label class="form-label">Rarity</label>
                            <select class="form-select" id="item-rarity">
                                <option value="common" ${this.item.rarity === 'common' ? 'selected' : ''}>⭐ Common</option>
                                <option value="uncommon" ${this.item.rarity === 'uncommon' ? 'selected' : ''}>⭐⭐ Uncommon</option>
                                <option value="rare" ${this.item.rarity === 'rare' ? 'selected' : ''}>⭐⭐⭐ Rare</option>
                                <option value="epic" ${this.item.rarity === 'epic' ? 'selected' : ''}>⭐⭐⭐⭐ Epic</option>
                                <option value="legendary" ${this.item.rarity === 'legendary' ? 'selected' : ''}>⭐⭐⭐⭐⭐ Legendary</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-title">⚡ Custom Bonuses</div>
                        <div style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.5rem;">
                            Select bonus effects for this item
                        </div>
                        ${this.renderCustomBonusList()}
                    </div>
                </div>
                
                <div class="editor-sidebar">
                    <div class="panel">
                        <div class="panel-title">👁️ Preview</div>
                        <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--spacing-lg); text-align: center;">
                            <div id="item-preview-icon" style="font-size: 80px; line-height: 1; margin-bottom: var(--spacing-sm);">${this.item.icon || '⚔️'}</div>
                            <div id="item-preview-rarity" style="font-size: 20px; margin-bottom: var(--spacing-xs);">${this.getRarityStars()}</div>
                            <div style="font-weight: 600; font-size: 1.2rem; margin-bottom: var(--spacing-xs);" id="preview-name">${this.item.name}</div>
                            <div style="color: var(--text-secondary); font-size: 0.875rem; font-style: italic; margin-bottom: var(--spacing-md);" id="preview-desc">${this.item.description}</div>
                            <div id="preview-stats" style="color: var(--text-secondary); font-size: 0.875rem;">
                                ${this.renderPreviewStats()}
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
        console.log('[ItemEditor] renderLibrary called');
        const panel = document.getElementById('library-panel');
        if (!panel) {
            console.error('[ItemEditor] library-panel element not found!');
            return;
        }

        console.log('[ItemEditor] Rendering library panel for item type');
        panel.innerHTML = ContentLibrary.renderLibraryPanel('item', () => { }, () => { });

        console.log('[ItemEditor] Attaching library listeners');
        ContentLibrary.attachLibraryListeners('item', (item) => {
            console.log('[ItemEditor] Item loaded from library:', item);
            this.item = item.data;

            // Migration: ensure armor items have armorBonus set based on armorType
            if (this.item.type === 'armor' && (this.item.armorBonus === undefined || this.item.armorBonus === 0)) {
                const armorBonusMap: Record<string, number> = {
                    'light': 2,
                    'medium': 4,
                    'heavy': 6
                };
                this.item.armorBonus = armorBonusMap[this.item.armorType || 'light'];
                console.log(`[ItemEditor] Migrated armorBonus to ${this.item.armorBonus} for ${this.item.armorType} armor`);
            }

            this.render();
            const messagesDiv = document.getElementById('validation-messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = `<div class="validation-warning">✅ Loaded "${item.name}" from library</div>`;
            }
        }, () => {
            console.log('[ItemEditor] Library refresh requested');
            this.renderLibrary();
        }, panel);
        console.log('[ItemEditor] renderLibrary complete');
    }

    private renderCustomBonusList(): string {
        // Predefined bonus types with their default values
        const bonusTypes = [
            { key: 'critBonus', label: '💥 Critical Hit', min: 0, max: 50, default: 0 },
            { key: 'speedBonus', label: '⚡ Speed', min: -5, max: 10, default: 0 },
            { key: 'lifestealBonus', label: '🩸 Lifesteal', min: 0, max: 30, default: 0 },
            { key: 'dodgeBonus', label: '🌊 Dodge', min: 0, max: 40, default: 0 },
            { key: 'regenerationBonus', label: '💚 Regeneration', min: 0, max: 10, default: 0 },
        ];

        const customProps = this.item.customProperties || {};

        return bonusTypes.map(bonus => {
            const value = customProps[bonus.key] || bonus.default;
            return `
                <div class="form-group" style="margin-bottom: 0.75rem;">
                    <label class="form-label">
                        ${bonus.label}
                        <span class="slider-value" id="${bonus.key}-value">${value}</span>
                    </label>
                    <input 
                        type="range" 
                        class="form-slider custom-bonus-slider" 
                        data-bonus-key="${bonus.key}"
                        min="${bonus.min}" 
                        max="${bonus.max}" 
                        value="${value}" 
                    />
                </div>
            `;
        }).join('');
    }

    private renderTypeSpecificPanel(): string {
        switch (this.item.type) {
            case 'weapon':
                return `
                    <div class="panel-title">⚔️ D20 Combat Properties</div>
                    <div class="form-group">
                        <label class="form-label">Damage Dice (e.g. 1d8, 2d6+2)</label>
                        <input type="text" class="form-input" id="weapon-damage-dice" placeholder="1d8" value="${this.item.damage || '1d6'}" />
                        <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="preset-btn" data-dice="1d4" style="padding: 0.4rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">1d4</button>
                            <button class="preset-btn" data-dice="1d6" style="padding: 0.4rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">1d6</button>
                            <button class="preset-btn" data-dice="1d8" style="padding: 0.4rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">1d8</button>
                            <button class="preset-btn" data-dice="1d10" style="padding: 0.4rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">1d10</button>
                            <button class="preset-btn" data-dice="1d12" style="padding: 0.4rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">1d12</button>
                            <button class="preset-btn" data-dice="2d6" style="padding: 0.4rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">2d6</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            Attack Bonus (to-hit)
                            <span class="slider-value" id="attack-bonus-value">${this.item.attackBonus || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="weapon-attack-bonus" min="0" max="5" value="${this.item.attackBonus || 0}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Damage Type</label>
                        <select class="form-select" id="weapon-damage-type">
                            <option value="slashing" ${this.item.damageType === 'slashing' ? 'selected' : ''}>🗡️ Slashing</option>
                            <option value="piercing" ${this.item.damageType === 'piercing' ? 'selected' : ''}>🏹 Piercing</option>
                            <option value="bludgeoning" ${this.item.damageType === 'bludgeoning' ? 'selected' : ''}>🔨 Bludgeoning</option>
                            <option value="fire" ${this.item.damageType === 'fire' ? 'selected' : ''}>🔥 Fire</option>
                            <option value="ice" ${this.item.damageType === 'ice' ? 'selected' : ''}>❄️ Ice</option>
                            <option value="lightning" ${this.item.damageType === 'lightning' ? 'selected' : ''}>⚡ Lightning</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Attack Speed</label>
                        <select class="form-select" id="weapon-speed">
                            <option value="slow" ${this.item.attackSpeed === 'slow' ? 'selected' : ''}>🐢 Slow</option>
                            <option value="normal" ${this.item.attackSpeed === 'normal' ? 'selected' : ''}>🚶 Normal</option>
                            <option value="fast" ${this.item.attackSpeed === 'fast' ? 'selected' : ''}>⚡ Fast</option>
                        </select>
                    </div>
                    
                    <div class="panel-title" style="margin-top: 1rem;">🎯 Armor Effectiveness</div>
                    <div class="form-group">
                        <label class="form-label">
                            vs Light Armor Bonus
                            <span class="slider-value" id="light-bonus-value">${this.item.lightArmorBonus || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="light-armor-bonus" min="-5" max="10" value="${this.item.lightArmorBonus || 0}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            vs Medium Armor Bonus
                            <span class="slider-value" id="medium-bonus-value">${this.item.mediumArmorBonus || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="medium-armor-bonus" min="-5" max="10" value="${this.item.mediumArmorBonus || 0}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            vs Heavy Armor Bonus
                            <span class="slider-value" id="heavy-bonus-value">${this.item.heavyArmorBonus || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="heavy-armor-bonus" min="-5" max="10" value="${this.item.heavyArmorBonus || 0}" />
                    </div>
                `;
            case 'armor':
                return `
                    <div class="panel-title">🛡️ Armor Properties (AC = 10 + Armor + Magic + Dex)</div>
                    <div class="form-group">
                        <label class="form-label">
                            Armor Bonus (Light +2, Medium +4, Heavy +6)
                            <span class="slider-value" id="armor-bonus-value">${this.item.armorBonus || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="armor-bonus" min="0" max="8" value="${this.item.armorBonus || 0}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            Magic Bonus (+1, +2, +3, etc.)
                            <span class="slider-value" id="magic-bonus-value">${this.item.magicBonus || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="magic-bonus" min="0" max="5" value="${this.item.magicBonus || 0}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Armor Type</label>
                        <select class="form-select" id="armor-type">
                            <option value="light" ${this.item.armorType === 'light' ? 'selected' : ''}>🪶 Light</option>
                            <option value="medium" ${this.item.armorType === 'medium' ? 'selected' : ''}>⚙️ Medium</option>
                            <option value="heavy" ${this.item.armorType === 'heavy' ? 'selected' : ''}>🛡️ Heavy</option>
                        </select>
                    </div>
                    <div style="padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 0.875rem; color: var(--text-secondary);">
                        💡 Final AC = 10 + ${this.item.armorBonus || 0} + ${this.item.magicBonus || 0} + Dex = <strong>${10 + (this.item.armorBonus || 0) + (this.item.magicBonus || 0)}</strong> (+ Dex modifier)
                    </div>
                `;
            case 'consumable':
                return `
                    <div class="panel-title">🧪 Consumable Properties</div>
                    <div class="form-group">
                        <label class="form-label">
                            Heal Amount
                            <span class="slider-value" id="heal-value">${this.item.healAmount || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="consumable-heal" min="0" max="200" value="${this.item.healAmount || 0}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            Mana Amount
                            <span class="slider-value" id="mana-value">${this.item.manaAmount || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="consumable-mana" min="0" max="100" value="${this.item.manaAmount || 0}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            Duration (turns)
                            <span class="slider-value" id="duration-value">${this.item.durationTurns || 0}</span>
                        </label>
                        <input type="range" class="form-slider" id="consumable-duration" min="0" max="10" value="${this.item.durationTurns || 0}" />
                    </div>
                `;
            case 'quest':
                return `
                    <div class="panel-title">📜 Quest Item Properties</div>
                    <div class="form-group">
                        <label class="form-label">Quest Flags (comma-separated)</label>
                        <input type="text" class="form-input" id="quest-flags" value="${this.item.questFlags?.join(', ') || ''}" placeholder="quest_complete, unlock_door" />
                    </div>
                    <div style="padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 0.875rem; color: var(--text-secondary);">
                        💡 Quest items cannot be dropped or sold. They trigger specific game events or unlock areas.
                    </div>
                `;
            default:
                return '';
        }
    }

    private getRarityStars(): string {
        const rarityMap = {
            'common': '<span style="color: #aaa;">⭐</span>',
            'uncommon': '<span style="color: #1eff00;">⭐⭐</span>',
            'rare': '<span style="color: #0070dd;">⭐⭐⭐</span>',
            'epic': '<span style="color: #a335ee;">⭐⭐⭐⭐</span>',
            'legendary': '<span style="color: #ff8000;">⭐⭐⭐⭐⭐</span>'
        };
        return rarityMap[this.item.rarity] || rarityMap.common;
    }

    private renderPreviewStats(): string {
        switch (this.item.type) {
            case 'weapon':
                return `
                    <strong>Damage:</strong> ${this.item.damage} (${this.item.damageType})<br/>
                    <strong>Speed:</strong> ${this.item.attackSpeed}
                `;
            case 'armor':
                return `
                    <strong>AC Bonus:</strong> +${(this.item.armorBonus || 0) + (this.item.magicBonus || 0)} (Armor: +${this.item.armorBonus || 0}, Magic: +${this.item.magicBonus || 0})<br/>
                    <strong>Type:</strong> ${this.item.armorType}
                `;
            case 'consumable':
                const effects = [];
                if (this.item.healAmount) effects.push(`Heal: +${this.item.healAmount} HP`);
                if (this.item.manaAmount) effects.push(`Mana: +${this.item.manaAmount}`);
                if (this.item.durationTurns) effects.push(`Duration: ${this.item.durationTurns} turns`);
                return effects.join('<br/>') || 'No effects';
            case 'quest':
                return `<strong>Quest Item</strong><br/>Cannot be dropped`;
            default:
                return '';
        }
    }

    private attachEventListeners(): void {
        // Type change triggers re-render
        document.getElementById('item-type')?.addEventListener('change', () => {
            const type = (document.getElementById('item-type') as HTMLSelectElement).value as ItemTemplate['type'];
            this.item.type = type;

            // Reset type-specific properties
            delete this.item.damage;
            delete this.item.damageType;
            delete this.item.attackSpeed;
            delete this.item.armorBonus;
            delete this.item.magicBonus;
            delete this.item.armorType;
            delete this.item.healAmount;
            delete this.item.manaAmount;
            delete this.item.durationTurns;
            delete this.item.questFlags;

            // Set defaults for new type
            switch (type) {
                case 'weapon':
                    this.item.damage = 10;
                    this.item.damageType = 'slashing';
                    this.item.attackSpeed = 'normal';
                    this.item.icon = '⚔️';
                    break;
                case 'armor':
                    this.item.armorType = 'light';
                    this.item.armorBonus = 2; // Light armor default
                    this.item.magicBonus = 0;
                    this.item.icon = '🛡️';
                    break;
                case 'consumable':
                    this.item.healAmount = 50;
                    this.item.manaAmount = 0;
                    this.item.durationTurns = 0;
                    this.item.icon = '🧪';
                    break;
                case 'quest':
                    this.item.questItem = true;
                    this.item.questFlags = [];
                    this.item.icon = '📜';
                    break;
            }

            this.render();
        });

        // Basic inputs
        const updateBasic = () => {
            this.item.id = (document.getElementById('item-id') as HTMLInputElement).value;
            this.item.name = (document.getElementById('item-name') as HTMLInputElement).value;
            this.item.description = (document.getElementById('item-desc') as HTMLTextAreaElement).value;
            this.item.icon = (document.getElementById('item-icon') as HTMLInputElement).value;
            this.updatePreview();
        };

        ['item-id', 'item-name', 'item-desc', 'item-icon'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateBasic);
        });

        // Type-specific sliders and selects
        this.attachTypeSpecificListeners();

        // Rarity dropdown
        document.getElementById('item-rarity')?.addEventListener('change', (e) => {
            this.item.rarity = (e.target as HTMLSelectElement).value as ItemTemplate['rarity'];
            this.updatePreview();
        });

        // Custom bonus sliders
        document.querySelectorAll('.custom-bonus-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const key = (slider as HTMLElement).dataset.bonusKey || '';
                const value = parseInt((slider as HTMLInputElement).value);

                if (!this.item.customProperties) {
                    this.item.customProperties = {};
                }
                this.item.customProperties[key] = value;

                // Update value display
                const valueSpan = document.getElementById(`${key}-value`);
                if (valueSpan) valueSpan.textContent = value.toString();

                this.updatePreview();
            });
        });

        // Buttons
        document.getElementById('btn-save-library')?.addEventListener('click', () => this.saveToLibrary());
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportItem());
        document.getElementById('btn-import')?.addEventListener('click', () => this.importItem());
        document.getElementById('btn-reset')?.addEventListener('click', () => this.resetItem());
    }

    private attachTypeSpecificListeners(): void {
        // Weapon - Damage Dice (text input)
        const weaponDamageDice = document.getElementById('weapon-damage-dice') as HTMLInputElement;
        weaponDamageDice?.addEventListener('input', () => {
            this.item.damage = weaponDamageDice.value;
            this.updatePreview();
        });

        // Preset buttons for common dice
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const dice = (e.target as HTMLElement).getAttribute('data-dice');
                if (dice && weaponDamageDice) {
                    weaponDamageDice.value = dice;
                    this.item.damage = dice;
                    this.updatePreview();
                }
            });
        });

        // Weapon - Attack Bonus (slider)
        const weaponAttackBonus = document.getElementById('weapon-attack-bonus') as HTMLInputElement;
        weaponAttackBonus?.addEventListener('input', () => {
            this.item.attackBonus = parseInt(weaponAttackBonus.value);
            const valueSpan = document.getElementById('attack-bonus-value');
            if (valueSpan) valueSpan.textContent = weaponAttackBonus.value;
            this.updatePreview();
        });

        document.getElementById('weapon-damage-type')?.addEventListener('change', (e) => {
            this.item.damageType = (e.target as HTMLSelectElement).value as ItemTemplate['damageType'];
            this.updatePreview();
        });

        document.getElementById('weapon-speed')?.addEventListener('change', (e) => {
            this.item.attackSpeed = (e.target as HTMLSelectElement).value as ItemTemplate['attackSpeed'];
            this.updatePreview();
        });

        // Armor effectiveness bonuses
        const lightArmorBonus = document.getElementById('light-armor-bonus') as HTMLInputElement;
        lightArmorBonus?.addEventListener('input', () => {
            this.item.lightArmorBonus = parseInt(lightArmorBonus.value);
            const valueSpan = document.getElementById('light-bonus-value');
            if (valueSpan) valueSpan.textContent = lightArmorBonus.value;
            this.updatePreview();
        });

        const mediumArmorBonus = document.getElementById('medium-armor-bonus') as HTMLInputElement;
        mediumArmorBonus?.addEventListener('input', () => {
            this.item.mediumArmorBonus = parseInt(mediumArmorBonus.value);
            const valueSpan = document.getElementById('medium-bonus-value');
            if (valueSpan) valueSpan.textContent = mediumArmorBonus.value;
            this.updatePreview();
        });

        const heavyArmorBonus = document.getElementById('heavy-armor-bonus') as HTMLInputElement;
        heavyArmorBonus?.addEventListener('input', () => {
            this.item.heavyArmorBonus = parseInt(heavyArmorBonus.value);
            const valueSpan = document.getElementById('heavy-bonus-value');
            if (valueSpan) valueSpan.textContent = heavyArmorBonus.value;
            this.updatePreview();
        });

        // Armor bonuses
        const armorBonusSlider = document.getElementById('armor-bonus') as HTMLInputElement;
        armorBonusSlider?.addEventListener('input', () => {
            this.item.armorBonus = parseInt(armorBonusSlider.value);
            const valueSpan = document.getElementById('armor-bonus-value');
            if (valueSpan) valueSpan.textContent = armorBonusSlider.value;
            this.updatePreview();
        });

        const magicBonusSlider = document.getElementById('magic-bonus') as HTMLInputElement;
        magicBonusSlider?.addEventListener('input', () => {
            this.item.magicBonus = parseInt(magicBonusSlider.value);
            const valueSpan = document.getElementById('magic-bonus-value');
            if (valueSpan) valueSpan.textContent = magicBonusSlider.value;
            this.updatePreview();
        });

        document.getElementById('armor-type')?.addEventListener('change', (e) => {
            const armorType = (e.target as HTMLSelectElement).value as ItemTemplate['armorType'];
            this.item.armorType = armorType;

            // Auto-set armor bonus based on type (D&D style)
            const armorBonusMap: Record<string, number> = {
                'light': 2,
                'medium': 4,
                'heavy': 6
            };
            this.item.armorBonus = armorBonusMap[armorType || 'light'];

            // Update the slider and display
            const armorBonusSlider = document.getElementById('armor-bonus') as HTMLInputElement;
            const armorBonusValue = document.getElementById('armor-bonus-value');
            if (armorBonusSlider) armorBonusSlider.value = this.item.armorBonus.toString();
            if (armorBonusValue) armorBonusValue.textContent = this.item.armorBonus.toString();

            this.updatePreview();
        });

        // Consumable
        const consumableHeal = document.getElementById('consumable-heal') as HTMLInputElement;
        consumableHeal?.addEventListener('input', () => {
            this.item.healAmount = parseInt(consumableHeal.value);
            const valueSpan = document.getElementById('heal-value');
            if (valueSpan) valueSpan.textContent = consumableHeal.value;
            this.updatePreview();
        });

        const consumableMana = document.getElementById('consumable-mana') as HTMLInputElement;
        consumableMana?.addEventListener('input', () => {
            this.item.manaAmount = parseInt(consumableMana.value);
            const valueSpan = document.getElementById('mana-value');
            if (valueSpan) valueSpan.textContent = consumableMana.value;
            this.updatePreview();
        });

        const consumableDuration = document.getElementById('consumable-duration') as HTMLInputElement;
        consumableDuration?.addEventListener('input', () => {
            this.item.durationTurns = parseInt(consumableDuration.value);
            const valueSpan = document.getElementById('duration-value');
            if (valueSpan) valueSpan.textContent = consumableDuration.value;
            this.updatePreview();
        });

        // Quest
        document.getElementById('quest-flags')?.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            this.item.questFlags = value ? value.split(',').map(f => f.trim()) : [];
            this.updatePreview();
        });
    }

    private updatePreview(): void {
        const iconDiv = document.getElementById('item-preview-icon');
        if (iconDiv) iconDiv.textContent = this.item.icon || '⚔️';

        const rarityDiv = document.getElementById('item-preview-rarity');
        if (rarityDiv) rarityDiv.innerHTML = this.getRarityStars();

        const nameDiv = document.getElementById('preview-name');
        if (nameDiv) nameDiv.textContent = this.item.name;

        const descDiv = document.getElementById('preview-desc');
        if (descDiv) descDiv.textContent = this.item.description;

        const statsDiv = document.getElementById('preview-stats');
        if (statsDiv) statsDiv.innerHTML = this.renderPreviewStats();
    }

    private saveToLibrary(): void {
        const messagesDiv = document.getElementById('validation-messages')!;

        // Basic validation
        if (!this.item.id || !this.item.name) {
            messagesDiv.innerHTML = '<div class="validation-error">ID and Name are required</div>';
            return;
        }

        messagesDiv.innerHTML = '';

        // Check for ID conflicts
        const existing = ContentLibrary.getItem(this.item.id);
        if (existing) {
            const shouldOverwrite = confirm(
                `An item with ID "${this.item.id}" already exists in the library.\n\n` +
                `Click OK to overwrite it, or Cancel to generate a new unique ID.`
            );

            if (!shouldOverwrite) {
                // Generate new unique ID
                const timestamp = Date.now();
                const newId = `item:${this.item.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;
                this.item.id = newId;
                (document.getElementById('item-id') as HTMLInputElement).value = newId;
                messagesDiv.innerHTML = `<div class="validation-warning">⚠️ Generated new ID: ${newId}</div>`;
            }
        }

        // Save to library
        ContentLibrary.saveItem({
            id: this.item.id,
            name: this.item.name,
            type: 'item',
            data: this.item
        });
        this.renderLibrary();

        messagesDiv.innerHTML += '<div class="validation-warning">✅ Item added to library!</div>';
    }

    private exportItem(): void {
        const messagesDiv = document.getElementById('validation-messages')!;

        // Basic validation
        if (!this.item.id || !this.item.name) {
            messagesDiv.innerHTML = '<div class="validation-error">ID and Name are required</div>';
            return;
        }

        const asset = createContentAsset(this.item.id, '1.0.0', this.item);

        const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.item.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        messagesDiv.innerHTML = '<div class="validation-warning">✅ Item exported to JSON file!</div>';
    }

    private importItem(): void {
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
                    this.item = content.data || content;
                    this.render();

                    const messagesDiv = document.getElementById('validation-messages')!;
                    messagesDiv.innerHTML = '<div class="validation-warning">✅ Item imported successfully!</div>';
                } catch (err) {
                    alert('Invalid item file: ' + err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    private resetItem(): void {
        this.item = {
            id: `item:${Date.now()}`,
            name: 'New Item',
            description: 'A custom item',
            type: 'weapon',
            rarity: 'common',
            icon: '⚔️',
            damage: 10,
            damageType: 'slashing',
            attackSpeed: 'normal'
        };
        this.render();
    }
}
