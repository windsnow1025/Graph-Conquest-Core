import GameSystem, {type GameData, type GameSave} from "./GameSystem";
import type Player from "./Player";
import type Army from "./Army";
import type Battle from "./Battle";
import type Unit from "./Unit";
import type {UnitData, UnitType} from "./Unit";
import type {GameConfig} from "./Config.ts";

// Data types
export type {GameData} from "./GameSystem";
export type {GraphData, NodeData} from "./Graph";
export type {PlayerData} from "./Player";
export type {ArmyData} from "./Army";
export type {UnitData, UnitStats, UnitStatsMap, UnitType} from "./Unit";
export type {BattleData} from "./Battle";
export {BattlePhase, BattleResult} from "./Battle";

// Config and save types
export type {GameConfig, PlayerConfig, NeutralGarrison} from "./Config.ts";
export type {GameSave} from "./GameSystem";
export type {GraphJSON, GraphNodeJSON} from "./Graph";
export type {PlayerJSON} from "./Player";
export type {ArmyJSON} from "./Army";
export type {UnitJSON} from "./Unit";
export type {BattleSave} from "./Battle";

export class InputError extends Error {
  name = "InputError";
}

const Exit: ProxyHandler<GameAPI> = {
  get(target, key) {
    const member = Reflect.get(target, key);
    if (typeof member !== "function") return undefined;
    return (...args: unknown[]) => {
      const result: unknown = member.apply(target, args);
      return result instanceof GameAPI ? result : structuredClone(result);
    };
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

  fork(): GameAPI {
    return GameAPI.fromJSON(this.game.toJSON());
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

  getAttackableLocations(): Set<string> {
    return this.game.attackableLocations;
  }

  getArmiesInRange(target: string): ArmyId[] {
    this.checkLocation(target);
    return this.game.getArmiesInRange(target).map(army => this.armyIdOf(army, this.game.currentPlayer));
  }

  hasAttackTargets(armyId: ArmyId): boolean {
    this.checkCurrentOwner(armyId);
    const army = this.findArmy(armyId);
    return this.game.hasAttackTargets(army);
  }

  hasBattle(): boolean {
    return this.game.currentBattle !== null;
  }

  canAct(armyId: ArmyId): boolean {
    const army = this.findArmy(armyId);
    const battle = this.game.currentBattle;
    if (!battle) return false;
    return battle.canAct(army);
  }

  getTargetsInRange(armyId: ArmyId): ArmyId[] {
    const battle = this.findBattle();
    const army = this.findParticipant(armyId, battle);
    const owner = battle.attackerArmies.includes(army) ? battle.defenderPlayer : battle.attackerPlayer;
    return battle.getTargetsInRange(army).map(target => this.armyIdOf(target, owner));
  }

  getUnitsNeeded(armyId: ArmyId, targetId: ArmyId): number {
    const battle = this.findBattle();
    const army = this.findParticipant(armyId, battle);
    const target = this.findParticipant(targetId, battle);
    return battle.getUnitsNeeded(army, target);
  }

  getRemainingAttacks(armyId: ArmyId): number {
    const battle = this.findBattle();
    const army = this.findParticipant(armyId, battle);
    return battle.getRemainingAttacks(army);
  }

  getMoney(player: string): number {
    return this.findPlayer(player).money;
  }

  getNodeIncome(player: string): number {
    return this.game.getNodeIncome(this.findPlayer(player));
  }

  getUpkeep(player: string): number {
    return this.game.getUpkeep(this.findPlayer(player));
  }

  // Commands

  recruit(unitType: UnitType, location: string, count: number): boolean {
    this.checkUnitType(unitType);
    this.checkLocation(location);
    this.checkCount(count);
    return this.game.recruitPlayerArmy(unitType, location, count) !== null;
  }

  moveUnits(armyId: ArmyId, selections: UnitSelection[], destination: string): boolean {
    this.checkCurrentOwner(armyId);
    this.checkSelections(selections);
    this.checkLocation(destination);
    const army = this.findArmy(armyId);
    const units = this.selectUnits(army, selections);
    return this.game.movePlayerUnits(units, destination);
  }

  disbandUnits(armyId: ArmyId, selections: UnitSelection[]): boolean {
    this.checkCurrentOwner(armyId);
    this.checkSelections(selections);
    const army = this.findArmy(armyId);
    const units = this.selectUnits(army, selections);
    return this.game.disbandPlayerUnits(units);
  }

  startBattle(attackers: ArmySelection[], target: string): boolean {
    this.checkAttackers(attackers);
    this.checkLocation(target);
    const units = attackers.flatMap(attacker => this.selectUnits(this.findArmy(attacker.armyId), attacker.selections));
    return this.game.startBattle(units, target) !== null;
  }

  allocateAttack(armyId: ArmyId, allocations: AttackAllocation[]): boolean {
    this.checkAllocations(allocations);
    const battle = this.findBattle();
    const army = this.findParticipant(armyId, battle);
    const counts = new Map(allocations.map(allocation => [this.findParticipant(allocation.targetId, battle), allocation.count]));
    return this.game.allocateAttack(army, counts);
  }

  retreat(): boolean {
    return this.game.retreat();
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

  private checkAttackers(attackers: ArmySelection[]): void {
    const armies = new Set<string>();
    for (const {armyId, selections} of attackers) {
      this.checkCurrentOwner(armyId);
      this.checkSelections(selections);
      const key = `${armyId.location}|${armyId.unitType}`;
      if (armies.has(key)) throw new InputError(`an army is listed twice: ${armyId.unitType} at ${armyId.location}`);
      armies.add(key);
    }
  }

  private checkAllocations(allocations: AttackAllocation[]): void {
    const targets = new Set<string>();
    for (const {targetId, count} of allocations) {
      this.checkCount(count);
      const key = `${targetId.owner}|${targetId.location}|${targetId.unitType}`;
      if (targets.has(key)) throw new InputError(`a target is listed twice: ${targetId.unitType} of ${targetId.owner} at ${targetId.location}`);
      targets.add(key);
    }
  }

  // Resolution

  private findArmy(armyId: ArmyId): Army {
    const army = this.findPlayer(armyId.owner).getArmy(armyId.location, armyId.unitType);
    if (!army) throw new InputError(`no ${armyId.unitType} army of ${armyId.owner} at ${armyId.location}`);
    return army;
  }

  private findBattle(): Battle {
    const battle = this.game.currentBattle;
    if (!battle) throw new InputError("no battle in progress");
    return battle;
  }

  private findParticipant(armyId: ArmyId, battle: Battle): Army {
    const army = this.findArmy(armyId);
    if (!battle.allArmies.includes(army)) throw new InputError(`not in the battle: ${armyId.unitType} of ${armyId.owner} at ${armyId.location}`);
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

  // Identification

  private armyIdOf(army: Army, owner: Player): ArmyId {
    return {owner: owner.name, location: army.location, unitType: army.unitType};
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

export interface ArmySelection {
  armyId: ArmyId;
  selections: UnitSelection[];
}

export interface AttackAllocation {
  targetId: ArmyId;
  count: number;
}

export default GameAPI;
