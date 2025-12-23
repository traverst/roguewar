import { PlayerProfile } from '../meta/types';
import { campaignManager, unlockRegistry, achievementManager } from '../meta';

/**
 * ProfileUI - Display player profile, achievements, and unlocks
 */
export class ProfileUI {
    /**
     * Create and show profile screen
     */
    static show(profile: PlayerProfile, app: HTMLElement, onClose: () => void): void {
        const overlay = document.createElement('div');
        overlay.id = 'profile-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 5000;
            font-family: 'Inter', sans-serif;
        `;

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: #1e1e1e;
            padding: 2rem;
            border-radius: 12px;
            border: 2px solid #46a;
            max-width: 800px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
            color: #fff;
        `;

        const earnedAchievements = achievementManager.getEarnedAchievements(profile);
        const unlockedHeroes = unlockRegistry.getUnlockedHeroes(profile);

        panel.innerHTML = `
            <h2 style="margin-top: 0; color: #46a; text-align: center;">${profile.displayName}'s Profile</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <div style="text-align: center; padding: 1rem; background: #252525; border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #4f6;">${profile.completedRuns.length}</div>
                    <div style="color: #888;"> Runs Completed</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #252525; border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #8af;">${earnedAchievements.length}</div>
                    <div style="color: #888;">Achievements</div>
                </div>
            </div>

            <h3 style="color: #4f6; margin-top: 2rem;">Unlocked Heroes</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
                ${unlockedHeroes.map(hero => `
                    <div style="flex: 1; min-width: 200px; padding: 1rem; background: #252525; border: 1px solid #4a6; border-radius: 8px;">
                        <div style="font-weight: bold; color: #4f6;">${hero.name}</div>
                        <div style="font-size: 0.85rem; color: #aaa;">${hero.description}</div>
                    </div>
                `).join('')}
            </div>

            <h3 style="color: #8af; margin-top: 2rem;">Achievements</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${earnedAchievements.map(ach => `
                    <div style="padding: 1rem; background: #1a2a3a; border-left: 3px solid #8af; border-radius: 4px;">
                        <div style="font-weight: bold;">${ach.name}</div>
                        <div style="font-size: 0.85rem; color: #aaa;">${ach.description}</div>
                    </div>
                `).join('')}
                ${earnedAchievements.length === 0 ? '<div style="color: #666; padding: 1rem; text-align: center;">No achievements yet. Keep playing!</div>' : ''}
            </div>

            <div style="text-align: center; margin-top: 2rem;">
                <button id="btn-close-profile" style="padding: 0.8rem 2rem; background: #3a3a4a; color: #fff; border: 1px solid #46a; cursor: pointer; border-radius: 4px; font-size: 1rem;">Close</button>
            </div>
        `;

        overlay.appendChild(panel);
        app.appendChild(overlay);

        // Close button
        document.getElementById('btn-close-profile')!.onclick = () => {
            overlay.remove();
            onClose();
        };
    }
}
