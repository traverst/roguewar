/**
 * ProgressionEditor - Configure XP curves, level rewards, and skill definitions
 * 
 * Allows game designers to customize the progression system without code changes.
 * Saves to localStorage as 'roguewar_progression_config'
 */

import { ProgressionConfig, LevelDefinition, Reward, DEFAULT_PROGRESSION_CONFIG } from '@roguewar/rules';

const STORAGE_KEY = 'roguewar_progression_config';

export class ProgressionEditor {
    private config: ProgressionConfig;
    private selectedLevel: number = 1;

    constructor(private root: HTMLElement) {
        // Load existing config from localStorage or use default
        this.config = this.loadConfig();
        this.render();
    }

    private loadConfig(): ProgressionConfig {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved) as ProgressionConfig;
            }
        } catch (e) {
            console.error('[ProgressionEditor] Error loading config:', e);
        }
        return { ...DEFAULT_PROGRESSION_CONFIG };
    }

    private saveConfig(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
            console.log('[ProgressionEditor] Config saved to localStorage');
        } catch (e) {
            console.error('[ProgressionEditor] Error saving config:', e);
        }
    }

    private render(): void {
        this.root.innerHTML = `
            <style>
                .prog-editor {
                    display: grid;
                    grid-template-columns: 1fr 400px;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    height: 100%;
                    font-family: 'Inter', sans-serif;
                    color: #fff;
                    background: #1a1a2e;
                    box-sizing: border-box;
                }
                .prog-panel {
                    background: rgba(30, 30, 50, 0.9);
                    border: 1px solid #46a;
                    border-radius: 8px;
                    padding: 1rem;
                    overflow-y: auto;
                }
                .prog-title {
                    font-size: 1.1rem;
                    font-weight: bold;
                    color: #8af;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid #46a;
                }
                .level-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .level-table th, .level-table td {
                    padding: 0.5rem;
                    text-align: left;
                    border-bottom: 1px solid #333;
                }
                .level-table th {
                    color: #8af;
                    font-weight: bold;
                    font-size: 0.85rem;
                }
                .level-table tr:hover {
                    background: rgba(70, 100, 170, 0.2);
                }
                .level-table tr.selected {
                    background: rgba(70, 100, 170, 0.4);
                }
                .level-input {
                    background: #252525;
                    border: 1px solid #444;
                    color: #fff;
                    padding: 0.35rem 0.5rem;
                    border-radius: 4px;
                    width: 80px;
                    font-size: 0.85rem;
                }
                .reward-tag {
                    display: inline-block;
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    margin: 0.1rem;
                }
                .reward-attr { background: #4a4; color: #fff; }
                .reward-skill { background: #48f; color: #fff; }
                .reward-hp { background: #f44; color: #fff; }
                .reward-ability { background: #a4f; color: #fff; }
                .btn {
                    padding: 0.5rem 1rem;
                    border: 1px solid #46a;
                    border-radius: 4px;
                    background: #2a2a4a;
                    color: #fff;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                }
                .btn:hover {
                    background: #3a3a6a;
                    border-color: #68c;
                }
                .btn-primary {
                    background: #4a6;
                    border-color: #6c8;
                }
                .btn-primary:hover {
                    background: #5b7;
                }
                .btn-danger {
                    background: #a44;
                    border-color: #c66;
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                .form-label {
                    display: block;
                    margin-bottom: 0.35rem;
                    color: #aaa;
                    font-size: 0.85rem;
                }
                .form-input {
                    width: 100%;
                    padding: 0.5rem;
                    background: #252525;
                    border: 1px solid #444;
                    border-radius: 4px;
                    color: #fff;
                    font-size: 0.9rem;
                }
                .reward-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                .reward-item {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.35rem 0.5rem;
                    background: #333;
                    border-radius: 4px;
                    font-size: 0.85rem;
                }
                .reward-delete {
                    cursor: pointer;
                    color: #f66;
                    margin-left: 0.25rem;
                }
                .skill-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.5rem;
                }
                .skill-card {
                    background: #333;
                    padding: 0.75rem;
                    border-radius: 6px;
                    border: 1px solid #444;
                }
                .skill-name {
                    font-weight: bold;
                    color: #8cf;
                    font-size: 0.9rem;
                }
                .skill-desc {
                    font-size: 0.75rem;
                    color: #888;
                    margin-top: 0.25rem;
                }
            </style>
            <div class="prog-editor">
                <div class="prog-panel">
                    <div class="prog-title">📊 Level Progression (XP Thresholds)</div>
                    <table class="level-table">
                        <thead>
                            <tr>
                                <th>Level</th>
                                <th>XP Required</th>
                                <th>Rewards</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="level-rows">
                            ${this.renderLevelRows()}
                        </tbody>
                    </table>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button class="btn" id="add-level">+ Add Level</button>
                        <button class="btn btn-primary" id="save-config">💾 Save Config</button>
                        <button class="btn" id="reset-config">↺ Reset to Default</button>
                    </div>
                </div>
                
                <div class="prog-panel">
                    ${this.renderLevelEditor()}
                    
                    <div style="margin-top: 1.5rem;">
                        <div class="prog-title">⚙️ Global Settings</div>
                        <div class="form-group">
                            <label class="form-label">XP Multiplier</label>
                            <input type="number" class="form-input" id="xp-mult" 
                                   value="${this.config.xpMultiplier || 1}" 
                                   step="0.1" min="0.1" max="5">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Attribute Cap (Base)</label>
                            <input type="number" class="form-input" id="attr-cap" 
                                   value="${this.config.attributeCaps?.baseCap || 20}" 
                                   min="10" max="50">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Skill Cap (Base)</label>
                            <input type="number" class="form-input" id="skill-cap" 
                                   value="${this.config.skillCaps?.baseCap || 5}" 
                                   min="1" max="20">
                        </div>
                    </div>
                    
                    <div style="margin-top: 1.5rem;">
                        <div class="prog-title">🎯 Skills</div>
                        <div class="skill-grid">
                            ${this.renderSkillDefinitions()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private renderLevelRows(): string {
        return this.config.levels.map((level, idx) => `
            <tr class="level-row ${level.level === this.selectedLevel ? 'selected' : ''}" 
                data-level="${level.level}">
                <td><strong>Lv ${level.level}</strong></td>
                <td>
                    <input type="number" class="level-input xp-input" 
                           data-level="${level.level}" 
                           value="${level.xpRequired}" 
                           min="0" step="50">
                </td>
                <td>
                    ${this.renderRewardTags(level.rewards)}
                </td>
                <td>
                    ${level.level > 1 ? `<button class="btn btn-danger delete-level" data-level="${level.level}" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;">✕</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    private renderRewardTags(rewards: Reward[]): string {
        return rewards.map(r => {
            switch (r.type) {
                case 'AttributePoints':
                    return `<span class="reward-tag reward-attr">+${r.amount} Attr</span>`;
                case 'SkillPoints':
                    return `<span class="reward-tag reward-skill">+${r.amount} Skill</span>`;
                case 'MaxHP':
                    return `<span class="reward-tag reward-hp">+${r.amount} HP</span>`;
                case 'AbilityUnlock':
                    return `<span class="reward-tag reward-ability">🔓 ${r.abilityId}</span>`;
                default:
                    return '';
            }
        }).join('');
    }

    private renderLevelEditor(): string {
        const level = this.config.levels.find(l => l.level === this.selectedLevel);
        if (!level) return '<div>Select a level to edit</div>';

        return `
            <div class="prog-title">✏️ Edit Level ${level.level}</div>
            <div class="form-group">
                <label class="form-label">XP Required</label>
                <input type="number" class="form-input" id="edit-xp" 
                       value="${level.xpRequired}" min="0" step="50">
            </div>
            
            <label class="form-label">Rewards</label>
            <div class="reward-list">
                ${level.rewards.map((r, idx) => this.renderRewardItem(r, idx)).join('')}
            </div>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn add-reward" data-type="AttributePoints">+ Attr Points</button>
                <button class="btn add-reward" data-type="SkillPoints">+ Skill Points</button>
                <button class="btn add-reward" data-type="MaxHP">+ Max HP</button>
            </div>
        `;
    }

    private renderRewardItem(reward: Reward, index: number): string {
        let label = '';
        let value = 0;
        switch (reward.type) {
            case 'AttributePoints':
                label = '💪 Attribute Points';
                value = reward.amount;
                break;
            case 'SkillPoints':
                label = '🎯 Skill Points';
                value = reward.amount;
                break;
            case 'MaxHP':
                label = '❤️ Max HP';
                value = reward.amount;
                break;
            case 'AbilityUnlock':
                label = `🔓 Ability: ${reward.abilityId}`;
                break;
            default:
                label = reward.type;
        }

        return `
            <div class="reward-item">
                <span>${label}:</span>
                <input type="number" class="reward-amount" data-index="${index}" 
                       value="${value}" min="1" max="20" 
                       style="width: 50px; background: #444; border: none; color: #fff; padding: 0.2rem; border-radius: 3px;">
                <span class="reward-delete" data-index="${index}">✕</span>
            </div>
        `;
    }

    private renderSkillDefinitions(): string {
        const skills = this.config.skillDefinitions || [];
        return skills.map(skill => `
            <div class="skill-card">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-desc">${skill.description}</div>
            </div>
        `).join('');
    }

    private attachEventListeners(): void {
        // Select level row
        this.root.querySelectorAll('.level-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!target.classList.contains('level-input') && !target.classList.contains('delete-level')) {
                    this.selectedLevel = parseInt(row.getAttribute('data-level') || '1');
                    this.render();
                }
            });
        });

        // XP input change
        this.root.querySelectorAll('.xp-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const level = parseInt(target.dataset.level || '1');
                const levelDef = this.config.levels.find(l => l.level === level);
                if (levelDef) {
                    levelDef.xpRequired = parseInt(target.value) || 0;
                }
            });
        });

        // Edit XP for selected level
        const editXp = this.root.querySelector('#edit-xp') as HTMLInputElement;
        if (editXp) {
            editXp.addEventListener('change', () => {
                const levelDef = this.config.levels.find(l => l.level === this.selectedLevel);
                if (levelDef) {
                    levelDef.xpRequired = parseInt(editXp.value) || 0;
                    this.render();
                }
            });
        }

        // Reward amount changes
        this.root.querySelectorAll('.reward-amount').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const index = parseInt(target.dataset.index || '0');
                const levelDef = this.config.levels.find(l => l.level === this.selectedLevel);
                if (levelDef && levelDef.rewards[index]) {
                    const reward = levelDef.rewards[index];
                    if ('amount' in reward) {
                        reward.amount = parseInt(target.value) || 1;
                    }
                }
            });
        });

        // Delete reward
        this.root.querySelectorAll('.reward-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const index = parseInt(target.dataset.index || '0');
                const levelDef = this.config.levels.find(l => l.level === this.selectedLevel);
                if (levelDef) {
                    levelDef.rewards.splice(index, 1);
                    this.render();
                }
            });
        });

        // Add reward buttons
        this.root.querySelectorAll('.add-reward').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const type = target.dataset.type as 'AttributePoints' | 'SkillPoints' | 'MaxHP';
                const levelDef = this.config.levels.find(l => l.level === this.selectedLevel);
                if (levelDef) {
                    const defaultAmounts = { AttributePoints: 2, SkillPoints: 1, MaxHP: 5 };
                    levelDef.rewards.push({ type, amount: defaultAmounts[type] } as Reward);
                    this.render();
                }
            });
        });

        // Delete level
        this.root.querySelectorAll('.delete-level').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const level = parseInt(target.dataset.level || '0');
                if (level > 1) {
                    this.config.levels = this.config.levels.filter(l => l.level !== level);
                    // Renumber remaining levels
                    this.config.levels.forEach((l, idx) => {
                        l.level = idx + 1;
                    });
                    this.selectedLevel = Math.min(this.selectedLevel, this.config.levels.length);
                    this.render();
                }
            });
        });

        // Add level
        this.root.querySelector('#add-level')?.addEventListener('click', () => {
            const lastLevel = this.config.levels[this.config.levels.length - 1];
            const newLevel: LevelDefinition = {
                level: (lastLevel?.level || 0) + 1,
                xpRequired: (lastLevel?.xpRequired || 0) + 500,
                rewards: [{ type: 'AttributePoints', amount: 2 }]
            };
            this.config.levels.push(newLevel);
            this.selectedLevel = newLevel.level;
            this.render();
        });

        // Save config
        this.root.querySelector('#save-config')?.addEventListener('click', () => {
            // Also save global settings
            const xpMult = parseFloat((this.root.querySelector('#xp-mult') as HTMLInputElement)?.value || '1');
            const attrCap = parseInt((this.root.querySelector('#attr-cap') as HTMLInputElement)?.value || '20');
            const skillCap = parseInt((this.root.querySelector('#skill-cap') as HTMLInputElement)?.value || '5');

            this.config.xpMultiplier = xpMult;
            this.config.attributeCaps = { ...(this.config.attributeCaps || {}), baseCap: attrCap };
            this.config.skillCaps = { ...(this.config.skillCaps || {}), baseCap: skillCap };

            this.saveConfig();
            alert('Progression config saved!');
        });

        // Reset to default
        this.root.querySelector('#reset-config')?.addEventListener('click', () => {
            if (confirm('Reset to default progression config? This will overwrite your changes.')) {
                this.config = { ...DEFAULT_PROGRESSION_CONFIG };
                this.selectedLevel = 1;
                this.render();
            }
        });
    }
}
