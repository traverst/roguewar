"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityType = exports.Direction = void 0;
var Direction;
(function (Direction) {
    Direction[Direction["North"] = 0] = "North";
    Direction[Direction["East"] = 1] = "East";
    Direction[Direction["South"] = 2] = "South";
    Direction[Direction["West"] = 3] = "West";
})(Direction || (exports.Direction = Direction = {}));
var EntityType;
(function (EntityType) {
    EntityType["Player"] = "player";
    EntityType["Enemy"] = "enemy";
})(EntityType || (exports.EntityType = EntityType = {}));
