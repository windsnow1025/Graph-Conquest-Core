import GameSystem, {type GameData, type GameSave} from "./GameSystem";
import type Player from "./Player";
import type Army from "./Army";
import type Unit from "./Unit";
import type {UnitData, UnitType} from "./Unit";
import type {GameConfig} from "./Config.ts";

export class InputError extends Error {
  name = "InputError";
}

const Exit: ProxyHandler<GameAPI> = {
  get(target, key) {
    const member = Reflect.get(target, key);
    if (typeof member !== "function") return undefined;
    return (...args: unknown[]) => structuredClone(member.apply(target, args));
  },
};

class GameAPI {
  private game: GameSystem;

  private constructor(game: GameSystem) {
    this.game = game;
    return new Proxy(this, Exit);
  }

  static create(config: GameConfig): GameAPI {
    return new GameAPI(new GameSystem(config));
  }

  static fromJSON(save: GameSave): GameAPI {
    return new GameAPI(GameSystem.fromJSON(save));
  }

  toJSON(): GameSave {
    return this.game.toJSON();
  }

  // Queries

  getState(): GameData {
    return this.game;
  }

  getWinner(): string | null {
    return this.game.winner?.name ?? null;
  }

  isGameOver(): boolean {
    return this.game.gameOver;
  }

  getRecruitLocations(): string[] {
    return this.game.recruitLocations;
  }

  canBuy(unitType: UnitType, count: number): boolean {
    this.checkUnitType(unitType);
    this.checkCount(count);
    return this.game.currentPlayer.canBuy(unitType, count);
  }

  getDistance(from: string, to: string): number {
    this.checkLocation(from);
    this.checkLocation(to);
    return this.game.gameMap.getDistance(from, to);
  }

  getMovableLocations(armyId: ArmyId): string[] {
    this.checkCurrentOwner(armyId);
    const army = this.findArmy(armyId);
    return army.getMovableLocations(this.game.gameMap, this.game.enemyLocations);
  }

  getMoveCandidates(armyId: ArmyId, destination: string): UnitData[] {
    this.checkCurrentOwner(armyId);
    this.checkLocation(destination);
    const army = this.findArmy(armyId);
    return army.getMoveCandidates(destination, this.game.gameMap, this.game.enemyLocations);
  }

  getUpkeep(owner: string): number {
    return this.game.getUpkeep(this.findPlayer(owner));
  }

  // Commands

  recruit(unitType: UnitType, location: string, count: number): boolean {
    this.checkUnitType(unitType);
    this.checkLocation(location);
    this.checkCount(count);
    return this.game.recruitPlayerArmy(unitType, location, count) !== null;
  }

  moveUnits(armyId: ArmyId, destination: string, selections: UnitSelection[]): boolean {
    this.checkCurrentOwner(armyId);
    this.checkLocation(destination);
    this.checkSelections(selections);
    const army = this.findArmy(armyId);
    const units = this.selectUnits(army, selections);
    return this.game.movePlayerUnits(army, destination, units);
  }

  disbandUnits(armyId: ArmyId, selections: UnitSelection[]): boolean {
    this.checkCurrentOwner(armyId);
    this.checkSelections(selections);
    const army = this.findArmy(armyId);
    const units = this.selectUnits(army, selections);
    return this.game.disbandPlayerUnits(army, units);
  }

  endTurn(): boolean {
    return this.game.endTurn();
  }

  // Validation

  private checkUnitType(unitType: UnitType): void {
    if (!Object.hasOwn(this.game.unitStatsMap, unitType)) throw new InputError(`unknown unit type: ${unitType}`);
  }

  private checkCount(count: number): void {
    if (!Number.isInteger(count) || count <= 0) throw new InputError(`count is not a positive integer: ${count}`);
  }

  private checkLocation(location: string): void {
    if (!this.game.gameMap.nodes.has(location)) throw new InputError(`unknown location: ${location}`);
  }

  private checkCurrentOwner(armyId: ArmyId): void {
    if (armyId.owner !== this.game.currentPlayer.name) throw new InputError(`not the current player's army: ${armyId.owner}`);
  }

  private checkSelections(selections: UnitSelection[]): void {
    const states = new Set<string>();
    for (const {currentHealth, remainingMoves, canAttack, count} of selections) {
      this.checkCount(count);
      const state = `${currentHealth}|${remainingMoves}|${canAttack}`;
      if (states.has(state)) throw new InputError(`a state is selected twice: health ${currentHealth}, moves ${remainingMoves}, canAttack ${canAttack}`);
      states.add(state);
    }
  }

  // Resolution

  private findArmy(id: ArmyId): Army {
    const army = this.findPlayer(id.owner).getArmy(id.location, id.unitType);
    if (!army) throw new InputError(`no ${id.unitType} army of ${id.owner} at ${id.location}`);
    return army;
  }

  private findPlayer(name: string): Player {
    const player = this.game.allPlayers.find(player => player.name === name);
    if (!player) throw new InputError(`unknown player: ${name}`);
    return player;
  }

  private selectUnits(army: Army, selections: UnitSelection[]): Unit[] {
    const units: Unit[] = [];
    for (const {currentHealth, remainingMoves, canAttack, count} of selections) {
      const candidates = army.units.filter(unit => unit.currentHealth === currentHealth && unit.remainingMoves === remainingMoves && unit.canAttack === canAttack);
      if (candidates.length < count) {
        throw new InputError(`fewer than ${count} units with health ${currentHealth}, moves ${remainingMoves} and canAttack ${canAttack} in the army`);
      }
      units.push(...candidates.slice(0, count));
    }
    return units;
  }
}

export interface ArmyId {
  owner: string;
  location: string;
  unitType: UnitType;
}

export interface UnitSelection {
  currentHealth: number;
  remainingMoves: number;
  canAttack: boolean;
  count: number;
}

export default GameAPI;
