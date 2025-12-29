/**
 * InventoryUI - Sidebar showing player stats, equipment, and inventory
 * Uses tabs: Stats (Character + Abilities + Combat) vs Gear (Equipment + Inventory)
 */
export class InventoryUI {
    private container: HTMLElement;
    private player: any = null;
    private previousInventoryJson: string = '';
    private activeTab: 'stats' | 'gear' = 'stats';
    private onEquipCallback: ((itemId: string, slot: string) => void) | null = null;
    private onUnequipCallback: ((slot: string) => void) | null = null;
    private onDropCallback: ((itemIndex: number) => void) | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    setPlayer(player: any) {
        // Re-render if inventory OR HP changed
        const currentStateJson = JSON.stringify({
            inventory: player?.inventory,
            hp: player?.hp,
            maxHp: player?.maxHp,
            equipment: player?.equipment
        });
        if (currentStateJson === this.previousInventoryJson && this.player) {
            return; // No change, skip re-render
        }

        this.previousInventoryJson = currentStateJson;
        this.player = player;
        this.render();
    }

    setCallbacks(
        onEquip: (itemId: string, slot: string) => void,
        onUnequip: (slot: string) => void,
        onDrop?: (itemIndex: number) => void
    ) {
        this.onEquipCallback = onEquip;
        this.onUnequipCallback = onUnequip;
        this.onDropCallback = onDrop || null;
    }

    private render() {
        if (!this.player) {
            this.container.innerHTML = '<div style="color: #666; padding: 1rem;">No player data</div>';
            return;
        }

        // Calculate effective stats from base + equipment
        const equipment = (this.player as any).equipment?.slots || {};
        const inventory = (this.player as any).inventory?.slots || [];

        const baseStats = {
            strength: (this.player as any).strength || 10,
            dexterity: (this.player as any).dexterity || 10,
            constitution: (this.player as any).constitution || 10,
            intelligence: (this.player as any).intelligence || 10,
            wisdom: (this.player as any).wisdom || 10,
            charisma: (this.player as any).charisma || 10,
            attack: this.player.attack || 0,
            defense: (this.player as any).defense || 10  // Base AC 10 (lower is better)
        };

        // Calculate equipment bonuses - use any to support dynamic stat properties
        const effectiveStats: any = { ...baseStats };
        let weaponDamage = '1d4'; // Default unarmed damage

        // Apply bonuses from equipped items
        Object.values(equipment).forEach((equippedItem: any) => {
            if (equippedItem && typeof equippedItem === 'object') {
                console.log('[InventoryUI] Equipped item:', equippedItem);

                // Track weapon damage separately (dice notation)
                if (equippedItem.damage && typeof equippedItem.damage === 'string') {
                    weaponDamage = equippedItem.damage;
                }

                // Armor SUBTRACTS from defense (lower AC = tougher)
                if (equippedItem.defence) {
                    console.log('[InventoryUI] Subtracting defence:', equippedItem.defence);
                    effectiveStats.defense -= equippedItem.defence;  // Subtract, not add!
                }

                // Support explicit bonus properties
                if (equippedItem.attackBonus) effectiveStats.attack += equippedItem.attackBonus;
                if (equippedItem.defenseBonus) effectiveStats.defense += equippedItem.defenseBonus;
                if (equippedItem.strengthBonus) effectiveStats.strength += equippedItem.strengthBonus;
                if (equippedItem.constitutionBonus) effectiveStats.constitution += equippedItem.constitutionBonus;

                // Apply custom properties if they exist
                if (equippedItem.customProperties) {
                    Object.keys(equippedItem.customProperties).forEach(key => {
                        const value = equippedItem.customProperties[key];
                        if (typeof value === 'number') {
                            if (!effectiveStats[key]) {
                                effectiveStats[key] = value;
                            } else {
                                effectiveStats[key] += value;
                            }
                        }
                    });
                }

                // Support any custom stat bonuses at root level (e.g., critBonus, speedBonus, etc.)
                Object.keys(equippedItem).forEach(key => {
                    if (key.endsWith('Bonus') && !['attackBonus', 'defenseBonus', 'strengthBonus', 'constitutionBonus'].includes(key)) {
                        const statName = key.replace('Bonus', '');
                        if (!effectiveStats[statName]) {
                            effectiveStats[statName] = equippedItem[key];
                        } else {
                            effectiveStats[statName] += equippedItem[key];
                        }
                    }
                });
            }
        });

        // Calculate ability modifiers
        const getModifier = (score: number) => {
            const mod = Math.floor((score - 10) / 2);
            return mod >= 0 ? `+${mod}` : `${mod}`;
        };

        this.container.innerHTML = `
            <div style="
                position: absolute;
                top: 10px;
                right: 10px;
                width: 220px;
                max-width: calc(100vw - 300px);
                background: rgba(20, 20, 30, 0.95);
                border: 1px solid #46a;
                border-radius: 8px;
                padding: 0.75rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                font-family: 'Inter', sans-serif;
                color: #fff;
                overflow-y: auto;
                max-height: calc(100vh - 20px);
                z-index: 100;
            ">
                <!-- Tab Buttons -->
                <div style="display: flex; gap: 4px; margin-bottom: 0.25rem;">
                    <button id="tab-stats" style="
                        flex: 1; padding: 6px 10px; font-size: 0.8rem; font-weight: bold;
                        background: ${this.activeTab === 'stats' ? '#46a' : '#333'};
                        color: ${this.activeTab === 'stats' ? '#fff' : '#888'};
                        border: 1px solid ${this.activeTab === 'stats' ? '#68c' : '#444'};
                        border-radius: 4px; cursor: pointer;
                    ">📊 Stats</button>
                    <button id="tab-gear" style="
                        flex: 1; padding: 6px 10px; font-size: 0.8rem; font-weight: bold;
                        background: ${this.activeTab === 'gear' ? '#46a' : '#333'};
                        color: ${this.activeTab === 'gear' ? '#fff' : '#888'};
                        border: 1px solid ${this.activeTab === 'gear' ? '#68c' : '#444'};
                        border-radius: 4px; cursor: pointer;
                    ">⚔️ Gear</button>
                </div>

                ${this.activeTab === 'stats' ? `
                    <!-- STATS TAB: Character + Abilities + Combat -->
                    <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #46a;">
                        <div style="font-weight: bold; color: #8af; margin-bottom: 0.5rem; font-size: 0.9rem;">📊 CHARACTER</div>
                        <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #f88;">❤️ HP:</span>
                                <span style="color: #fff; font-weight: bold;">${this.player.hp}/${this.player.maxHp || this.player.hp}</span>
                            </div>
                        </div>
                    </div>

                    <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #46a;">
                        <div style="font-weight: bold; color: #8af; margin-bottom: 0.5rem; font-size: 0.9rem;">🎲 ABILITIES</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #fa4;">💪 STR:</span>
                                <span>${effectiveStats.strength || 10} <span style="color: #8af;">(${getModifier(effectiveStats.strength || 10)})</span></span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #4f4;">⚡ DEX:</span>
                                <span>${effectiveStats.dexterity || 10} <span style="color: #8af;">(${getModifier(effectiveStats.dexterity || 10)})</span></span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #4af;">🛡️ CON:</span>
                                <span>${effectiveStats.constitution || 10} <span style="color: #8af;">(${getModifier(effectiveStats.constitution || 10)})</span></span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #8cf;">🧠 INT:</span>
                                <span>${effectiveStats.intelligence || 10} <span style="color: #8af;">(${getModifier(effectiveStats.intelligence || 10)})</span></span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #f8f;">🔮 WIS:</span>
                                <span>${effectiveStats.wisdom || 10} <span style="color: #8af;">(${getModifier(effectiveStats.wisdom || 10)})</span></span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #ff8;">⭐ CHA:</span>
                                <span>${effectiveStats.charisma || 10} <span style="color: #8af;">(${getModifier(effectiveStats.charisma || 10)})</span></span>
                            </div>
                        </div>
                    </div>

                    <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #46a;">
                        <div style="font-weight: bold; color: #8af; margin-bottom: 0.5rem; font-size: 0.9rem;">⚔️ COMBAT</div>
                        <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #f88;">🎲 Weapon:</span>
                                <span>${weaponDamage}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #fa4;">⚔️ Attack Bonus:</span>
                                <span>+${effectiveStats.attack}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #8af;">🛡️ Defense (AC):</span>
                                <span>${effectiveStats.defense}</span>
                            </div>
                        </div>
                    </div>
                ` : `
                    <!-- GEAR TAB: Equipment + Inventory -->
                    <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #9a4;">
                        <div style="font-weight: bold; color: #da6; margin-bottom: 0.5rem; font-size: 0.9rem;">⚔️ EQUIPMENT</div>
                        ${this.renderEquipmentSlot('weapon', '🗡️', equipment.weapon)}
                        ${this.renderEquipmentSlot('armor', '🛡️', equipment.armor)}
                        ${this.renderEquipmentSlot('accessory', '💍', equipment.accessory)}
                    </div>

                    <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #a4f; flex: 1; min-height: 150px;">
                        <div style="font-weight: bold; color: #c8f; margin-bottom: 0.5rem; font-size: 0.9rem;">🎒 INVENTORY (${inventory.length})</div>
                        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                            ${inventory.length === 0
                ? '<div style="color: #666; font-size: 0.8rem; text-align: center; padding: 1rem;">Empty</div>'
                : inventory.map((item: any, index: number) => this.renderInventoryItem(item, index)).join('')
            }
                        </div>
                    </div>
                `}
            </div>
        `;

        // Attach event listeners
        this.attachEventListeners();
    }

    private renderEquipmentSlot(slot: string, icon: string, equippedItem?: any): string {
        const isEmpty = !equippedItem;

        // Handle both formats: object {itemId, name, icon} or string (legacy)
        const displayName = isEmpty ? 'Empty' :
            (typeof equippedItem === 'string' ? equippedItem : (equippedItem.name || equippedItem.itemId));
        const displayIcon = (typeof equippedItem === 'object' && equippedItem.icon) ? equippedItem.icon : '';

        return `
            <div style="
                background: ${isEmpty ? 'rgba(0, 0, 0, 0.3)' : 'rgba(80, 60, 40, 0.6)'};
                padding: 0.5rem;
                border-radius: 4px;
                border: 1px solid ${isEmpty ? '#444' : '#a84'};
                margin-bottom: 0.4rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: ${isEmpty ? 'default' : 'pointer'};
            " data-equipment-slot="${slot}" class="${isEmpty ? '' : 'equipment-item'}">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">${icon}</span>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.75rem; color: #888; text-transform: uppercase;">${slot}</span>
                        <div style="display: flex; align-items: center; gap: 0.3rem;">
                            ${displayIcon ? `<span style="font-size: 1rem;">${displayIcon}</span>` : ''}
                            <span style="font-size: 0.85rem; color: ${isEmpty ? '#666' : '#fff'};">
                                ${displayName}
                            </span>
                        </div>
                    </div>
                </div>
                ${!isEmpty ? '<button class="unequip-btn" data-slot="' + slot + '" style="background: #a44; border: none; color: #fff; padding: 0.3rem 0.6rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Remove</button>' : ''}
            </div>
        `;
    }

    private renderInventoryItem(item: any, index: number): string {
        console.log('[InventoryUI] Rendering item:', item);
        // Handle both wrapped (data) and unwrapped item formats
        const itemData = item.data || item;
        const icon = itemData.icon || '🎁';
        const name = itemData.name || item.name || item.itemId || 'Unknown Item';

        return `
            <div class="inventory-item" data-index="${index}" style="
                background: rgba(80, 40, 80, 0.4);
                padding: 0.5rem;
                border-radius: 4px;
                border: 1px solid #a4f;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: space-between;
            " onmouseenter="this.style.background='rgba(100, 60, 100, 0.6)'; this.style.borderColor='#c8f';" 
               onmouseleave="this.style.background='rgba(80, 40, 80, 0.4)'; this.style.borderColor='#a4f';">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.3rem;">${icon}</span>
                    <div>
                        <div style="font-size: 0.85rem; font-weight: bold;">${name}</div>
                        ${item.quantity > 1 ? `<div style="font-size: 0.7rem; color: #888;">x${item.quantity}</div>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 0.3rem;">
                    <button class="equip-btn" data-index="${index}" style="
                        background: #46a;
                        border: none;
                        color: #fff;
                        padding: 0.3rem 0.6rem;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.75rem;
                    ">Equip</button>
                    <button class="drop-btn" data-index="${index}" style="
                        background: #a44;
                        border: none;
                        color: #fff;
                        padding: 0.3rem 0.6rem;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.75rem;
                    ">Drop</button>
                </div>
            </div>
        `;
    }

    private attachEventListeners() {
        // Tab button handlers
        const tabStats = this.container.querySelector('#tab-stats');
        const tabGear = this.container.querySelector('#tab-gear');

        if (tabStats) {
            tabStats.addEventListener('click', () => {
                if (this.activeTab !== 'stats') {
                    this.activeTab = 'stats';
                    this.render();
                }
            });
        }

        if (tabGear) {
            tabGear.addEventListener('click', () => {
                if (this.activeTab !== 'gear') {
                    this.activeTab = 'gear';
                    this.render();
                }
            });
        }

        // Equip buttons
        const equipButtons = this.container.querySelectorAll('.equip-btn');
        console.log('[InventoryUI] Attaching listeners to', equipButtons.length, 'equip buttons');

        equipButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('[InventoryUI] Equip button clicked');
                const index = parseInt((btn as HTMLElement).dataset.index || '0');
                const inventory = (this.player as any).inventory?.slots || [];
                const item = inventory[index];

                console.log('[InventoryUI] Item:', item, 'Callback:', this.onEquipCallback);

                if (item && this.onEquipCallback) {
                    // Determine slot based on item type
                    const slot = this.guessSlotForItem(item);
                    console.log('[InventoryUI] Calling onEquipCallback with:', item.itemId, slot);
                    this.onEquipCallback(item.itemId, slot);
                }
            });
        });

        // Unequip buttons
        this.container.querySelectorAll('.unequip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slot = (btn as HTMLElement).dataset.slot;
                if (slot && this.onUnequipCallback) {
                    this.onUnequipCallback(slot);
                }
            });
        });

        // Drop buttons
        this.container.querySelectorAll('.drop-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt((btn as HTMLElement).dataset.index || '0');
                console.log('[InventoryUI] Drop button clicked, index:', index);
                if (this.onDropCallback) {
                    this.onDropCallback(index);
                }
            });
        });
    }

    private guessSlotForItem(item: any): string {
        const id = item.itemId?.toLowerCase() || '';
        const name = item.name?.toLowerCase() || '';

        if (id.includes('sword') || id.includes('axe') || id.includes('weapon') || name.includes('sword') || name.includes('axe')) {
            return 'weapon';
        }
        if (id.includes('armor') || id.includes('shield') || id.includes('helm') || name.includes('armor') || name.includes('shield')) {
            return 'armor';
        }
        return 'accessory';
    }

    private getItemDataFromLibrary(itemId: string): any {
        // Access ContentLibrary to get item stats
        try {
            const ContentLibrary = (window as any).ContentLibrary;
            if (ContentLibrary) {
                const items = ContentLibrary.getAllItems();
                const item = items.find((i: any) => i.id === itemId);
                return item?.data || null;
            }
        } catch (e) {
            console.warn('[InventoryUI] Could not access ContentLibrary:', e);
        }
        return null;
    }
}
