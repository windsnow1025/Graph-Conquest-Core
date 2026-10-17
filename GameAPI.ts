import GameSystem, {type GameData, type GameSave} from "./GameSystem";
import type {GameConfig} from "./Config.ts";

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

  getState(): GameData {
    return this.game;
  }
}

export default GameAPI;
