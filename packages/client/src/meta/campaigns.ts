import { Campaign, CampaignNode, CampaignProgress, PlayerProfile } from './types';

/**
 * CampaignManager - Manages campaign definitions and progress
 */
export class CampaignManager {
    private campaigns: Map<string, Campaign> = new Map();

    constructor() {
        // Campaigns are registered separately via content files
    }

    /**
     * Register a campaign definition
     */
    registerCampaign(campaign: Campaign): void {
        this.campaigns.set(campaign.id, campaign);
    }

    /**
     * Get all available campaigns
     */
    getAllCampaigns(): Campaign[] {
        return Array.from(this.campaigns.values());
    }

    /**
     * Get a specific campaign by ID
     */
    getCampaign(campaignId: string): Campaign | undefined {
        return this.campaigns.get(campaignId);
    }

    /**
     * Get a specific node from a campaign
     */
    getNode(campaignId: string, nodeId: string): CampaignNode | undefined {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return undefined;
        return campaign.nodes.find(n => n.id === nodeId);
    }

    /**
     * Initialize campaign progress for a new campaign
     */
    initializeCampaignProgress(campaignId: string): CampaignProgress[string] {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }

        return {
            currentNodeId: campaign.startNodeId,
            completedNodes: [],
            unlockedNodes: [campaign.startNodeId]
        };
    }

    /**
     * Get available nodes for a player in a campaign
     */
    getAvailableNodes(profile: PlayerProfile, campaignId: string): CampaignNode[] {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return [];

        const progress = profile.campaignProgress[campaignId];
        if (!progress) return [];

        return campaign.nodes.filter(node =>
            progress.unlockedNodes.includes(node.id) &&
            !progress.completedNodes.includes(node.id)
        );
    }

    /**
     * Check if a node's prerequisites are met
     */
    arePrerequisitesMet(node: CampaignNode, progress: CampaignProgress[string]): boolean {
        if (!node.requiredNodes || node.requiredNodes.length === 0) {
            return true;
        }

        return node.requiredNodes.every(reqId =>
            progress.completedNodes.includes(reqId)
        );
    }

    /**
     * Mark a node as completed and unlock next nodes
     */
    completeNode(
        profile: PlayerProfile,
        campaignId: string,
        nodeId: string
    ): { unlockedNodes: string[] } {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }

        const node = this.getNode(campaignId, nodeId);
        if (!node) {
            throw new Error(`Node not found: ${nodeId}`);
        }

        // Initialize progress if needed
        if (!profile.campaignProgress[campaignId]) {
            profile.campaignProgress[campaignId] = this.initializeCampaignProgress(campaignId);
        }

        const progress = profile.campaignProgress[campaignId];

        // Mark as completed
        if (!progress.completedNodes.includes(nodeId)) {
            progress.completedNodes.push(nodeId);
        }

        // Unlock next nodes
        const newlyUnlocked: string[] = [];
        for (const nextNodeId of node.nextNodes) {
            if (!progress.unlockedNodes.includes(nextNodeId)) {
                const nextNode = this.getNode(campaignId, nextNodeId);
                if (nextNode && this.arePrerequisitesMet(nextNode, progress)) {
                    progress.unlockedNodes.push(nextNodeId);
                    newlyUnlocked.push(nextNodeId);
                }
            }
        }

        // Update current node to first available
        const available = this.getAvailableNodes(profile, campaignId);
        if (available.length > 0) {
            progress.currentNodeId = available[0].id;
        }

        return { unlockedNodes: newlyUnlocked };
    }

    /**
     * Get campaign completion percentage
     */
    getCompletionPercentage(profile: PlayerProfile, campaignId: string): number {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return 0;

        const progress = profile.campaignProgress[campaignId];
        if (!progress) return 0;

        const totalNodes = campaign.nodes.length;
        const completedNodes = progress.completedNodes.length;

        return Math.floor((completedNodes / totalNodes) * 100);
    }

    /**
     * Check if a campaign is completed
     */
    isCampaignCompleted(profile: PlayerProfile, campaignId: string): boolean {
        return this.getCompletionPercentage(profile, campaignId) === 100;
    }
}

/**
 * Global singleton instance
 */
export const campaignManager = new CampaignManager();
