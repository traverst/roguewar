import { Action, GameEvent, GameState } from './types';
import { ModManifest } from './mods';

export interface GameConfig {
    dungeonSeed: number;
    rngSeed: number;
    players: PlayerConfig[];
    mods?: ModManifest[];
    maxLevels?: number;  // Number of dungeon levels (1 = single level)
}

export interface PlayerConfig {
    id: string;
    type: 'human' | 'ai';
    name?: string;
}

export interface TurnRecord {
    turn: number;
    action: Action;
    events: GameEvent[];
    timestamp: number;
}

export interface GameLog {
    meta: {
        gameId: string;
        gameName?: string;
        saveId?: string; // Unique key for each discrete save point
        createdAt: number;
        rulesVersion: string;
        lastSaved: number;
    };
    config: GameConfig;
    turns: TurnRecord[];
}
