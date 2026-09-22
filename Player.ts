import Army from "./Army";
import type {ArmyJSON} from "./Army";
import type Graph from "./Graph";
import type Unit from "./Unit";
import type {UnitStatsMap, UnitType} from "./Unit";
import {createUnits} from "./Unit";

class Player {
  public money: number;
  public name: string;
  public homeLocation: string;
  public unitStatsMap: UnitStatsMap = {};
  public armies: Army[] = [];
  public defeated = false;

  constructor(money: number, name: string, homeLocation: string) {
    this.money = money;
    this.name = name;
    this.homeLocation = homeLocation;
  }

  public canBuy(unitType: UnitType, count: number): boolean {
    if (count <= 0) return false;
    return this.money >= this.unitStatsMap[unitType].cost * count;
  }

  public getUpkeep(upkeepRate: number): number {
    let total = 0;
    for (const army of this.armies) {
      total += army.units.length * army.unitStats.cost * upkeepRate;
    }
    return Math.floor(total);
  }

  public getArmy(location: string, unitType: UnitType): Army | undefined {
    return this.armies.find(army => army.location === location && army.unitType === unitType);
  }

  public buyUnitsToLocation(unitType: UnitType, location: string, count: number): Army | null {
    if (!this.canBuy(unitType, count)) return null;

    const stats = this.unitStatsMap[unitType];
    const army = this.placeUnits(createUnits(stats, count), unitType, location);
    this.money -= army.unitStats.cost * count;
    return army;
  }

  public moveUnits(army: Army, newLocation: string, units: Unit[], graph: Graph, enemyLocations: Set<string>): boolean {
    if (!this.armies.includes(army) || units.length === 0) return false;
    const candidates = new Set(army.getMoveCandidates(newLocation, graph, enemyLocations));
    if (!units.every(unit => candidates.has(unit))) return false;

    const distance = graph.getDistance(army.location, newLocation, enemyLocations)!;
    const moving = new Set(units);
    for (const unit of moving) {
      unit.remainingMoves -= distance;
    }
    army.units = army.units.filter(unit => !moving.has(unit));
    this.placeUnits([...moving], army.unitType, newLocation);
    this.removeEmptyArmies();
    return true;
  }

  public disbandUnits(army: Army, units: Unit[]): boolean {
    if (!this.armies.includes(army) || units.length === 0) return false;
    if (!units.every(unit => army.units.includes(unit))) return false;

    const disbanding = new Set(units);
    army.units = army.units.filter(unit => !disbanding.has(unit));
    this.removeEmptyArmies();
    return true;
  }

  public resetAllArmyTurns() {
    for (const army of this.armies) {
      army.resetTurn();
    }
  }

  public removeEmptyArmies() {
    this.armies = this.armies.filter(army => army.units.length > 0);
  }

  private placeUnits(units: Unit[], unitType: UnitType, location: string): Army {
    const existing = this.getArmy(location, unitType);
    if (existing) {
      existing.units.push(...units);
      return existing;
    }
    const army = new Army(units, unitType, this.unitStatsMap[unitType], location);
    this.armies.push(army);
    return army;
  }

  toJSON(): PlayerJSON {
    return {
      money: this.money,
      name: this.name,
      homeLocation: this.homeLocation,
      armies: this.armies.map(army => army.toJSON()),
      defeated: this.defeated,
    };
  }

  static fromJSON(json: PlayerJSON, unitStatsMap: UnitStatsMap): Player {
    const player = new Player(json.money, json.name, json.homeLocation);
    player.unitStatsMap = unitStatsMap;
    player.armies = json.armies.map(armyJSON => Army.fromJSON(armyJSON, unitStatsMap));
    player.defeated = json.defeated;
    return player;
  }
}

export interface PlayerJSON {
  money: number;
  name: string;
  homeLocation: string;
  armies: ArmyJSON[];
  defeated: boolean;
}

export default Player;
