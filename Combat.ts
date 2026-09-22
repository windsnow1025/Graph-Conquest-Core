import type Unit from "./Unit";
import type Army from "./Army";

export function armyAttackArmy(
  attackerArmy: Army, targetArmy: Army, unitCount: number
): void {
  const attackerUnits = attackerArmy.battleUnits;
  for (let i = 0; i < unitCount; i++) {
    if (targetArmy.battleUnits.length === 0) break;
    const attackerUnit = attackerUnits[i];
    const defenderUnit = findWeakestUnit(targetArmy);
    unitAttack(attackerUnit, defenderUnit);
    targetArmy.removeDeadUnits();
  }
}

export function calculateUnitsNeeded(
  attackerArmy: Army, targetArmy: Army
): number {
  const damage = Math.max(1, attackerArmy.unitStats.attack - targetArmy.unitStats.defend);
  let total = 0;
  for (const unit of targetArmy.battleUnits) {
    total += Math.ceil(unit.currentHealth / damage);
  }
  return total;
}

export function findWeakestUnit(army: Army): Unit {
  const battleUnits = army.battleUnits;
  return battleUnits.reduce((weakest, unit) => {
    const currentHealthRatio = unit.currentHealth / unit.health;
    const weakestHealthRatio = weakest.currentHealth / weakest.health;
    return currentHealthRatio < weakestHealthRatio ? unit : weakest;
  }, battleUnits[0]);
}

function unitAttack(attackerUnit: Unit, defenderUnit: Unit): void {
  defenderUnit.currentHealth -= Math.max(1, attackerUnit.attack - defenderUnit.defend);
}
