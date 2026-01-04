/**
 * LevelUpUI - Modal for allocating attribute and skill points
 * 
 * Displays when player has unspent points from leveling up.
 * Follows deterministic pattern - all allocations submitted as game action.
 */

export interface LevelUpAllocation {
    attributes: Record<string, number>;  // e.g., { strength: 2, dexterity: 1 }
    skills: Record<string, number>;       // e.g., { melee: 1 }
}

export type OnAllocateCallback = (allocation: LevelUpAllocation) => void;

export class LevelUpUI {
    private container: HTMLElement;
    private overlay: HTMLElement | null = null;
    private player: any = null;
    private pendingAttributes: Record<string, number> = {};
    private pendingSkills: Record<string, number> = {};
    private onAllocate: OnAllocateCallback | null = null;

    // Attribute definitions
    private readonly attributes = [
        { id: 'strength', name: 'STR', icon: '💪', description: '+1 melee damage per 2 points above 10' },
        { id: 'dexterity', name: 'DEX', icon: '⚡', description: '+1 AC and ranged attack per 2 points above 10' },
        { id: 'constitution', name: 'CON', icon: '🛡️', description: '+1 HP per point above 10' },
        { id: 'intelligence', name: 'INT', icon: '🧠', description: '+1 spell damage per 2 points above 10' },
        { id: 'wisdom', name: 'WIS', icon: '👁️', description: '+1 perception and magic resist' },
        { id: 'charisma', name: 'CHA', icon: '✨', description: 'Better prices and NPC interactions' }
    ];

    // Skill definitions
    private readonly skills = [
        { id: 'melee', name: 'Melee Combat', icon: '⚔️', description: '+1 to melee attack rolls per level' },
        { id: 'ranged', name: 'Ranged Combat', icon: '🏹', description: '+1 to ranged attack rolls per level' },
        { id: 'defense', name: 'Defense', icon: '🛡️', description: '+1 AC per 2 levels' },
        { id: 'stealth', name: 'Stealth', icon: '🥷', description: 'Avoid enemy detection' },
        { id: 'perception', name: 'Perception', icon: '👁️', description: 'Detect traps and hidden things' }
    ];

    constructor(container: HTMLElement) {
        this.container = container;
    }

    setCallback(onAllocate: OnAllocateCallback) {
        this.onAllocate = onAllocate;
    }

    /**
     * Show the level-up modal if player has unspent points
     */
    show(player: any) {
        this.player = player;
        this.pendingAttributes = {};
        this.pendingSkills = {};

        const unspentAttr = player?.unspentAttributePoints || 0;
        const unspentSkill = player?.unspentSkillPoints || 0;

        if (unspentAttr === 0 && unspentSkill === 0) {
            return; // Nothing to allocate
        }

        this.render();
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    /**
     * Check if modal is currently visible
     */
    isVisible(): boolean {
        return this.overlay !== null;
    }

    private render() {
        // Remove existing overlay if any
        this.hide();

        const unspentAttr = (this.player?.unspentAttributePoints || 0) - this.getTotalPendingAttr();
        const unspentSkill = (this.player?.unspentSkillPoints || 0) - this.getTotalPendingSkills();

        this.overlay = document.createElement('div');
        this.overlay.id = 'level-up-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Inter', sans-serif;
        `;

        this.overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #fc6;
                border-radius: 12px;
                padding: 1.5rem;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 0 40px rgba(255, 200, 0, 0.3);
            ">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⬆️ LEVEL UP!</div>
                    <div style="color: #fc6; font-size: 1.2rem; font-weight: bold;">
                        Level ${this.player?.level || 1}
                    </div>
                    <div style="color: #aaa; font-size: 0.9rem; margin-top: 0.5rem;">
                        Allocate your points to grow stronger
                    </div>
                </div>

                ${unspentAttr > 0 ? `
                    <div style="margin-bottom: 1.5rem;">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 1rem;
                            padding-bottom: 0.5rem;
                            border-bottom: 1px solid #333;
                        ">
                            <span style="font-weight: bold; color: #8af;">💪 Attribute Points</span>
                            <span id="attr-remaining" style="
                                background: #fc6;
                                color: #000;
                                padding: 0.25rem 0.75rem;
                                border-radius: 20px;
                                font-weight: bold;
                            ">${unspentAttr} remaining</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                            ${this.attributes.map(attr => this.renderAttributeRow(attr)).join('')}
                        </div>
                    </div>
                ` : ''}

                ${unspentSkill > 0 ? `
                    <div style="margin-bottom: 1.5rem;">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 1rem;
                            padding-bottom: 0.5rem;
                            border-bottom: 1px solid #333;
                        ">
                            <span style="font-weight: bold; color: #8cf;">🎯 Skill Points</span>
                            <span id="skill-remaining" style="
                                background: #4af;
                                color: #000;
                                padding: 0.25rem 0.75rem;
                                border-radius: 20px;
                                font-weight: bold;
                            ">${unspentSkill} remaining</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${this.skills.map(skill => this.renderSkillRow(skill)).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                    <button id="level-up-confirm" style="
                        padding: 0.75rem 2rem;
                        background: linear-gradient(135deg, #4a4 0%, #2a2 100%);
                        border: 1px solid #6c6;
                        border-radius: 8px;
                        color: #fff;
                        font-weight: bold;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">✓ Confirm Allocation</button>
                    <button id="level-up-later" style="
                        padding: 0.75rem 2rem;
                        background: #333;
                        border: 1px solid #555;
                        border-radius: 8px;
                        color: #aaa;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Later</button>
                </div>
            </div>
        `;

        this.container.appendChild(this.overlay);
        this.attachEventListeners();
    }

    private renderAttributeRow(attr: { id: string; name: string; icon: string; description: string }): string {
        const currentValue = (this.player as any)?.[attr.id] || 10;
        const pending = this.pendingAttributes[attr.id] || 0;
        const newValue = currentValue + pending;

        return `
            <div class="attr-row" data-attr="${attr.id}" style="
                background: rgba(40, 40, 60, 0.8);
                padding: 0.75rem;
                border-radius: 6px;
                border: 1px solid #46a;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <div>
                    <div style="font-weight: bold;">${attr.icon} ${attr.name}</div>
                    <div style="font-size: 0.7rem; color: #888;">${attr.description}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="attr-minus" data-attr="${attr.id}" style="
                        width: 28px;
                        height: 28px;
                        border-radius: 4px;
                        background: ${pending > 0 ? '#a44' : '#333'};
                        border: 1px solid ${pending > 0 ? '#c66' : '#555'};
                        color: #fff;
                        cursor: ${pending > 0 ? 'pointer' : 'not-allowed'};
                        font-weight: bold;
                    ">-</button>
                    <span class="attr-value" style="
                        min-width: 40px;
                        text-align: center;
                        font-weight: bold;
                        color: ${pending > 0 ? '#4f4' : '#fff'};
                    ">${newValue}${pending > 0 ? ` (+${pending})` : ''}</span>
                    <button class="attr-plus" data-attr="${attr.id}" style="
                        width: 28px;
                        height: 28px;
                        border-radius: 4px;
                        background: #4a4;
                        border: 1px solid #6c6;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                    ">+</button>
                </div>
            </div>
        `;
    }

    private renderSkillRow(skill: { id: string; name: string; icon: string; description: string }): string {
        const currentValue = (this.player as any)?.skills?.[skill.id] || 0;
        const pending = this.pendingSkills[skill.id] || 0;
        const newValue = currentValue + pending;

        return `
            <div class="skill-row" data-skill="${skill.id}" style="
                background: rgba(40, 60, 60, 0.8);
                padding: 0.75rem;
                border-radius: 6px;
                border: 1px solid #4a6;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <div>
                    <div style="font-weight: bold;">${skill.icon} ${skill.name}</div>
                    <div style="font-size: 0.7rem; color: #888;">${skill.description}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="skill-minus" data-skill="${skill.id}" style="
                        width: 28px;
                        height: 28px;
                        border-radius: 4px;
                        background: ${pending > 0 ? '#a44' : '#333'};
                        border: 1px solid ${pending > 0 ? '#c66' : '#555'};
                        color: #fff;
                        cursor: ${pending > 0 ? 'pointer' : 'not-allowed'};
                        font-weight: bold;
                    ">-</button>
                    <span class="skill-value" style="
                        min-width: 40px;
                        text-align: center;
                        font-weight: bold;
                        color: ${pending > 0 ? '#4cf' : '#fff'};
                    ">${newValue}${pending > 0 ? ` (+${pending})` : ''}</span>
                    <button class="skill-plus" data-skill="${skill.id}" style="
                        width: 28px;
                        height: 28px;
                        border-radius: 4px;
                        background: #4a6;
                        border: 1px solid #6c8;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                    ">+</button>
                </div>
            </div>
        `;
    }

    private getTotalPendingAttr(): number {
        return Object.values(this.pendingAttributes).reduce((sum, v) => sum + v, 0);
    }

    private getTotalPendingSkills(): number {
        return Object.values(this.pendingSkills).reduce((sum, v) => sum + v, 0);
    }

    private attachEventListeners() {
        if (!this.overlay) return;

        // Attribute plus buttons
        this.overlay.querySelectorAll('.attr-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attr = (e.target as HTMLElement).dataset.attr!;
                const remaining = (this.player?.unspentAttributePoints || 0) - this.getTotalPendingAttr();
                if (remaining > 0) {
                    this.pendingAttributes[attr] = (this.pendingAttributes[attr] || 0) + 1;
                    this.render();
                }
            });
        });

        // Attribute minus buttons
        this.overlay.querySelectorAll('.attr-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attr = (e.target as HTMLElement).dataset.attr!;
                if ((this.pendingAttributes[attr] || 0) > 0) {
                    this.pendingAttributes[attr]--;
                    if (this.pendingAttributes[attr] === 0) {
                        delete this.pendingAttributes[attr];
                    }
                    this.render();
                }
            });
        });

        // Skill plus buttons
        this.overlay.querySelectorAll('.skill-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skill = (e.target as HTMLElement).dataset.skill!;
                const remaining = (this.player?.unspentSkillPoints || 0) - this.getTotalPendingSkills();
                if (remaining > 0) {
                    this.pendingSkills[skill] = (this.pendingSkills[skill] || 0) + 1;
                    this.render();
                }
            });
        });

        // Skill minus buttons
        this.overlay.querySelectorAll('.skill-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skill = (e.target as HTMLElement).dataset.skill!;
                if ((this.pendingSkills[skill] || 0) > 0) {
                    this.pendingSkills[skill]--;
                    if (this.pendingSkills[skill] === 0) {
                        delete this.pendingSkills[skill];
                    }
                    this.render();
                }
            });
        });

        // Confirm button
        this.overlay.querySelector('#level-up-confirm')?.addEventListener('click', () => {
            if (this.onAllocate) {
                this.onAllocate({
                    attributes: { ...this.pendingAttributes },
                    skills: { ...this.pendingSkills }
                });
            }
            this.hide();
        });

        // Later button
        this.overlay.querySelector('#level-up-later')?.addEventListener('click', () => {
            this.hide();
        });
    }
}
