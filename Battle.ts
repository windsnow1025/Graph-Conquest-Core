import type Army from "./Army";
import type Player from "./Player";
import type Graph from "./Graph";
import { armyAttackArmy, calculateUnitsNeeded } from "./Combat";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export enum BattlePhase {
  AttackerTurn = "attacker_turn",
  DefenderTurn = "defender_turn",
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export enum BattleResult {
  Ongoing = "ongoing",
  AttackerWins = "attacker_wins",
  DefenderWins = "defender_wins",
  Retreat = "retreat",
  Draw = "draw",
}

class Battle {
  // Config
  public targetLocation: string;
  public graph: Graph;
  public maxArmyAttacks: number;

  // Participants
  public attackerPlayer: Player;
  public defenderPlayer: Player;
  public attackerArmies: Army[];
  public defenderArmies: Army[];

  // State
  public round: number;
  public phase: BattlePhase;
  public result: BattleResult;
  public actedArmies: Set<Army>;
  public remainingAttacks: Map<Army, number>;

  constructor(
    targetLocation: string,
    attackerPlayer: Player,
    defenderPlayer: Player,
    attackerArmies: Army[],
    graph: Graph,
    maxArmyAttacks: number,
  ) {
    // Config
    this.targetLocation = targetLocation;
    this.graph = graph;
    this.maxArmyAttacks = maxArmyAttacks;

    // Participants
    this.attackerPlayer = attackerPlayer;
    this.defenderPlayer = defenderPlayer;
    this.attackerArmies = [...attackerArmies];
    this.defenderArmies = defenderPlayer.armies.filter(
      (army) => army.location === targetLocation,
    );

    // State
    this.round = 1;
    this.phase = BattlePhase.AttackerTurn;
    this.result = BattleResult.Ongoing;
    this.actedArmies = new Set();
    this.remainingAttacks = new Map(
      this.allArmies.map(
        (army): [Army, number] => [army, maxArmyAttacks],
      ),
    );
  }

  get allArmies(): Army[] {
    return [...this.attackerArmies, ...this.defenderArmies];
  }

  get currentArmies(): Army[] {
    return this.phase === BattlePhase.AttackerTurn
      ? this.attackerArmies
      : this.defenderArmies;
  }

  get unactedArmies(): Army[] {
    return this.currentArmies.filter((army) => !this.actedArmies.has(army));
  }

  get hasActableArmies(): boolean {
    return this.currentArmies.some((army) => this.canAct(army));
  }

  getRemainingAttacks(army: Army): number {
    return this.remainingAttacks.get(army)!;
  }

  canAct(army: Army): boolean {
    if (this.result !== BattleResult.Ongoing) return false;
    if (this.actedArmies.has(army)) return false;
    if (!this.currentArmies.includes(army)) return false;
    return this.canStillAttack(army);
  }

  getTargetsInRange(army: Army): Army[] {
    if (this.attackerArmies.includes(army)) {
      const distance = this.graph.getDistance(
        army.location,
        this.targetLocation,
      )!;
      if (army.unitStats.range >= distance) {
        return this.defenderArmies;
      }
      return [];
    } else if (this.defenderArmies.includes(army)) {
      return this.attackerArmies.filter((attackerArmy) => {
        const distance = this.graph.getDistance(
          this.targetLocation,
          attackerArmy.location,
        )!;
        return army.unitStats.range >= distance;
      });
    } else {
      return [];
    }
  }

  getUnitsNeeded(attackerArmy: Army, targetArmy: Army): number {
    return calculateUnitsNeeded(attackerArmy, targetArmy);
  }

  allocateAttack(army: Army, allocations: Map<Army, number>): boolean {
    if (!this.canAct(army)) return false;

    const targetsInRange = this.getTargetsInRange(army);
    let totalAllocated = 0;
    for (const [target, unitCount] of allocations) {
      if (unitCount <= 0 || !targetsInRange.includes(target)) return false;
      totalAllocated += unitCount;
    }
    if (totalAllocated > army.units.length) return false;

    for (const [target, unitCount] of allocations) {
      armyAttackArmy(army, target, unitCount);
    }

    this.actedArmies.add(army);
    this.remainingAttacks.set(army, this.getRemainingAttacks(army) - 1);
    this.cleanupDeadArmies();
    this.checkBattleEnd();
    if (this.result === BattleResult.Ongoing && !this.hasActableArmies) {
      this.endPhase();
    }
    return true;
  }

  retreat(): boolean {
    if (this.result !== BattleResult.Ongoing) return false;
    if (this.phase !== BattlePhase.AttackerTurn) return false;
    if (this.actedArmies.size > 0) return false;

    this.result = BattleResult.Retreat;
    return true;
  }

  executeNeutralDefenderTurn(): boolean {
    if (this.result !== BattleResult.Ongoing) return false;
    if (this.phase !== BattlePhase.DefenderTurn) return false;

    function findHighestHpArmy(armies: Army[]): Army {
      let target = armies[0];
      let maxHp = 0;
      for (const unit of target.units) {
        maxHp += unit.currentHealth;
      }

      for (const candidate of armies) {
        let candidateHp = 0;
        for (const unit of candidate.units) {
          candidateHp += unit.currentHealth;
        }
        if (candidateHp > maxHp) {
          target = candidate;
          maxHp = candidateHp;
        }
      }
      return target;
    }

    for (const army of this.unactedArmies) {
      const targets = this.getTargetsInRange(army);
      if (targets.length === 0) continue;
      const target = findHighestHpArmy(targets);

      this.allocateAttack(army, new Map([[target, army.units.length]]));
      if (this.result !== BattleResult.Ongoing) return true;
    }
    return true;
  }

  private canStillAttack(army: Army): boolean {
    return this.getRemainingAttacks(army) > 0 && this.getTargetsInRange(army).length > 0;
  }

  private cleanupDeadArmies(): void {
    this.attackerArmies = this.attackerArmies.filter(
      (army) => army.units.length > 0,
    );
    this.defenderArmies = this.defenderArmies.filter(
      (army) => army.units.length > 0,
    );
  }

  private checkBattleEnd(): void {
    const attackersAlive = this.attackerArmies.length > 0;
    const defendersAlive = this.defenderArmies.length > 0;

    if (!defendersAlive) {
      this.result = BattleResult.AttackerWins;
    } else if (!attackersAlive) {
      this.result = BattleResult.DefenderWins;
    }
  }

  private endPhase(): void {
    this.actedArmies.clear();

    if (!this.allArmies.some((army) => this.canStillAttack(army))) {
      this.result = BattleResult.Draw;
      return;
    }

    if (this.phase === BattlePhase.AttackerTurn) {
      this.phase = BattlePhase.DefenderTurn;
    } else {
      this.round++;
      this.phase = BattlePhase.AttackerTurn;
    }

    if (!this.hasActableArmies) {
      this.endPhase();
    }
  }

  toJSON(): BattleSave {
    return {
      targetLocation: this.targetLocation,
      attackerPlayer: this.attackerPlayer.name,
      defenderPlayer: this.defenderPlayer.name,
      attackerArmies: this.attackerArmies.map((a) => this.attackerPlayer.armies.indexOf(a)),
      defenderArmies: this.defenderArmies.map((a) => this.defenderPlayer.armies.indexOf(a)),
      round: this.round,
      phase: this.phase,
      result: this.result,
      actedAttackerArmies: this.attackerArmies
        .filter((a) => this.actedArmies.has(a))
        .map((a) => this.attackerPlayer.armies.indexOf(a)),
      actedDefenderArmies: this.defenderArmies
        .filter((a) => this.actedArmies.has(a))
        .map((a) => this.defenderPlayer.armies.indexOf(a)),
      attackerRemainingAttacks: this.attackerArmies.map((a) => this.getRemainingAttacks(a)),
      defenderRemainingAttacks: this.defenderArmies.map((a) => this.getRemainingAttacks(a)),
    };
  }

  static fromJSON(
    json: BattleSave,
    players: Player[],
    graph: Graph,
    maxArmyAttacks: number,
  ): Battle {
    const attackerPlayer = players.find((p) => p.name === json.attackerPlayer)!;
    const defenderPlayer = players.find((p) => p.name === json.defenderPlayer)!;
    const battle = new Battle(
      json.targetLocation,
      attackerPlayer,
      defenderPlayer,
      json.attackerArmies.map((i) => attackerPlayer.armies[i]),
      graph,
      maxArmyAttacks,
    );
    battle.defenderArmies = json.defenderArmies.map((i) => defenderPlayer.armies[i]);
    battle.round = json.round;
    battle.phase = json.phase;
    battle.result = json.result;
    battle.actedArmies = new Set([
      ...json.actedAttackerArmies.map((i) => attackerPlayer.armies[i]),
      ...json.actedDefenderArmies.map((i) => defenderPlayer.armies[i]),
    ]);
    battle.remainingAttacks = new Map([
      ...battle.attackerArmies.map((a, i): [Army, number] => [a, json.attackerRemainingAttacks[i]]),
      ...battle.defenderArmies.map((a, i): [Army, number] => [a, json.defenderRemainingAttacks[i]]),
    ]);
    return battle;
  }
}

export interface BattleSave {
  targetLocation: string;
  attackerPlayer: string;
  defenderPlayer: string;
  attackerArmies: number[];
  defenderArmies: number[];
  round: number;
  phase: BattlePhase;
  result: BattleResult;
  actedAttackerArmies: number[];
  actedDefenderArmies: number[];
  attackerRemainingAttacks: number[];
  defenderRemainingAttacks: number[];
}

export default Battle;
