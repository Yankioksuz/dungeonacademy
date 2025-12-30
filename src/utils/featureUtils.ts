import type { PlayerCharacter, FeatureUses } from '@/types';

export const getDefaultFeatureUses = (character: PlayerCharacter): FeatureUses => {
  const className = character.class?.name?.toLowerCase() || '';
  const subclassId = character.subclass?.id || '';
  const level = character.level || 1;
  const charismaMod = Math.floor((character.abilityScores?.charisma || 10 - 10) / 2);
  const wisdomMod = Math.floor((character.abilityScores?.wisdom || 10 - 10) / 2);

  return {
    // Core class features
    actionSurge: className === 'fighter',
    secondWind: className === 'fighter',
    bardicInspiration: className === 'bard' ? Math.max(1, charismaMod) : 0,
    rage: className === 'barbarian' ? (level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2) : 0,
    channelDivinity: className === 'cleric' || className === 'paladin' ? (level >= 18 ? 3 : level >= 6 ? 2 : 1) : 0,
    layOnHands: className === 'paladin' ? level * 5 : 0,
    kiPoints: className === 'monk' ? level : 0,
    wildShape: className === 'druid' ? 2 : 0,
    sorceryPoints: className === 'sorcerer' ? level : 0,
    luckPoints: (character.feats || []).includes('lucky') ? 3 : 0,

    // Subclass-specific features
    // Fighter
    fightingSpirit: subclassId === 'samurai' ? 3 : 0, // Samurai
    superiorityDice: subclassId === 'battle-master' ? (level >= 15 ? 6 : level >= 7 ? 5 : 4) : 0,

    // Rogue
    masterDuelist: subclassId === 'swashbuckler' && level >= 17 ? 1 : 0,

    // Wizard
    portentDice: subclassId === 'divination' ? (level >= 14 ? 3 : 2) : 0,
    arcaneWardHp: subclassId === 'abjuration' ? (level * 2 + Math.floor((character.abilityScores?.intelligence || 10 - 10) / 2)) : 0,
    illusorySelf: subclassId === 'illusion' && level >= 10 ? 1 : 0,

    // Cleric
    wardingFlare: subclassId === 'light' ? Math.max(1, wisdomMod) : 0,
    wrathOfTheStorm: subclassId === 'tempest' ? Math.max(1, wisdomMod) : 0,

    // Paladin
    vowOfEnmity: subclassId === 'vengeance' ? 1 : 0, // Uses Channel Divinity but tracked separately

    // Ranger - no additional tracking needed (passive features)

    // Monk - ki-based (use kiPoints)

    // Druid
    spiritTotem: subclassId === 'shepherd' ? 1 : 0,

    // Bard - bardic inspiration based (use bardicInspiration)

    // Sorcerer
    tidesOfChaos: subclassId === 'wild-magic' ? 1 : 0,
    favoredByTheGods: subclassId === 'divine-soul' ? 1 : 0,
    houndOfIllOmen: 0, // Costs sorcery points, not uses

    // Warlock
    hexbladesCurse: subclassId === 'hexblade' ? 1 : 0,
    feyPresence: subclassId === 'archfey' ? 1 : 0,
    entropicWard: subclassId === 'great-old-one' && level >= 6 ? 1 : 0,
    healingLightDice: subclassId === 'celestial' ? (1 + level) : 0,
    unbreakableMajesty: subclassId === 'glamour' && level >= 14 ? 1 : 0,

    // Barbarian
    spiritShield: subclassId === 'ancestral-guardian' && level >= 6 ? 999 : 0, // Unlimited while raging

    // Feat-based features
    healerFeatUsed: false,
    inspiringLeaderUsed: false,
  };
};

export const restoreShortRestUses = (character: PlayerCharacter, current?: FeatureUses): FeatureUses => {
  const defaults = getDefaultFeatureUses(character);
  const existing = current || defaults;
  const level = character.level || 1;


  return {
    ...existing,
    // Core class features that restore on short rest
    actionSurge: defaults.actionSurge,
    secondWind: defaults.secondWind,
    bardicInspiration: level >= 5 ? defaults.bardicInspiration : existing.bardicInspiration,
    channelDivinity: defaults.channelDivinity,
    kiPoints: defaults.kiPoints,
    wildShape: defaults.wildShape,
    sorceryPoints: existing.sorceryPoints, // Long rest only
    luckPoints: existing.luckPoints, // Long rest only

    // Subclass features that restore on short rest
    superiorityDice: defaults.superiorityDice,
    spiritTotem: defaults.spiritTotem,
    hexbladesCurse: defaults.hexbladesCurse,
    feyPresence: defaults.feyPresence,
    entropicWard: defaults.entropicWard,
    favoredByTheGods: defaults.favoredByTheGods,
    illusorySelf: defaults.illusorySelf,
    masterDuelist: defaults.masterDuelist,
    unbreakableMajesty: defaults.unbreakableMajesty,

    // Features that DON'T restore on short rest (only long rest)
    fightingSpirit: existing.fightingSpirit,
    portentDice: existing.portentDice,
    arcaneWardHp: existing.arcaneWardHp, // Rebuilt on long rest
    wardingFlare: existing.wardingFlare,
    wrathOfTheStorm: existing.wrathOfTheStorm,
    vowOfEnmity: existing.vowOfEnmity, // Uses channel divinity which does restore
    tidesOfChaos: existing.tidesOfChaos,
    healingLightDice: existing.healingLightDice, // Long rest only
    spiritShield: defaults.spiritShield,

    // Feat-based features reset on short rest
    healerFeatUsed: false,
    inspiringLeaderUsed: false,
  };
};

export const restoreLongRestUses = (character: PlayerCharacter): FeatureUses => {
  return getDefaultFeatureUses(character);
};

