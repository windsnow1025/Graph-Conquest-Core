import DefaultGameMap from "./DefaultGameMap";
import DefaultNeutralGarrison from "./DefaultNeutralGarrison";
import DefaultPlayers from "./DefaultPlayers";
import DefaultUnitStatsMap from "./DefaultUnitStatsMap";
import type {GameConfig} from "../Config";

const DefaultConfig: GameConfig = {
  unitStatsMap: DefaultUnitStatsMap,
  gameMap: DefaultGameMap,
  maxTurns: 100,
  maxArmyAttacks: 3,
  interestRate: 0.05,
  upkeepRate: 0.1,
  players: DefaultPlayers,
  neutralGarrison: DefaultNeutralGarrison,
};

export default DefaultConfig;
