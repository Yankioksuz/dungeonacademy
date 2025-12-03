import type { CombatEnemy } from '@/types';

// Import all enemy JSON files under content/enemies
const enemyModules = import.meta.glob('@/content/enemies/*.json', { eager: true, import: 'default' });

const enemyMap: Record<string, CombatEnemy> = {};

Object.values(enemyModules).forEach((entry) => {
  const enemy = entry as CombatEnemy & { hitPoints: number };
  if (!enemy?.id) return;
  enemyMap[enemy.id] = {
    id: enemy.id,
    name: enemy.name,
    currentHp: enemy.hitPoints,
    maxHp: enemy.hitPoints,
    temporaryHp: 0,
    armorClass: enemy.armorClass,
    attackBonus: enemy.attackBonus,
    damage: enemy.damage,
    damageType: enemy.damageType,
    creatureType: enemy.creatureType,
    effectType: enemy.effectType as CombatEnemy['effectType'],
    saveDC: enemy.saveDC,
    traits: enemy.traits,
    size: enemy.size,
    alignment: enemy.alignment,
    speed: enemy.speed,
    abilityScores: enemy.abilityScores,
    savingThrows: enemy.savingThrows,
    skills: enemy.skills,
    senses: enemy.senses,
    languages: enemy.languages,
    damageResistances: enemy.damageResistances,
    damageImmunities: enemy.damageImmunities,
    damageVulnerabilities: enemy.damageVulnerabilities,
    conditionImmunities: enemy.conditionImmunities,
    challenge: enemy.challenge,
    actions: enemy.actions,
    legendaryActions: enemy.legendaryActions,
    initiative: 0,
    isDefeated: false,
    xpReward: enemy.xpReward,
    savingThrowBonus: enemy.savingThrowBonus,
    conditions: [],
    statBlockSource: enemy.statBlockSource,
    statBlockHeading: enemy.statBlockHeading,
    breathDC: enemy.breathDC,
    breathDamage: enemy.breathDamage,
    breathType: enemy.breathType,
  };
});

export const getEnemyById = (id: string): CombatEnemy | null => {
  return enemyMap[id] ? { ...enemyMap[id] } : null;
};

export const mergeEnemyOverride = (base: CombatEnemy, override: Partial<CombatEnemy>): CombatEnemy => {
  return { ...base, ...override };
};
