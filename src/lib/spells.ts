import type { PlayerCharacter, SpellContent } from '@/types';

const preparedCasters = new Set(['Cleric', 'Druid', 'Paladin', 'Wizard']);
const ritualCasters = new Set(['Wizard', 'Cleric', 'Druid', 'Bard']);

export const getSpellcastingAbility = (cls: string): keyof PlayerCharacter['abilityScores'] => {
  const name = cls.toLowerCase();
  if (name.includes('wizard')) return 'intelligence';
  if (name.includes('sorcerer') || name.includes('bard') || name.includes('warlock') || name.includes('paladin')) {
    return 'charisma';
  }
  if (name.includes('cleric') || name.includes('druid') || name.includes('ranger')) {
    return 'wisdom';
  }
  return 'intelligence';
};

export const getProficiencyBonus = (level: number) => {
  return Math.max(2, Math.floor((level - 1) / 4) + 2);
};

export const getSpellSaveDC = (character: PlayerCharacter) => {
  const ability = getSpellcastingAbility(character.class.name);
  const abilityMod = Math.floor((character.abilityScores[ability] - 10) / 2);
  return 8 + getProficiencyBonus(character.level) + abilityMod;
};

export const getScaledCantripDamage = (spell: SpellContent, characterLevel: number) => {
  if (spell.level !== 0 || !spell.damage) return spell.damage;
  const { cantripScaling } = spell;
  if (!cantripScaling) return spell.damage;

  if (characterLevel >= 17 && cantripScaling.level17) return cantripScaling.level17;
  if (characterLevel >= 11 && cantripScaling.level11) return cantripScaling.level11;
  if (characterLevel >= 5 && cantripScaling.level5) return cantripScaling.level5;
  return spell.damage;
};

export const getUpcastDamageOrEffect = (spell: SpellContent, slotLevel: number) => {
  if (!spell.damage || slotLevel <= spell.level) return spell.damage;

  const levelsAbove = slotLevel - spell.level;

  if (spell.id === 'fireball') {
    const base = 8 + levelsAbove;
    return `${base}d6`;
  }

  if (spell.id === 'magic-missile') {
    const darts = 3 + levelsAbove;
    return `${darts}d4+${darts}`;
  }

  if (spell.id === 'cure-wounds' || spell.id === 'healing-word') {
    const base = 1 + levelsAbove;
    const die = spell.id === 'cure-wounds' ? 'd8' : 'd4';
    return `${base}${die}`;
  }

  return spell.damage;
};

export const isPreparedCaster = (cls: string) => preparedCasters.has(cls);

export const getMaxPreparedSpells = (character: PlayerCharacter) => {
  if (!isPreparedCaster(character.class.name)) return 0;
  const ability = getSpellcastingAbility(character.class.name);
  const abilityMod = Math.floor((character.abilityScores[ability] - 10) / 2);
  return Math.max(1, abilityMod + character.level);
};

export const getAvailableSlotLevels = (character: PlayerCharacter, spell: SpellContent) => {
  const slots = character.spellSlots || {};
  return Object.entries(slots)
    .filter(([lvl, pool]) => Number(lvl) >= spell.level && pool.current > 0)
    .map(([lvl]) => Number(lvl))
    .sort((a, b) => a - b);
};

export const canRitualCast = (character: PlayerCharacter) => ritualCasters.has(character.class.name);

export const rollConcentrationCheck = (character: PlayerCharacter, damage: number) => {
  const dc = Math.max(10, Math.floor(damage / 2));
  const conMod = Math.floor((character.abilityScores.constitution - 10) / 2);
  const total = Math.floor(Math.random() * 20) + 1 + conMod + getProficiencyBonus(character.level);
  return { dc, total, success: total >= dc };
};

export const shouldCheckScrollUse = (character: PlayerCharacter, spell: SpellContent) => {
  const onList = spell.classes.includes(character.class.name);
  const dc = 10 + spell.level;
  const ability = getSpellcastingAbility(character.class.name);
  const abilityMod = Math.floor((character.abilityScores[ability] - 10) / 2);
  return {
    requiresCheck: !onList && spell.level > 0,
    dc,
    abilityMod,
  };
};
