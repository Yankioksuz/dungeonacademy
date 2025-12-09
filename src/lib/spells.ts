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

export const getSpellHealing = (
  spell: SpellContent,
  slotLevel: number,
  character?: PlayerCharacter
): number => {
  // Disciple of Life (Life Domain Cleric)
  // "Whenever you use a spell of 1st level or higher to restore hit points to a creature, the creature regains additional hit points equal to 2 + the spell's level."
  let bonus = 0;
  if (character && character.subclass?.id === 'life' && slotLevel > 0 && spell.healing) {
    bonus = 2 + slotLevel;
  }
  return bonus;
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

export const calculateSpellSlots = (className: string, level: number): Record<number, { current: number; max: number }> => {
  const cls = className.toLowerCase();
  const slots: Record<number, { current: number; max: number }> = {};

  // Warlock: Pact Magic (Fixed slots, always max level)
  if (cls.includes('warlock')) {
    const slotCount = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
    const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;

    // Warlocks only get slots of one specific level (Slot Level)
    slots[slotLevel] = { current: slotCount, max: slotCount };
    return slots;
  }

  // Standard Spellcasting Progression
  // Full Casters: Bard, Cleric, Druid, Sorcerer, Wizard
  // Half Casters: Paladin, Ranger (Level / 2, rounded down?) -> Paladin/Ranger start at lvl 2
  // Third Casters: Rogue (Arcane Trickster), Fighter (Eldritch Knight) -> Level / 3

  let effectiveLevel = 0;
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].some(c => cls.includes(c))) {
    effectiveLevel = level;
  } else if (['paladin', 'ranger'].some(c => cls.includes(c))) {
    effectiveLevel = Math.floor(level / 2);
  } else if (['rogue', 'fighter'].some(c => cls.includes(c))) {
    // Assuming subclasses might be checked later, for now treating base classes as non-casters or 1/3 if they have spellcasting feature 
    // Simplified: If they have 'Spellcasting' feature. For MVP, assuming they don't get slots unless subclass selected (not implemented).
    // But let's support them if they somehow have slots:
    effectiveLevel = Math.floor(level / 3);
  }

  if (effectiveLevel < 1) return {};

  // Standard Table (Level 1-20)
  // Lvl: 1  2  3  4  5  6  7  8  9
  const table: Record<number, number[]> = {
    1: [2],
    2: [3],
    3: [4, 2],
    4: [4, 3],
    5: [4, 3, 2],
    6: [4, 3, 3],
    7: [4, 3, 3, 1],
    8: [4, 3, 3, 2],
    9: [4, 3, 3, 3, 1],
    10: [4, 3, 3, 3, 2],
    11: [4, 3, 3, 3, 2, 1],
    12: [4, 3, 3, 3, 2, 1],
    13: [4, 3, 3, 3, 2, 1, 1],
    14: [4, 3, 3, 3, 2, 1, 1],
    15: [4, 3, 3, 3, 2, 1, 1, 1],
    16: [4, 3, 3, 3, 2, 1, 1, 1],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  };

  const progression = table[Math.min(20, Math.max(1, effectiveLevel))];
  if (progression) {
    progression.forEach((count, idx) => {
      if (count > 0) {
        slots[idx + 1] = { current: count, max: count };
      }
    });
  }

  return slots;
};
