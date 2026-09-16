import {type UnitStats, type UnitStatsMap, type UnitType} from "./Unit.ts";
import type Graph from "./Graph.ts";
import type Player from "./Player.ts";

export interface NeutralGarrison {
  unitType: UnitType;
  unitStats: UnitStats;
}

export interface GameConfig {
  unitStatsMap: UnitStatsMap;
  gameMap: Graph;
  maxTurns: number;
  maxArmyAttacks: number;
  interestRate: number;
  upkeepRate: number;
  players: Player[];
  neutralGarrison: NeutralGarrison;
}
