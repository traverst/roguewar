export var Direction;
(function (Direction) {
    Direction[Direction["North"] = 0] = "North";
    Direction[Direction["East"] = 1] = "East";
    Direction[Direction["South"] = 2] = "South";
    Direction[Direction["West"] = 3] = "West";
})(Direction || (Direction = {}));
export var EntityType;
(function (EntityType) {
    EntityType["Player"] = "player";
    EntityType["Enemy"] = "enemy";
})(EntityType || (EntityType = {}));
// ===== Phase 11a: Inventory, Equipment, and Vision Types =====
/**
 * Equipment slots for wearable/holdable items
 */
export var EquipSlot;
(function (EquipSlot) {
    EquipSlot["Head"] = "head";
    EquipSlot["Body"] = "body";
    EquipSlot["Hands"] = "hands";
    EquipSlot["Ring"] = "ring";
    EquipSlot["Weapon"] = "weapon";
})(EquipSlot || (EquipSlot = {}));
