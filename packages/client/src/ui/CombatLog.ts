/**
 * Combat Log UI
 * Displays combat messages at bottom of game screen
 */

export class CombatLog {
    private container: HTMLElement;
    private messages: Array<{ text: string; type: string }> = [];
    private maxMessages = 10;

    constructor() {
        this.container = document.createElement('div');
        this.render();
    }

    private render() {
        this.container.style.cssText = `
      position: relative;
      width: 100%;
      max-height: 300px;
      background: rgba(40, 40, 60, 0.8);
      border: 1px solid #46a;
      border-radius: 6px;
      overflow-y: auto;
      padding: 0.75rem;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      margin-top: 10px;
    `;

        this.updateDisplay();
    }

    private updateDisplay() {
        this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1px solid #46a; padding-bottom: 5px;">
        <div style="color: #8af; font-weight: bold;">⚔️ COMBAT LOG</div>
        <button id="clear-combat-log" style="
          background: #345;
          border: 1px solid #46a;
          color: #8af;
          padding: 2px 8px;
          cursor: pointer;
          border-radius: 3px;
        ">Clear</button>
      </div>
      <div id="combat-messages" style="display: flex; flex-direction: column;">
        ${this.getGroupedMessages()}
      </div>
    `;

        // Add clear button listener
        const clearBtn = this.container.querySelector('#clear-combat-log');
        clearBtn?.addEventListener('click', () => this.clear());
    }

    /**
     * Group messages into attack events and reverse order so newest attacks appear first
     * Each attack/critical/fumble/miss starts a new group
     */
    private getGroupedMessages(): string {
        const groups: Array<Array<{ text: string; type: string }>> = [];
        let currentGroup: Array<{ text: string; type: string }> = [];

        for (const msg of this.messages) {
            // Attack types start new groups
            if (['hit', 'miss', 'critical', 'fumble'].includes(msg.type)) {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = [msg];
            } else {
                // damage, death, heal go into current group
                currentGroup.push(msg);
            }
        }
        // Don't forget last group
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        // Reverse groups (newest first) but keep items within each group in order
        // Add separator between groups
        return groups.reverse().map(group =>
            group.map(msg => this.formatMessage(msg)).join('') +
            '<hr style="border: none; border-top: 1px solid #46a; margin: 8px 0; opacity: 0.5;">'
        ).join('');
    }

    private formatMessage(msg: { text: string; type: string }): string {
        let color = '#ddd';
        let icon = '';

        switch (msg.type) {
            case 'hit':
                color = '#4f4';
                icon = '⚔️';
                break;
            case 'miss':
                color = '#aaa';
                icon = '○';
                break;
            case 'critical':
                color = '#fa0';
                icon = '💥';
                break;
            case 'fumble':
                color = '#f44';
                icon = '💢';
                break;
            case 'damage':
                color = '#f88';
                icon = '🩸';
                break;
            case 'heal':
                color = '#8f8';
                icon = '💚';
                break;
            case 'death':
                color = '#f44';
                icon = '💀';
                break;
        }

        return `
      <div style="color: ${color}; margin: 2px 0; padding: 3px 5px; background: rgba(255,255,255,0.05); border-radius: 3px;">
        ${icon} ${msg.text}
      </div>
    `;
    }

    addMessage(text: string, type: string = 'info') {
        // Push to end so related messages (attack, damage, death) stay in order
        this.messages.push({ text, type });

        // Keep only recent messages (remove oldest from front)
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(-this.maxMessages);
        }

        this.updateDisplay();
    }

    logAttack(attacker: string, target: string, attackRoll: number, targetAC: number, hit: boolean, critical: boolean = false, fumble: boolean = false) {
        if (fumble) {
            this.addMessage(`${attacker} attacks ${target} - FUMBLE! (rolled 1)`, 'fumble');
        } else if (critical) {
            this.addMessage(`${attacker} attacks ${target} - CRITICAL HIT! (rolled 20)`, 'critical');
        } else if (hit) {
            this.addMessage(`${attacker} attacks ${target}: ${attackRoll} vs AC ${targetAC} → HIT!`, 'hit');
        } else {
            this.addMessage(`${attacker} attacks ${target}: ${attackRoll} vs AC ${targetAC} → miss`, 'miss');
        }
    }

    logDamage(target: string, damage: number, diceNotation?: string, rolls?: number[], isCritical: boolean = false) {
        let diceText = '';

        if (rolls && diceNotation) {
            if (isCritical && rolls.length >= 2) {
                // For crits, show both dice rolls highlighted
                const half = Math.floor(rolls.length / 2);
                const firstRolls = rolls.slice(0, half);
                const critRolls = rolls.slice(half);
                diceText = ` (${diceNotation}: [${firstRolls.join('+')}] + CRIT:[${critRolls.join('+')}])`;
            } else {
                diceText = ` (${diceNotation}: [${rolls.join('+')}])`;
            }
        }

        this.addMessage(`${target} takes ${damage} damage${diceText}`, 'damage');
    }

    logHeal(entity: string, amount: number, type: string = 'heal') {
        const label = type === 'lifesteal' ? 'lifesteal' : 'healing';
        this.addMessage(`${entity} gains ${amount} HP from ${label}`, 'heal');
    }

    clear() {
        this.messages = [];
        this.updateDisplay();
    }

    getElement(): HTMLElement {
        return this.container;
    }
}
