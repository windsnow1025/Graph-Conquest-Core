import {type UnitStats, type UnitStatsMap, type UnitType} from "./Unit.ts";
import type {GraphJSON} from "./Graph.ts";

export interface NeutralGarrison {
  unitType: UnitType;
  unitStats: UnitStats;
}

export interface PlayerConfig {
  money: number;
  name: string;
  homeLocation: string;
}

export interface GameConfig {
  unitStatsMap: UnitStatsMap;
  gameMap: GraphJSON;
  maxTurns: number;
  maxArmyAttacks: number;
  interestRate: number;
  upkeepRate: number;
  players: PlayerConfig[];
  neutralGarrison: NeutralGarrison;
}
