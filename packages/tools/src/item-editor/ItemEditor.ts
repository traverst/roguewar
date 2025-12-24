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
    damage?: number;
    damageType?: 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'ice' | 'lightning';
    attackSpeed?: 'slow' | 'normal' | 'fast';

    // Armor-specific
    defense?: number;
    armorType?: 'light' | 'medium' | 'heavy';

    // Consumable-specific
    healAmount?: number;
    manaAmount?: number;
    durationTurns?: number;

    // Quest-specific
    questItem?: boolean;
    questFlags?: string[];
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
            <div style="display: grid; grid-template-columns: 1fr 350px 560px; gap: var(--spacing-lg); height: 100%;">
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
                        <div class="panel-title">✨ Rarity</div>
                        <div class="palette" style="grid-template-columns: repeat(2, 1fr);">
                            <div class="palette-item ${this.item.rarity === 'common' ? 'active' : ''}" data-rarity="common">
                                <div class="palette-icon" style="color: #aaa;">⭐</div>
                                <div style="font-size: 0.7rem;">Common</div>
                            </div>
                            <div class="palette-item ${this.item.rarity === 'uncommon' ? 'active' : ''}" data-rarity="uncommon">
                                <div class="palette-icon" style="color: #1eff00;">⭐⭐</div>
                                <div style="font-size: 0.7rem;">Uncommon</div>
                            </div>
                            <div class="palette-item ${this.item.rarity === 'rare' ? 'active' : ''}" data-rarity="rare">
                                <div class="palette-icon" style="color: #0070dd;">⭐⭐⭐</div>
                                <div style="font-size: 0.7rem;">Rare</div>
                            </div>
                            <div class="palette-item ${this.item.rarity === 'epic' ? 'active' : ''}" data-rarity="epic">
                                <div class="palette-icon" style="color: #a335ee;">⭐⭐⭐⭐</div>
                                <div style="font-size: 0.7rem;">Epic</div>
                            </div>
                            <div class="palette-item ${this.item.rarity === 'legendary' ? 'active' : ''}" data-rarity="legendary">
                                <div class="palette-icon" style="color: #ff8000;">⭐⭐⭐⭐⭐</div>
                                <div style="font-size: 0.7rem;">Legendary</div>
                            </div>
                        </div>
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
                            <button class="btn btn-success" id="btn-export">Export Item</button>
                            <button class="btn btn-secondary" id="btn-import">Import Item</button>
                            <button class="btn btn-secondary" id="btn-reset">Reset to Defaults</button>
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
        const panel = document.getElementById('library-panel');
        if (!panel) return;

        panel.innerHTML = ContentLibrary.renderLibraryPanel('item', () => { }, () => { });

        ContentLibrary.attachLibraryListeners('item', (item) => {
            this.item = item.data;
            this.render();
            const messagesDiv = document.getElementById('validation-messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = `<div class="validation-warning">✅ Loaded "${item.name}" from library</div>`;
            }
        }, () => {
            this.renderLibrary();
        });
    }

    private renderTypeSpecificPanel(): string {
        switch (this.item.type) {
            case 'weapon':
                return `
                    <div class="panel-title">⚔️ Weapon Properties</div>
                    <div class="form-group">
                        <label class="form-label">
                            Damage
                            <span class="slider-value" id="damage-value">${this.item.damage || 10}</span>
                        </label>
                        <input type="range" class="form-slider" id="weapon-damage" min="1" max="100" value="${this.item.damage || 10}" />
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
                `;
            case 'armor':
                return `
                    <div class="panel-title">🛡️ Armor Properties</div>
                    <div class="form-group">
                        <label class="form-label">
                            Defense
                            <span class="slider-value" id="defense-value">${this.item.defense || 5}</span>
                        </label>
                        <input type="range" class="form-slider" id="armor-defense" min="1" max="50" value="${this.item.defense || 5}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Armor Type</label>
                        <select class="form-select" id="armor-type">
                            <option value="light" ${this.item.armorType === 'light' ? 'selected' : ''}>🪶 Light</option>
                            <option value="medium" ${this.item.armorType === 'medium' ? 'selected' : ''}>⚙️ Medium</option>
                            <option value="heavy" ${this.item.armorType === 'heavy' ? 'selected' : ''}>🛡️ Heavy</option>
                        </select>
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
                    <strong>Defense:</strong> ${this.item.defense}<br/>
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
            delete this.item.defense;
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
                    this.item.defense = 5;
                    this.item.armorType = 'medium';
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

        // Rarity selector
        const rarityItems = document.querySelectorAll('[data-rarity]');
        rarityItems.forEach(item => {
            item.addEventListener('click', () => {
                rarityItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.item.rarity = item.getAttribute('data-rarity') as ItemTemplate['rarity'];
                this.updatePreview();
            });
        });

        // Buttons
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportItem());
        document.getElementById('btn-import')?.addEventListener('click', () => this.importItem());
        document.getElementById('btn-reset')?.addEventListener('click', () => this.resetItem());
    }

    private attachTypeSpecificListeners(): void {
        // Weapon
        const weaponDamage = document.getElementById('weapon-damage') as HTMLInputElement;
        weaponDamage?.addEventListener('input', () => {
            this.item.damage = parseInt(weaponDamage.value);
            const valueSpan = document.getElementById('damage-value');
            if (valueSpan) valueSpan.textContent = weaponDamage.value;
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

        // Armor
        const armorDefense = document.getElementById('armor-defense') as HTMLInputElement;
        armorDefense?.addEventListener('input', () => {
            this.item.defense = parseInt(armorDefense.value);
            const valueSpan = document.getElementById('defense-value');
            if (valueSpan) valueSpan.textContent = armorDefense.value;
            this.updatePreview();
        });

        document.getElementById('armor-type')?.addEventListener('change', (e) => {
            this.item.armorType = (e.target as HTMLSelectElement).value as ItemTemplate['armorType'];
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

    private exportItem(): void {
        const messagesDiv = document.getElementById('validation-messages')!;

        // Basic validation
        if (!this.item.id || !this.item.name) {
            messagesDiv.innerHTML = '<div class="validation-error">ID and Name are required</div>';
            return;
        }

        messagesDiv.innerHTML = '';
        const asset = createContentAsset(this.item.id, '1.0.0', this.item);

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

        const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.item.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        messagesDiv.innerHTML = '<div class="validation-warning">✅ Item exported successfully!</div>';
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
