/**
 * InventoryUI - Sidebar showing player stats, equipment, and inventory
 */
export class InventoryUI {
    private container: HTMLElement;
    private player: any = null;
    private previousInventoryJson: string = '';
    private onEquipCallback: ((itemId: string, slot: string) => void) | null = null;
    private onUnequipCallback: ((slot: string) => void) | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    setPlayer(player: any) {
        // Only re-render if inventory actually changed
        const currentInventoryJson = JSON.stringify(player?.inventory);
        if (currentInventoryJson === this.previousInventoryJson && this.player) {
            return; // No change, skip re-render
        }

        this.previousInventoryJson = currentInventoryJson;
        this.player = player;
        this.render();
    }

    setCallbacks(onEquip: (itemId: string, slot: string) => void, onUnequip: (slot: string) => void) {
        this.onEquipCallback = onEquip;
        this.onUnequipCallback = onUnequip;
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
            constitution: (this.player as any).constitution || 10,
            attack: this.player.attack || 5,
            defense: (this.player as any).defense || 2
        };

        // Calculate equipment bonuses - use any to support dynamic stat properties
        const effectiveStats: any = { ...baseStats };

        // Apply bonuses from equipped items
        Object.values(equipment).forEach((equippedItem: any) => {
            if (equippedItem && typeof equippedItem === 'object') {
                // Item data is already stored in the equipment slot!
                // No need to look it up in ContentLibrary
                console.log('[InventoryUI] Equipped item:', equippedItem);

                // Flexible stat mapping - supports any custom bonuses
                // Map item properties to stats:
                // - damage -> attack
                // - defence -> defense
                // - any *Bonus properties apply directly

                if (equippedItem.damage) {
                    console.log('[InventoryUI] Adding damage:', equippedItem.damage);
                    effectiveStats.attack += equippedItem.damage;
                }
                if (equippedItem.defence) {
                    console.log('[InventoryUI] Adding defence:', equippedItem.defence);
                    effectiveStats.defense += equippedItem.defence;
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

        this.container.innerHTML = `
            <div style="
                width: 250px;
                background: rgba(20, 20, 30, 0.95);
                border-left: 2px solid #46a;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                font-family: 'Inter', sans-serif;
                color: #fff;
                overflow-y: auto;
                max-height: 100vh;
            ">
                <!-- Player Stats -->
                <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #46a;">
                    <div style="font-weight: bold; color: #8af; margin-bottom: 0.5rem; font-size: 0.9rem;">📊 STATS</div>
                    <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #f88;">❤️ HP:</span>
                            <span style="color: #fff; font-weight: bold;">${this.player.hp}/${this.player.maxHp || this.player.hp}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #fa4;">💪 Strength:</span>
                            <span>${effectiveStats.strength}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #4af;">🛡️ Constitution:</span>
                            <span>${effectiveStats.constitution}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px solid #444; padding-top: 0.35rem; margin-top: 0.35rem;">
                            <span style="color: #f88;">⚔️ Attack:</span>
                            <span>${effectiveStats.attack}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #8af;">🛡️ Defense:</span>
                            <span>${effectiveStats.defense}</span>
                        </div>
                    </div>
                </div>

                <!-- Equipment Slots -->
                <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #9a4;">
                    <div style="font-weight: bold; color: #da6; margin-bottom: 0.5rem; font-size: 0.9rem;">⚔️ EQUIPMENT</div>
                    ${this.renderEquipmentSlot('weapon', '🗡️', equipment.weapon)}
                    ${this.renderEquipmentSlot('armor', '🛡️', equipment.armor)}
                    ${this.renderEquipmentSlot('accessory', '💍', equipment.accessory)}
                </div>

                <!-- Inventory -->
                <div style="background: rgba(40, 40, 60, 0.8); padding: 0.75rem; border-radius: 6px; border: 1px solid #a4f; flex: 1; min-height: 150px;">
                    <div style="font-weight: bold; color: #c8f; margin-bottom: 0.5rem; font-size: 0.9rem;">🎒 INVENTORY (${inventory.length})</div>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                        ${inventory.length === 0
                ? '<div style="color: #666; font-size: 0.8rem; text-align: center; padding: 1rem;">Empty</div>'
                : inventory.map((item: any, index: number) => this.renderInventoryItem(item, index)).join('')
            }
                    </div>
                </div>
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
        const icon = item.icon || '🎁';
        const name = item.name || item.itemId || 'Unknown Item';

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
                <button class="equip-btn" data-index="${index}" style="
                    background: #46a;
                    border: none;
                    color: #fff;
                    padding: 0.3rem 0.6rem;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 0.75rem;
                ">Equip</button>
            </div>
        `;
    }

    private attachEventListeners() {
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
