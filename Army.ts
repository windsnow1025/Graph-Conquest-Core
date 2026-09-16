import type {UnitStats, UnitType, UnitJSON} from "./Unit";
import Unit from "./Unit";
import type Graph from "./Graph";

class Army {
  public units: Unit[];
  public unitType: UnitType;
  public unitStats: UnitStats;
  public location: string;
  public remainingMoves: number;
  public canAttack: boolean;

  constructor(units: Unit[], unitType: UnitType, unitStats: UnitStats, location: string) {
    this.units = units;
    this.unitType = unitType;
    this.unitStats = unitStats;
    this.location = location;
    this.remainingMoves = 0;
    this.canAttack = false;
  }

  public removeDeadUnits() {
    this.units = this.units.filter(unit => unit.currentHealth > 0);
  }

  public getMovableLocations(graph: Graph, blockedLocations: Set<string>): string[] {
    return Array.from(graph.nodes.keys())
      .filter(location => this.canMove(location, graph, blockedLocations));
  }

  public canMove(newLocation: string, graph: Graph, blockedLocations: Set<string>): boolean {
    if (newLocation === this.location || blockedLocations.has(newLocation)) {
      return false;
    }
    const distance = graph.getDistance(this.location, newLocation, blockedLocations)!;
    return distance <= this.remainingMoves;
  }

  public getAttackableTargets(enemies: Army[], graph: Graph): Army[] {
    if (!this.canAttack) {
      return [];
    }
    return enemies.filter(enemy =>
      graph.getDistance(this.location, enemy.location)! <= this.unitStats.range
    );
  }

  public resetTurn() {
    this.remainingMoves = this.unitStats.speed;
    this.canAttack = true;
  }

  toJSON(): ArmyJSON {
    return {
      units: this.units.map(unit => unit.toJSON()),
      unitType: this.unitType as string,
      location: this.location,
      remainingMoves: this.remainingMoves,
      canAttack: this.canAttack,
    };
  }

  static fromJSON(json: ArmyJSON, unitStatsMap: Record<string, UnitStats>): Army {
    const stats = unitStatsMap[json.unitType];
    const army = new Army(json.units.map(unitJSON => Unit.fromJSON(unitJSON, stats)), json.unitType, stats, json.location);
    army.remainingMoves = json.remainingMoves;
    army.canAttack = json.canAttack;
    return army;
  }
}

export interface ArmyJSON {
  units: UnitJSON[];
  unitType: string;
  location: string;
  remainingMoves: number;
  canAttack: boolean;
}

export default Army;
