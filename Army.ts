import type {UnitStats, UnitType, UnitJSON} from "./Unit";
import Unit from "./Unit";
import type Graph from "./Graph";

class Army {
  public units: Unit[];
  public unitType: UnitType;
  public unitStats: UnitStats;
  public location: string;

  constructor(units: Unit[], unitType: UnitType, unitStats: UnitStats, location: string) {
    this.units = units;
    this.unitType = unitType;
    this.unitStats = unitStats;
    this.location = location;
  }

  get attackCandidates(): Unit[] {
    return this.units.filter(unit => unit.canAttack);
  }

  get battleUnits(): Unit[] {
    return this.units.filter(unit => unit.inBattle);
  }

  public removeDeadUnits() {
    this.units = this.units.filter(unit => unit.currentHealth > 0);
  }

  public getMovableLocations(graph: Graph, blockedLocations: Set<string>): string[] {
    return Array.from(graph.nodes.keys())
      .filter(location => this.getMoveCandidates(location, graph, blockedLocations).length > 0);
  }

  public getMoveCandidates(newLocation: string, graph: Graph, blockedLocations: Set<string>): Unit[] {
    if (newLocation === this.location || blockedLocations.has(newLocation)) {
      return [];
    }
    const distance = graph.getDistance(this.location, newLocation, blockedLocations)!;
    return this.units.filter(unit => unit.remainingMoves >= distance);
  }

  public resetTurn() {
    for (const unit of this.units) {
      unit.resetTurn();
    }
  }

  toJSON(): ArmyJSON {
    return {
      units: this.units.map(unit => unit.toJSON()),
      unitType: this.unitType as string,
      location: this.location,
    };
  }

  static fromJSON(json: ArmyJSON, unitStatsMap: Record<string, UnitStats>): Army {
    const stats = unitStatsMap[json.unitType];
    return new Army(json.units.map(unitJSON => Unit.fromJSON(unitJSON, stats)), json.unitType, stats, json.location);
  }
}

export interface ArmyJSON {
  units: UnitJSON[];
  unitType: string;
  location: string;
}

export default Army;
