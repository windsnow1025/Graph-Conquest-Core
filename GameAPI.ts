import GameSystem, {type GameData, type GameSave} from "./GameSystem";
import type Player from "./Player";
import type {UnitType} from "./Unit";
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

  // Resolution

  private findPlayer(name: string): Player {
    const player = this.game.allPlayers.find(player => player.name === name);
    if (!player) throw new InputError(`unknown player: ${name}`);
    return player;
  }
}

export default GameAPI;
