/**
 * Validate Dungeon Definition
 */
export function validateDungeon(dungeon) {
    const errors = [];
    const warnings = [];
    // Required fields
    if (!dungeon.id) {
        errors.push({ field: 'id', message: 'ID is required', severity: 'error' });
    }
    if (!dungeon.name) {
        errors.push({ field: 'name', message: 'Name is required', severity: 'error' });
    }
    if (dungeon.width < 10 || dungeon.width > 100) {
        errors.push({ field: 'width', message: 'Width must be between 10 and 100', severity: 'error' });
    }
    if (dungeon.height < 10 || dungeon.height > 100) {
        errors.push({ field: 'height', message: 'Height must be between 10 and 100', severity: 'error' });
    }
    // Validate tiles array dimensions
    if (dungeon.tiles.length !== dungeon.height) {
        errors.push({ field: 'tiles', message: 'Tiles height does not match dungeon height', severity: 'error' });
    }
    else {
        for (let y = 0; y < dungeon.tiles.length; y++) {
            if (dungeon.tiles[y].length !== dungeon.width) {
                errors.push({ field: 'tiles', message: `Row ${y} width does not match dungeon width`, severity: 'error' });
                break;
            }
        }
    }
    // Validate spawn positions
    if (!isPositionValid(dungeon.playerSpawn, dungeon.width, dungeon.height)) {
        errors.push({ field: 'playerSpawn', message: 'Player spawn position is out of bounds', severity: 'error' });
    }
    for (let i = 0; i < dungeon.enemySpawns.length; i++) {
        if (!isPositionValid(dungeon.enemySpawns[i], dungeon.width, dungeon.height)) {
            errors.push({ field: `enemySpawns[${i}]`, message: 'Enemy spawn position is out of bounds', severity: 'error' });
        }
    }
    // Warnings
    if (dungeon.enemySpawns.length === 0) {
        warnings.push({ field: 'enemySpawns', message: 'No enemy spawns defined', severity: 'warning' });
    }
    return { valid: errors.length === 0, errors, warnings };
}
/**
 * Validate Entity Template
 */
export function validateEntity(entity) {
    const errors = [];
    const warnings = [];
    if (!entity.id) {
        errors.push({ field: 'id', message: 'ID is required', severity: 'error' });
    }
    if (!entity.name) {
        errors.push({ field: 'name', message: 'Name is required', severity: 'error' });
    }
    if (entity.maxHp <= 0) {
        errors.push({ field: 'maxHp', message: 'Max HP must be greater than 0', severity: 'error' });
    }
    if (entity.hp > entity.maxHp) {
        errors.push({ field: 'hp', message: 'HP cannot exceed max HP', severity: 'error' });
    }
    if (entity.attack < 0) {
        errors.push({ field: 'attack', message: 'Attack cannot be negative', severity: 'error' });
    }
    if (entity.defense !== undefined && entity.defense < 0) {
        errors.push({ field: 'defense', message: 'Defense cannot be negative', severity: 'error' });
    }
    // AI behavior validation
    if (entity.aiBehavior) {
        const ai = entity.aiBehavior;
        if (ai.detectionRange < 0) {
            errors.push({ field: 'aiBehavior.detectionRange', message: 'Detection range cannot be negative', severity: 'error' });
        }
        if (ai.aggressionLevel < 0 || ai.aggressionLevel > 1) {
            errors.push({ field: 'aiBehavior.aggressionLevel', message: 'Aggression level must be between 0 and 1', severity: 'error' });
        }
    }
    return { valid: errors.length === 0, errors, warnings };
}
/**
 * Validate Item Template
 */
export function validateItem(item) {
    const errors = [];
    const warnings = [];
    if (!item.id) {
        errors.push({ field: 'id', message: 'ID is required', severity: 'error' });
    }
    if (!item.name) {
        errors.push({ field: 'name', message: 'Name is required', severity: 'error' });
    }
    if (item.damage !== undefined && item.damage < 0) {
        errors.push({ field: 'damage', message: 'Damage cannot be negative', severity: 'error' });
    }
    if (item.defense !== undefined && item.defense < 0) {
        errors.push({ field: 'defense', message: 'Defense cannot be negative', severity: 'error' });
    }
    // Validate type-specific requirements
    if (item.type === 'weapon' && item.damage === undefined) {
        warnings.push({ field: 'damage', message: 'Weapon should have damage value', severity: 'warning' });
    }
    if (item.type === 'armor' && item.defense === undefined) {
        warnings.push({ field: 'defense', message: 'Armor should have defense value', severity: 'warning' });
    }
    return { valid: errors.length === 0, errors, warnings };
}
/**
 * Validate Campaign
 */
export function validateCampaign(campaign) {
    const errors = [];
    const warnings = [];
    if (!campaign.id) {
        errors.push({ field: 'id', message: 'Campaign ID is required', severity: 'error' });
    }
    if (!campaign.name) {
        errors.push({ field: 'name', message: 'Campaign name is required', severity: 'error' });
    }
    if (!campaign.startNodeId) {
        errors.push({ field: 'startNodeId', message: 'Start node ID is required', severity: 'error' });
    }
    if (campaign.nodes.length === 0) {
        errors.push({ field: 'nodes', message: 'Campaign must have at least one node', severity: 'error' });
    }
    // Validate start node exists
    const startNode = campaign.nodes.find((n) => n.id === campaign.startNodeId);
    if (!startNode) {
        errors.push({ field: 'startNodeId', message: 'Start node does not exist in nodes array', severity: 'error' });
    }
    // Validate node references
    const nodeIds = new Set(campaign.nodes.map((n) => n.id));
    for (const node of campaign.nodes) {
        for (const nextId of node.nextNodes) {
            if (!nodeIds.has(nextId)) {
                errors.push({ field: `nodes[${node.id}].nextNodes`, message: `Referenced node ${nextId} does not exist`, severity: 'error' });
            }
        }
        if (node.requiredNodes) {
            for (const reqId of node.requiredNodes) {
                if (!nodeIds.has(reqId)) {
                    errors.push({ field: `nodes[${node.id}].requiredNodes`, message: `Referenced node ${reqId} does not exist`, severity: 'error' });
                }
            }
        }
    }
    // Detect unreachable nodes
    const reachable = findReachableNodes(campaign);
    for (const node of campaign.nodes) {
        if (!reachable.has(node.id)) {
            warnings.push({ field: `nodes[${node.id}]`, message: `Node ${node.id} is unreachable from start`, severity: 'warning' });
        }
    }
    return { valid: errors.length === 0, errors, warnings };
}
/**
 * Find all reachable nodes from start
 */
function findReachableNodes(campaign) {
    const reachable = new Set();
    const queue = [campaign.startNodeId];
    while (queue.length > 0) {
        const nodeId = queue.shift();
        if (reachable.has(nodeId))
            continue;
        reachable.add(nodeId);
        const node = campaign.nodes.find((n) => n.id === nodeId);
        if (node) {
            queue.push(...node.nextNodes);
        }
    }
    return reachable;
}
/**
 * Helper: Check if position is within bounds
 */
function isPositionValid(pos, width, height) {
    return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
}
/**
 * Generate deterministic hash for content
 */
export function generateContentHash(data) {
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
/**
 * Create a versioned content asset
 */
export function createContentAsset(id, version, data) {
    const now = Date.now();
    return {
        id,
        version,
        hash: generateContentHash(data),
        createdAt: now,
        modifiedAt: now,
        data
    };
}
