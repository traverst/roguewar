import { Campaign, CampaignNode, PlayerProfile } from '../meta/types';
import { campaignManager } from '../meta';

/**
 * CampaignMapUI - Visual campaign map showing nodes and progress
 */
export class CampaignMapUI {
    /**
     * Show campaign map
     */
    static show(
        campaign: Campaign,
        profile: PlayerProfile,
        app: HTMLElement,
        onNodeSelect: (nodeId: string) => void,
        onClose: () => void
    ): void {
        const overlay = document.createElement('div');
        overlay.id = 'campaign-map-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
            z-index: 5000;
            font-family: 'Inter', sans-serif;
            overflow-y: auto;
        `;

        const progress = profile.campaignProgress[campaign.id];

        // Calculate available nodes directly from campaign data (not campaignManager which only has hardcoded campaigns)
        const availableNodes: CampaignNode[] = [];
        if (progress && campaign.nodes) {
            campaign.nodes.forEach(node => {
                // A node is available if it's unlocked and not completed
                const isUnlocked = progress.unlockedNodes?.includes(node.id) || node.id === campaign.startNodeId;
                const isCompleted = progress.completedNodes?.includes(node.id);
                if (isUnlocked && !isCompleted) {
                    availableNodes.push(node);
                }
            });
        } else if (campaign.nodes) {
            // No progress yet - first node is available
            const startNode = campaign.nodes.find(n => n.id === campaign.startNodeId) || campaign.nodes[0];
            if (startNode) availableNodes.push(startNode);
        }

        // Calculate completion percentage directly
        const totalNodes = campaign.nodes?.length || 1;
        const completedCount = progress?.completedNodes?.length || 0;
        const completionPercentage = Math.round((completedCount / totalNodes) * 100);

        const header = document.createElement('div');
        header.style.cssText = `
            width: 100%;
            max-width: 900px;
            margin-bottom: 2rem;
            text-align: center;
        `;
        header.innerHTML = `
            <h2 style="color: #46a; margin: 0;">${campaign.name}</h2>
            <p style="color: #aaa; margin: 0.5rem 0;">${campaign.description}</p>
            <div style="background: #252525; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                <div style="color: #4f6; font-size: 2rem; font-weight: bold;">${completionPercentage}%</div>
                <div style="color: #888;">Campaign Progress</div>
            </div>
        `;

        const nodesContainer = document.createElement('div');
        nodesContainer.style.cssText = `
            width: 100%;
            max-width: 900px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2rem;
        `;

        // Render nodes
        campaign.nodes.forEach((node, index) => {
            const isCompleted = progress?.completedNodes.includes(node.id) || false;
            const isAvailable = availableNodes.some(n => n.id === node.id);
            const isLocked = !isCompleted && !isAvailable;

            const nodeElement = document.createElement('div');
            nodeElement.style.cssText = `
                padding: 1.5rem;
                background: ${isCompleted ? '#1a3a1a' : isAvailable ? '#2a2a3a' : '#1a1a1a'};
                border: 2px solid ${isCompleted ? '#4f6' : isAvailable ? '#46a' : '#333'};
                border-radius: 8px;
                cursor: ${isAvailable ? 'pointer' : 'default'};
                opacity: ${isLocked ? '0.5' : '1'};
                transition: all 0.2s;
            `;

            const status = isCompleted ? '✓ COMPLETED' : isAvailable ? '▶ AVAILABLE' : '🔒 LOCKED';
            const statusColor = isCompleted ? '#4f6' : isAvailable ? '#8af' : '#666';

            // Look up the dungeon name from library
            const dungeonId = (node as any).dungeonId;
            const libraryJson = localStorage.getItem('roguewar_content_library');
            const library = libraryJson ? JSON.parse(libraryJson) : [];
            const dungeonItem = library.find((item: any) => item.id === dungeonId);
            const dungeonName = dungeonItem?.name || dungeonId || 'Unknown Dungeon';

            // Use displayName from Campaign Editor, OR the dungeon's actual name
            const nodeName = (node as any).displayName !== 'Tutorial'
                ? (node as any).displayName
                : dungeonName;
            const nodeDesc = dungeonItem ? `🏰 ${dungeonItem.data?.levels?.length || 1} level(s)` : '';

            nodeElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.85rem; color: ${statusColor}; margin-bottom: 5px;">${status}</div>
                        <div style="font-weight: bold; font-size: 1.2rem; color: #fff;">${nodeName}</div>
                        <div style="color: #aaa; font-size: 0.9rem; margin-top: 5px;">${nodeDesc}</div>
                    </div>
                    ${isAvailable ? `<button class="start-node-btn" data-node-id="${node.id}" style="padding: 0.8rem 1.5rem; background: #2a3a4a; color: #fff; border: 1px solid #46a; cursor: pointer; border-radius: 4px; font-weight: bold;">START</button>` : ''}
                </div>
            `;

            if (isAvailable) {
                nodeElement.onmouseenter = () => {
                    nodeElement.style.background = '#3a3a4a';
                    nodeElement.style.borderColor = '#8af';
                };
                nodeElement.onmouseleave = () => {
                    nodeElement.style.background = '#2a2a3a';
                    nodeElement.style.borderColor = '#46a';
                };

                const startBtn = nodeElement.querySelector('.start-node-btn') as HTMLElement;
                if (startBtn) {
                    startBtn.onclick = (e) => {
                        e.stopPropagation();
                        overlay.remove();
                        onNodeSelect(node.id);
                    };
                }
            }

            nodesContainer.appendChild(nodeElement);
        });

        const footer = document.createElement('div');
        footer.style.cssText = `
            width: 100%;
            max-width: 900px;
            text-align: center;
        `;
        footer.innerHTML = `
            <button id="btn-close-campaign" style="padding: 0.8rem 2rem; background: #3a2a2a; color: #f88; border: 1px solid #a44; cursor: pointer; border-radius: 4px; font-size: 1rem;">Back to Lobby</button>
        `;

        overlay.appendChild(header);
        overlay.appendChild(nodesContainer);
        overlay.appendChild(footer);
        app.appendChild(overlay);

        document.getElementById('btn-close-campaign')!.onclick = () => {
            overlay.remove();
            onClose();
        };
    }
}
