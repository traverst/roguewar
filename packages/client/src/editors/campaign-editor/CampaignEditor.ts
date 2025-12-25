import { createContentAsset } from '@roguewar/rules';
import { TabbedLibrary } from '../utils/TabbedLibrary';
import { ContentLibrary } from '../utils/ContentLibrary';

interface CampaignNode {
    id: string;
    displayName: string;
    dungeonId: string;
    unlockConditions?: {
        requiredNodes?: string[];
        requiredLevel?: number;
        requiredItems?: string[];
    };
    rewards?: {
        gold?: number;
        items?: string[];
        experience?: number;
    };
    nextNodes: string[];
}

interface Campaign {
    id: string;
    name: string;
    description: string;
    startNodeId: string;
    nodes: CampaignNode[];
}

export class CampaignEditor {
    private campaign: Campaign = {
        id: `campaign:${Date.now()}`,
        name: 'New Campaign',
        description: 'A custom campaign',
        startNodeId: 'node_1',
        nodes: [
            {
                id: 'node_1',
                displayName: 'Tutorial',
                dungeonId: 'dungeon:tutorial',
                nextNodes: [],
                rewards: { gold: 100, experience: 50 }
            }
        ]
    };

    private selectedNodeIndex: number = 0;
    private activeLibraryTab: 'campaigns' | 'dungeons' | 'items' = 'campaigns';
    private selectedDungeon: { id: string; name: string } | null = null;
    private activeSidebarTab: 'flow' | 'actions' | 'tips' = 'flow';

    constructor(private root: HTMLElement) {
        this.render();
    }

    private render(): void {
        this.root.innerHTML = `
            <div style="display: flex; gap: var(--spacing-lg); height: 100%;">
                <div style="flex: 1; display: flex; flex-direction: column; gap: var(--spacing-lg); overflow-y: auto;">
                    <div class="panel">
                        <div class="panel-title">📋 Campaign Properties</div>
                        <div class="form-group">
                            <label class="form-label">Campaign ID</label>
                            <input type="text" class="form-input" id="campaign-id" value="${this.campaign.id}" placeholder="campaign:my_campaign" />
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input type="text" class="form-input" id="campaign-name" value="${this.campaign.name}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Start Node</label>
                                <input type="text" class="form-input" id="campaign-start" value="${this.campaign.startNodeId}" placeholder="node_1" />
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" id="campaign-desc" style="min-height: 60px;">${this.campaign.description || ''}</textarea>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 300px 1fr; gap: var(--spacing-lg);">
                        <div class="panel">
                            <div class="panel-title">
                                🗺️ Nodes
                                <button class="btn btn-success" id="btn-add-node" style="margin-left: auto; padding: 4px 8px; font-size: 0.75rem;">+</button>
                            </div>
                            <div id="nodes-list" style="display: flex; flex-direction: column; gap: 2px;">
                                ${this.renderNodesList()}
                            </div>
                        </div>
                        
                        ${this.renderNodeEditor()}
                    </div>
                </div>
                
                <div class="editor-sidebar">
                    ${TabbedLibrary.renderTabbedLibrary([
            { id: 'campaigns', label: '📋 Campaigns', type: 'campaign' },
            { id: 'dungeons', label: '🏰 Dungeons', type: 'dungeon' },
            { id: 'items', label: '⚔️ Items', type: 'item' }
        ], this.activeLibraryTab, () => { })}
                    
                    ${this.renderSidebarTabs()}
            </div>
        `;

        this.attachEventListeners();
    }

    private renderNodesList(): string {
        return this.campaign.nodes.map((node, index) => {
            const isActive = index === this.selectedNodeIndex;
            const bgColor = isActive ? 'var(--primary-color-light, rgba(59, 130, 246, 0.2))' : 'transparent';
            return `
                <div data-node-index="${index}"
                     style="cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 3px 6px; font-size: 0.7rem; border-radius: 4px; background: ${bgColor}; transition: background 0.15s;">
                    <div style="background: var(--primary-color); color: white; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 0.65rem; line-height: 1.2;">
                        ${index + 1}
                    </div>
                    <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.7rem;">${node.displayName}</div>
                    <button class="btn btn-secondary" data-delete-node="${index}" style="padding: 1px 4px; font-size: 0.6rem; line-height: 1.1; opacity: 0.6;">×</button>
                </div>
            `;
        }).join('');
    }

    private renderNodeEditor(): string {
        const node = this.campaign.nodes[this.selectedNodeIndex];
        if (!node) return '';

        return `
            <div class="panel">
                <div class="panel-title">✏️ Edit Node: ${node.displayName}</div>
                
                <div class="form-group">
                    <label class="form-label">Node ID</label>
                    <input type="text" class="form-input" id="node-id" value="${node.id}" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Display Name</label>
                    <input type="text" class="form-input" id="node-name" value="${node.displayName}" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Dungeon (from Dungeon Editor)</label>
                    <select class="form-select" id="node-dungeon-select" style="width: 100%;">
                        <option value="">-- Select a Dungeon --</option>
                        ${ContentLibrary.getItems('dungeon').map(dungeon => `
                            <option value="${dungeon.id}" ${node.dungeonId === dungeon.id ? 'selected' : ''}>
                                ${dungeon.name} (${dungeon.data.levels?.length || 0} levels)
                            </option>
                        `).join('')}
                    </select>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                        💡 Create dungeons in the Dungeon Editor first
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Required Level</label>
                    <input type="number" class="form-input" id="node-req-level" value="${node.unlockConditions?.requiredLevel || ''}" min="0" placeholder="0 (none)" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Required Previous Nodes (comma-separated)</label>
                    <input type="text" class="form-input" id="node-req-nodes" value="${node.unlockConditions?.requiredNodes?.join(', ') || ''}" placeholder="node_1, node_2" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Required Items (comma-separated)</label>
                    <input type="text" class="form-input" id="node-req-items" value="${node.unlockConditions?.requiredItems?.join(', ') || ''}" placeholder="item:key, item:map" />
                </div>
                
                <hr style="border: none; border-top: 1px solid var(--border-color); margin: var(--spacing-md) 0;" />
                
                <div class="form-group">
                    <label class="form-label">Reward Gold</label>
                    <input type="number" class="form-input" id="node-reward-gold" value="${node.rewards?.gold || 0}" min="0" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Reward Experience</label>
                    <input type="number" class="form-input" id="node-reward-exp" value="${node.rewards?.experience || 0}" min="0" />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Reward Items</label>
                    <select class="form-select" id="node-reward-items-select" multiple style="width: 100%; min-height: 80px;">
                        ${ContentLibrary.getItems('item').map(item => {
            const isSelected = node.rewards?.items?.includes(item.id);
            return `
                                <option value="${item.id}" ${isSelected ? 'selected' : ''}>
                                    ${item.name} (${item.data.type || 'item'})
                                </option>
                            `;
        }).join('')}
                    </select>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                        💡 Hold Ctrl/Cmd to select multiple items
                    </div>
                </div>
                
                <hr style="border: none; border-top: 1px solid var(--border-color); margin: var(--spacing-md) 0;" />
                
                <div class="form-group">
                    <label class="form-label">Next Nodes (comma-separated IDs for branching)</label>
                    <input type="text" class="form-input" id="node-next" value="${node.nextNodes?.join(', ') || ''}" placeholder="node_2, node_3" />
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                        Leave empty for campaign end. Add multiple for branching paths.
                    </div>
                </div>
            </div>
        `;
    }

    private renderFlowPreview(): string {
        let preview = `${this.campaign.name}\n${'='.repeat(this.campaign.name.length)}\n\n`;

        const visited = new Set<string>();
        const renderNode = (nodeId: string, depth: number = 0): string => {
            if (visited.has(nodeId)) {
                return `${'  '.repeat(depth)}↻ ${nodeId} (already shown)\n`;
            }
            visited.add(nodeId);

            const node = this.campaign.nodes.find(n => n.id === nodeId);
            if (!node) {
                return `${'  '.repeat(depth)}⚠️  ${nodeId} (NOT FOUND)\n`;
            }

            const indent = '  '.repeat(depth);
            const unlocks = [];
            if (node.unlockConditions?.requiredNodes?.length) {
                unlocks.push(`needs: ${node.unlockConditions.requiredNodes.join(', ')}`);
            }
            if (node.unlockConditions?.requiredLevel) {
                unlocks.push(`lv.${node.unlockConditions.requiredLevel}+`);
            }

            let result = `${indent}├─ ${node.displayName} (${node.id})\n`;
            if (unlocks.length > 0) {
                result += `${indent}│  🔒 ${unlocks.join(', ')}\n`;
            }
            result += `${indent}│  📍 ${node.dungeonId}\n`;

            if (node.nextNodes && node.nextNodes.length > 0) {
                node.nextNodes.forEach(nextId => {
                    result += renderNode(nextId, depth + 1);
                });
            } else {
                result += `${indent}│  🏁 Campaign End\n`;
            }

            return result;
        };
        preview += renderNode(this.campaign.startNodeId);
        return preview;
    }

    private renderSidebarTabs(): string {
        const tabs = [
            { id: 'flow', label: '🌲 Flow', icon: '🌲' },
            { id: 'actions', label: '💾 Actions', icon: '💾' },
            { id: 'tips', label: '💡 Tips', icon: '💡' }
        ];

        const tabButtons = tabs.map(tab => `
            <button 
                class="btn ${this.activeSidebarTab === tab.id ? 'btn-primary' : 'btn-secondary'}" 
                data-sidebar-tab="${tab.id}"
                style="flex: 1; padding: var(--spacing-sm); font-size: 0.875rem;"
            >
                ${tab.icon}
            </button>
        `).join('');

        let tabContent = '';

        if (this.activeSidebarTab === 'flow') {
            tabContent = `
                <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--spacing-md); font-family: monospace; font-size: 0.75rem; max-height: 400px; overflow-y: auto;">
                    ${this.renderFlowPreview()}
                </div>
            `;
        } else if (this.activeSidebarTab === 'actions') {
            tabContent = `
                <div class="btn-group" style="flex-direction: column; width: 100%;">
                    <button class="btn btn-success" id="btn-save-library">💾 Add to Library</button>
                    <button class="btn btn-secondary" id="btn-export">📥 Export JSON</button>
                    <button class="btn btn-secondary" id="btn-import">📤 Import JSON</button>
                    <button class="btn btn-secondary" id="btn-validate">✅ Validate Campaign</button>
                </div>
                <div id="validation-messages" class="validation-messages"></div>
            `;
        } else if (this.activeSidebarTab === 'tips') {
            tabContent = `
                <ul style="font-size: 0.875rem; color: var(--text-secondary); padding-left: var(--spacing-lg); margin: 0;">
                    <li>First node is the campaign start</li>
                    <li>Set unlock conditions for progression</li>
                    <li>Use "Next Nodes" to create branching paths</li>
                    <li>Rewards are given upon node completion</li>
                    <li>Select items from the library for rewards</li>
                </ul>
            `;
        }

        return `
            <div class="panel">
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-md);">
                    ${tabButtons}
                </div>
                ${tabContent}
            </div>
        `;
    }

    private attachEventListeners(): void {
        // Campaign metadata
        document.getElementById('campaign-id')?.addEventListener('input', (e) => {
            this.campaign.id = (e.target as HTMLInputElement).value;
        });

        document.getElementById('campaign-name')?.addEventListener('input', (e) => {
            this.campaign.name = (e.target as HTMLInputElement).value;
            this.updateFlowPreview();
        });

        document.getElementById('campaign-desc')?.addEventListener('input', (e) => {
            this.campaign.description = (e.target as HTMLTextAreaElement).value;
        });

        // Node selection
        document.querySelectorAll('[data-node-index]').forEach(item => {
            item.addEventListener('click', () => {
                this.selectedNodeIndex = parseInt(item.getAttribute('data-node-index') || '0');
                this.render();
            });
        });

        // Delete node
        document.querySelectorAll('[data-delete-node]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-delete-node') || '0');
                if (this.campaign.nodes.length > 1) {
                    this.campaign.nodes.splice(index, 1);
                    this.selectedNodeIndex = Math.max(0, this.selectedNodeIndex - 1);
                    this.render();
                } else {
                    alert('Cannot delete the last node!');
                }
            });
        });

        // Add node
        document.getElementById('btn-add-node')?.addEventListener('click', () => {
            const newNode: CampaignNode = {
                id: `node_${this.campaign.nodes.length + 1}`,
                displayName: `New Node ${this.campaign.nodes.length + 1}`,
                dungeonId: 'dungeon:new_dungeon',
                nextNodes: [],
                rewards: { gold: 0, experience: 0 }
            };
            this.campaign.nodes.push(newNode);
            this.selectedNodeIndex = this.campaign.nodes.length - 1;
            this.render();
        });

        // Node editor inputs
        this.attachNodeEditorListeners();

        // Buttons
        document.getElementById('btn-save-library')?.addEventListener('click', () => this.saveCampaignToLibrary());
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportCampaign());
        document.getElementById('btn-import')?.addEventListener('click', () => this.importCampaign());
        document.getElementById('btn-validate')?.addEventListener('click', () => this.validateCampaign());

        // Sidebar tab switching
        document.querySelectorAll('[data-sidebar-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-sidebar-tab');
                if (tabId) {
                    this.activeSidebarTab = tabId as 'flow' | 'actions' | 'tips';
                    this.render();
                }
            });
        });

        // Library listeners
        const sidebar = this.root.querySelector('.editor-sidebar') as HTMLElement;
        TabbedLibrary.attachTabbedLibraryListeners(
            (tabId) => {
                this.activeLibraryTab = tabId as 'campaigns' | 'dungeons' | 'items';
                this.render();
            },
            (item) => this.handleLibrarySelection(item),
            sidebar
        );
    }

    private handleLibrarySelection(item: any): void {
        if (item.type === 'campaign') {
            // Load campaign for editing
            if (confirm(`Load campaign "${item.name}"? Current campaign will be replaced.`)) {
                this.campaign = item.data;
                this.selectedNodeIndex = 0;
                this.render();
            }
        } else if (item.type === 'dungeon') {
            // Store selected dungeon for use in node editing
            this.selectedDungeon = { id: item.id, name: item.name };

            // If editing a node, auto-select the dungeon
            const dungeonSelect = document.getElementById('node-dungeon-select') as HTMLSelectElement;
            if (dungeonSelect) {
                dungeonSelect.value = item.id;
                // Trigger change event
                dungeonSelect.dispatchEvent(new Event('change'));
            }
        } else if (item.type === 'item') {
            // Add item to reward items multi-select
            const rewardItemsSelect = document.getElementById('node-reward-items-select') as HTMLSelectElement;
            if (rewardItemsSelect) {
                // Find the option and select it
                const option = Array.from(rewardItemsSelect.options).find(opt => opt.value === item.id);
                if (option && !option.selected) {
                    option.selected = true;
                    // Trigger change event
                    rewardItemsSelect.dispatchEvent(new Event('change'));
                }
            }
        }
    }

    private attachNodeEditorListeners(): void {
        const node = this.campaign.nodes[this.selectedNodeIndex];
        if (!node) return;

        const updateNode = () => {
            node.id = (document.getElementById('node-id') as HTMLInputElement).value;
            node.displayName = (document.getElementById('node-name') as HTMLInputElement).value;

            const dungeonSelect = document.getElementById('node-dungeon-select') as HTMLSelectElement;
            node.dungeonId = dungeonSelect.value;

            const reqLevel = (document.getElementById('node-req-level') as HTMLInputElement).value;
            const reqNodes = (document.getElementById('node-req-nodes') as HTMLInputElement).value;
            const reqItems = (document.getElementById('node-req-items') as HTMLInputElement).value;

            if (!node.unlockConditions) node.unlockConditions = {};
            node.unlockConditions.requiredLevel = reqLevel ? parseInt(reqLevel) : undefined;
            node.unlockConditions.requiredNodes = reqNodes ? reqNodes.split(',').map((s: string) => s.trim()) : undefined;
            node.unlockConditions.requiredItems = reqItems ? reqItems.split(',').map((s: string) => s.trim()) : undefined;

            if (!node.rewards) node.rewards = {};
            node.rewards.gold = parseInt((document.getElementById('node-reward-gold') as HTMLInputElement).value) || 0;
            node.rewards.experience = parseInt((document.getElementById('node-reward-exp') as HTMLInputElement).value) || 0;

            const rewardItemsSelect = document.getElementById('node-reward-items-select') as HTMLSelectElement;
            const selectedItems = Array.from(rewardItemsSelect.selectedOptions).map(opt => opt.value);
            node.rewards.items = selectedItems.length > 0 ? selectedItems : undefined;

            const nextNodes = (document.getElementById('node-next') as HTMLInputElement).value;
            node.nextNodes = nextNodes ? nextNodes.split(',').map((s: string) => s.trim()) : [];

            this.updateFlowPreview();
        };

        ['node-id', 'node-name', 'node-req-level', 'node-req-nodes', 'node-req-items',
            'node-reward-gold', 'node-reward-exp', 'node-next'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', updateNode);
            });

        ['node-dungeon-select', 'node-reward-items-select'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updateNode);
        });
    }

    private updateFlowPreview(): void {
        const flowDiv = document.querySelector('.panel:has(.panel-title:contains("Campaign Flow"))');
        if (flowDiv) {
            const previewDiv = flowDiv.querySelector('div[style*="monospace"]');
            if (previewDiv) {
                previewDiv.innerHTML = this.renderFlowPreview();
            }
        }
    }

    private validateCampaign(): boolean {
        const messagesDiv = document.getElementById('validation-messages')!;
        const errors: string[] = [];

        // Basic validation
        if (!this.campaign.id || !this.campaign.name) {
            errors.push('Campaign ID and Name are required');
        }

        if (this.campaign.nodes.length === 0) {
            errors.push('Campaign must have at least one node');
        }

        // Check start node exists
        if (!this.campaign.nodes.find(n => n.id === this.campaign.startNodeId)) {
            errors.push(`Start node "${this.campaign.startNodeId}" not found in nodes`);
        }

        // Check all referenced nodes exist
        const nodeIds = new Set(this.campaign.nodes.map(n => n.id));
        this.campaign.nodes.forEach(node => {
            node.nextNodes?.forEach(nextId => {
                if (!nodeIds.has(nextId)) {
                    errors.push(`Node "${node.id}" references non-existent node "${nextId}"`);
                }
            });

            node.unlockConditions?.requiredNodes?.forEach(reqId => {
                if (!nodeIds.has(reqId)) {
                    errors.push(`Node "${node.id}" requires non-existent node "${reqId}"`);
                }
            });
        });

        // Check for orphaned nodes (except start node)
        const reachable = new Set<string>();
        const visit = (nodeId: string) => {
            if (reachable.has(nodeId)) return;
            reachable.add(nodeId);
            const node = this.campaign.nodes.find(n => n.id === nodeId);
            node?.nextNodes?.forEach(visit);
        };
        visit(this.campaign.startNodeId);

        this.campaign.nodes.forEach(node => {
            if (!reachable.has(node.id)) {
                errors.push(`Node "${node.id}" is not reachable from start node`);
            }
        });

        if (errors.length > 0) {
            messagesDiv.innerHTML = errors.map(err =>
                `<div class="validation-error">⚠️ ${err}</div>`
            ).join('');
            return false;
        }

        messagesDiv.innerHTML = '<div class="validation-warning">✅ Campaign is valid!</div>';
        return true;
    }

    private saveCampaignToLibrary(): void {
        if (!this.validateCampaign()) return;

        // Save to library
        ContentLibrary.saveItem({
            id: this.campaign.id,
            name: this.campaign.name,
            type: 'campaign',
            data: this.campaign
        });

        const messagesDiv = document.getElementById('validation-messages')!;
        messagesDiv.innerHTML = '<div class="validation-warning">✅ Campaign added to library!</div>';
    }

    private exportCampaign(): void {
        if (!this.validateCampaign()) return;

        const asset = createContentAsset(this.campaign.id, '1.0.0', this.campaign);

        const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.campaign.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        const messagesDiv = document.getElementById('validation-messages')!;
        messagesDiv.innerHTML = '<div class="validation-warning">✅ Campaign exported to JSON file!</div>';
    }

    private importCampaign(): void {
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
                    this.campaign = content.data || content;
                    this.selectedNodeIndex = 0;
                    this.render();

                    const messagesDiv = document.getElementById('validation-messages')!;
                    messagesDiv.innerHTML = '<div class="validation-warning">✅ Campaign imported successfully!</div>';
                } catch (err) {
                    alert('Invalid campaign file: ' + err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
