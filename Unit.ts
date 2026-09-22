export interface UnitStats {
  attack: number;
  defend: number;
  health: number;
  range: number;
  speed: number;
  cost: number;
}

export type UnitStatsMap = Record<string, UnitStats>;

export type UnitType = keyof UnitStatsMap;

class Unit {
  public readonly attack: number;
  public readonly defend: number;
  public readonly health: number;
  public readonly range: number;
  public readonly speed: number;
  public readonly cost: number;
  public currentHealth: number;
  public remainingMoves: number;
  public canAttack: boolean;
  public inBattle: boolean;

  constructor(stats: UnitStats) {
    this.attack = stats.attack;
    this.defend = stats.defend;
    this.health = stats.health;
    this.range = stats.range;
    this.speed = stats.speed;
    this.cost = stats.cost;
    this.currentHealth = stats.health;
    this.remainingMoves = 0;
    this.canAttack = false;
    this.inBattle = false;
  }

  public resetTurn() {
    this.remainingMoves = this.speed;
    this.canAttack = true;
  }

  toJSON(): UnitJSON {
    return {
      currentHealth: this.currentHealth,
      remainingMoves: this.remainingMoves,
      canAttack: this.canAttack,
      inBattle: this.inBattle,
    };
  }

  static fromJSON(json: UnitJSON, stats: UnitStats): Unit {
    const unit = new Unit(stats);
    unit.currentHealth = json.currentHealth;
    unit.remainingMoves = json.remainingMoves;
    unit.canAttack = json.canAttack;
    unit.inBattle = json.inBattle;
    return unit;
  }
}

export function createUnits(stats: UnitStats, count: number): Unit[] {
  return Array.from({length: count}, () => new Unit(stats));
}

export interface UnitJSON {
  currentHealth: number;
  remainingMoves: number;
  canAttack: boolean;
  inBattle: boolean;
}

export default Unit;
