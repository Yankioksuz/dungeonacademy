import type { PlayerCharacter, FeatureUses } from '@/types';

export const getDefaultFeatureUses = (character: PlayerCharacter): FeatureUses => {
  const className = character.class.name.toLowerCase();
  const charismaMod = Math.floor((character.abilityScores.charisma - 10) / 2);

  return {
    actionSurge: className === 'fighter',
    secondWind: className === 'fighter',
    bardicInspiration: className === 'bard' ? Math.max(1, charismaMod) : 0,
    rage: className === 'barbarian' ? 2 : 0,
    channelDivinity: className === 'cleric' ? 1 : 0,
    layOnHands: className === 'paladin' ? character.level * 5 : 0,
    kiPoints: className === 'monk' ? character.level : 0,
    wildShape: className === 'druid' ? 2 : 0,
    sorceryPoints: className === 'sorcerer' ? character.level : 0,
  };
};

export const restoreShortRestUses = (character: PlayerCharacter, current?: FeatureUses): FeatureUses => {
  const defaults = getDefaultFeatureUses(character);
  const existing = current || defaults;
  const level = character.level || 1;
  return {
    ...existing,
    actionSurge: defaults.actionSurge,
    secondWind: defaults.secondWind,
    bardicInspiration: level >= 5 ? defaults.bardicInspiration : existing.bardicInspiration,
    channelDivinity: defaults.channelDivinity,
    kiPoints: defaults.kiPoints,
    wildShape: defaults.wildShape,
  };
};

export const restoreLongRestUses = (character: PlayerCharacter): FeatureUses => {
  return getDefaultFeatureUses(character);
};
