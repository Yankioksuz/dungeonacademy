/**
 * Subclass Features - Combat mechanics for all subclass abilities
 * This file provides helper functions to check and apply subclass features during combat.
 */

import type { PlayerCharacter, ConditionType } from '@/types';

// Types for subclass feature effects
export interface SubclassFeatureResult {
    applies: boolean;
    description?: string;
    damage?: number;
    damageType?: string;
    tempHp?: number;
    healing?: number;
    acBonus?: number;
    attackBonus?: number;
    advantageOnAttack?: boolean;
    disadvantageOnAttack?: boolean;
    extraAttack?: boolean;
    conditionToApply?: { type: ConditionType; duration: number; source: string };
}

// ============================================
// PASSIVE FEATURE CHECKS
// ============================================

/**
 * Get the critical hit threshold for a character (Champion's Improved Critical)
 */
export function getCritThreshold(character: PlayerCharacter): number {
    const subclassId = character.subclass?.id;
    const level = character.level || 1;

    if (subclassId === 'champion') {
        if (level >= 15) return 18; // Superior Critical
        if (level >= 3) return 19;  // Improved Critical
    }

    return 20; // Default
}

/**
 * Check if character has Draconic Resilience (Sorcerer - Draconic)
 */
export function hasDraconicResilience(character: PlayerCharacter): boolean {
    return character.class?.id === 'sorcerer' && character.subclass?.id === 'draconic';
}

/**
 * Get unarmored AC bonus from subclass
 */
export function getSubclassUnarmoredAC(character: PlayerCharacter): number | null {
    if (hasDraconicResilience(character)) {
        const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
        return 13 + dexMod; // Draconic Resilience: 13 + DEX
    }
    return null;
}

// ============================================
// BARBARIAN SUBCLASS FEATURES
// ============================================

/**
 * Apply Berserker's Frenzy (bonus action attack while raging)
 */
export function canUseFrenzy(character: PlayerCharacter, isRaging: boolean): boolean {
    return (
        character.subclass?.id === 'berserker' &&
        isRaging &&
        (character.level || 1) >= 3
    );
}

/**
 * Apply Totem Warrior (Bear) resistance - all damage except psychic while raging
 */
export function getTotemBearResistance(character: PlayerCharacter, isRaging: boolean, damageType: string): boolean {
    if (character.subclass?.id === 'totem-warrior' && isRaging && (character.level || 1) >= 3) {
        return damageType.toLowerCase() !== 'psychic';
    }
    return false;
}

/**
 * Ancestral Protectors - first enemy hit gets debuffed
 */
export function canUseAncestralProtectors(character: PlayerCharacter, isRaging: boolean): boolean {
    return (
        character.subclass?.id === 'ancestral-guardian' &&
        isRaging &&
        (character.level || 1) >= 3
    );
}

/**
 * Spirit Shield (Ancestral Guardian) - reduce damage as reaction
 */
export function getSpiritShieldReduction(character: PlayerCharacter): string {
    const level = character.level || 1;
    if (character.subclass?.id !== 'ancestral-guardian' || level < 6) return '0';
    if (level >= 14) return '4d6';
    if (level >= 10) return '3d6';
    return '2d6';
}

/**
 * Divine Fury (Zealot) - extra damage on first hit while raging
 */
export function getDivineFuryDamage(character: PlayerCharacter, isRaging: boolean): { dice: string; type: string } | null {
    if (character.subclass?.id === 'zealot' && isRaging && (character.level || 1) >= 3) {
        const halfLevel = Math.floor((character.level || 1) / 2);
        return {
            dice: `1d6+${halfLevel}`,
            type: 'radiant' // or 'necrotic' - player choice, default to radiant
        };
    }
    return null;
}

/**
 * Storm Aura damage type and effect
 */
export function getStormAuraEffect(character: PlayerCharacter, auraType: 'desert' | 'sea' | 'tundra'): SubclassFeatureResult {
    if (character.subclass?.id !== 'storm-herald') {
        return { applies: false };
    }

    const level = character.level || 1;

    switch (auraType) {
        case 'desert': {
            const fireDamage = level >= 15 ? 4 : level >= 10 ? 3 : 2;
            return { applies: true, damage: fireDamage, damageType: 'fire', description: 'Storm Aura (Desert)' };
        }
        case 'sea':
            return { applies: true, damage: Math.floor(Math.random() * 6) + 1, damageType: 'lightning', description: 'Storm Aura (Sea)' };
        case 'tundra': {
            const tempHp = level >= 15 ? 4 : level >= 10 ? 3 : 2;
            return { applies: true, tempHp, description: 'Storm Aura (Tundra)' };
        }
        default:
            return { applies: false };
    }
}

// ============================================
// FIGHTER SUBCLASS FEATURES
// ============================================

/**
 * Check for Champion's Remarkable Athlete
 */
export function getRemarkableAthleteBonus(character: PlayerCharacter): number {
    if (character.subclass?.id === 'champion' && (character.level || 1) >= 7) {
        return Math.ceil((character.proficiencyBonus || 2) / 2);
    }
    return 0;
}

/**
 * Eldritch Knight - War Magic (attack as bonus action after cantrip)
 */
export function canUseWarMagic(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'eldritch-knight' && (character.level || 1) >= 7;
}

/**
 * Samurai - Fighting Spirit (advantage + temp HP)
 */
export function getFightingSpiritEffect(character: PlayerCharacter): SubclassFeatureResult {
    if (character.subclass?.id !== 'samurai' || (character.level || 1) < 3) {
        return { applies: false };
    }

    const level = character.level || 1;
    const tempHp = level >= 15 ? 15 : level >= 10 ? 10 : 5;

    return {
        applies: true,
        advantageOnAttack: true,
        tempHp,
        description: 'Fighting Spirit: advantage on attacks + temporary HP'
    };
}

/**
 * Battle Master - get superiority dice
 */
export function getSuperiorityDice(character: PlayerCharacter): { count: number; die: string } | null {
    if (character.subclass?.id !== 'battle-master') return null;

    const level = character.level || 1;
    let count = 4;
    let die = 'd8';

    if (level >= 15) count = 6;
    else if (level >= 7) count = 5;

    if (level >= 18) die = 'd12';
    else if (level >= 10) die = 'd10';

    return { count, die };
}

// ============================================
// ROGUE SUBCLASS FEATURES
// ============================================

/**
 * Assassinate - advantage on creatures that haven't acted + auto-crit on surprised
 */
export function getAssassinateBonus(character: PlayerCharacter, targetHasActed: boolean, targetIsSurprised: boolean): SubclassFeatureResult {
    if (character.subclass?.id !== 'assassin' || (character.level || 1) < 3) {
        return { applies: false };
    }

    return {
        applies: true,
        advantageOnAttack: !targetHasActed,
        description: targetIsSurprised ? 'Assassinate: Auto-critical hit!' : 'Assassinate: Advantage on attack'
    };
}

/**
 * Swashbuckler - Rakish Audacity (sneak attack when solo + CHA to initiative)
 */
export function getRakishAudacityBonus(character: PlayerCharacter): { initiativeBonus: number; soloSneakAttack: boolean } | null {
    if (character.subclass?.id !== 'swashbuckler' || (character.level || 1) < 3) return null;

    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    return {
        initiativeBonus: chaMod,
        soloSneakAttack: true // Can sneak attack without ally adjacent
    };
}

/**
 * Fancy Footwork - no opportunity attacks after melee attack
 */
export function hasFancyFootwork(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'swashbuckler' && (character.level || 1) >= 3;
}

/**
 * Scout - Skirmisher reaction movement
 */
export function canUseSkirmisher(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'scout' && (character.level || 1) >= 3;
}

/**
 * Arcane Trickster - Magical Ambush (disadvantage on saves when hidden)
 */
export function hasMagicalAmbush(character: PlayerCharacter, isHidden: boolean): boolean {
    return (
        character.subclass?.id === 'arcane-trickster' &&
        (character.level || 1) >= 9 &&
        isHidden
    );
}

// ============================================
// WIZARD SUBCLASS FEATURES
// ============================================

/**
 * Portent (Divination) - get portent dice rolls
 */
export function getPortentDiceCount(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'divination') return 0;
    const level = character.level || 1;
    if (level >= 14) return 3; // Greater Portent
    if (level >= 2) return 2;  // Portent
    return 0;
}

/**
 * Sculpt Spells (Evocation) - protect allies from AoE
 */
export function canSculptSpells(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'evocation' && (character.level || 1) >= 2;
}

/**
 * Grim Harvest (Necromancy) - heal on spell kill
 */
export function getGrimHarvestHealing(character: PlayerCharacter, spellLevel: number, isNecromancy: boolean): number {
    if (character.subclass?.id !== 'necromancy' || (character.level || 1) < 2) return 0;
    return isNecromancy ? spellLevel * 3 : spellLevel * 2;
}

/**
 * Arcane Ward (Abjuration) - magical HP shield
 */
export function getArcaneWardMaxHP(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'abjuration' || (character.level || 1) < 2) return 0;
    const wizLevel = character.level || 1;
    const intMod = Math.floor((character.abilityScores.intelligence - 10) / 2);
    return (wizLevel * 2) + intMod;
}

/**
 * Illusory Self (Illusion) - auto-dodge an attack
 */
export function canUseIllusorySelf(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'illusion' && (character.level || 1) >= 10;
}

// ============================================
// CLERIC SUBCLASS FEATURES
// ============================================

/**
 * Disciple of Life - bonus healing on spells
 */
export function getDiscipleOfLifeBonus(character: PlayerCharacter, spellLevel: number): number {
    if (character.subclass?.id !== 'life' || (character.level || 1) < 1) return 0;
    return 2 + spellLevel;
}

/**
 * War Priest - bonus action attack uses
 */
export function getWarPriestUses(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'war' || (character.level || 1) < 1) return 0;
    const wisMod = Math.floor((character.abilityScores.wisdom - 10) / 2);
    return Math.max(1, wisMod);
}

/**
 * Warding Flare (Light) - impose disadvantage on attack
 */
export function getWardingFlareUses(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'light' || (character.level || 1) < 1) return 0;
    const wisMod = Math.floor((character.abilityScores.wisdom - 10) / 2);
    return Math.max(1, wisMod);
}

/**
 * Wrath of the Storm (Tempest) - reaction damage when hit
 */
export function getWrathOfTheStormDamage(): { dice: string; type: string } {
    return { dice: '2d8', type: 'lightning' }; // or thunder, player choice
}

/**
 * Destructive Wrath (Tempest) - maximize thunder/lightning damage
 */
export function canUseDestructiveWrath(character: PlayerCharacter, damageType: string): boolean {
    if (character.subclass?.id !== 'tempest' || (character.level || 1) < 2) return false;
    return damageType === 'lightning' || damageType === 'thunder';
}

/**
 * Blessings of Knowledge - expertise in knowledge skills
 */
export function getKnowledgeExpertiseSkills(): string[] {
    return ['arcana', 'history', 'nature', 'religion']; // Choose 2
}

// ============================================
// PALADIN SUBCLASS FEATURES
// ============================================

/**
 * Sacred Weapon (Devotion) - add CHA to attack rolls
 */
export function getSacredWeaponBonus(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'devotion') return 0;
    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    return Math.max(1, chaMod);
}

/**
 * Vow of Enmity (Vengeance) - advantage against one target
 */
export function canUseVowOfEnmity(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'vengeance' && (character.level || 1) >= 3;
}

/**
 * Aura of Warding (Ancients) - spell damage resistance
 */
export function hasAuraOfWarding(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'ancients' && (character.level || 1) >= 7;
}

/**
 * Conquering Presence - frighten enemies in 30ft
 */
export function canUseConqueringPresence(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'conquest' && (character.level || 1) >= 3;
}

/**
 * Aura of Conquest - frightened enemies have 0 speed and take psychic damage
 */
export function getAuraOfConquestDamage(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'conquest' || (character.level || 1) < 7) return 0;
    return Math.floor((character.level || 1) / 2);
}

// ============================================
// RANGER SUBCLASS FEATURES
// ============================================

/**
 * Colossus Slayer (Hunter) - extra 1d8 damage
 */
export function getColossusSlayerDamage(character: PlayerCharacter, targetBelowMax: boolean): string | null {
    if (character.subclass?.id !== 'hunter' || (character.level || 1) < 3) return null;
    return targetBelowMax ? '1d8' : null;
}

/**
 * Dread Ambusher (Gloom Stalker) - first turn bonus attack + damage
 */
export function getDreadAmbusherBonus(character: PlayerCharacter, isFirstTurn: boolean): SubclassFeatureResult {
    if (character.subclass?.id !== 'gloom-stalker' || (character.level || 1) < 3 || !isFirstTurn) {
        return { applies: false };
    }

    return {
        applies: true,
        extraAttack: true,
        damage: Math.floor(Math.random() * 8) + 1, // 1d8 extra on hit
        description: 'Dread Ambusher: Extra attack + 1d8 damage on first turn'
    };
}

/**
 * Planar Warrior (Horizon Walker) - force damage bonus
 */
export function getPlanarWarriorDamage(character: PlayerCharacter): string {
    if (character.subclass?.id !== 'horizon-walker') return '0';
    const level = character.level || 1;
    return level >= 11 ? '2d8' : '1d8';
}

// ============================================
// MONK SUBCLASS FEATURES
// ============================================

/**
 * Open Hand Technique - Flurry of Blows effects
 */
export type OpenHandEffect = 'prone' | 'push' | 'no-reactions';
export function canUseOpenHandTechnique(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'open-hand' && (character.level || 1) >= 3;
}

/**
 * Shadow Arts - spend ki for shadow spells
 */
export function canUseShadowArts(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'shadow' && (character.level || 1) >= 3;
}

/**
 * Drunken Technique - Disengage on Flurry + speed boost
 */
export function hasDrunkenTechnique(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'drunken-master' && (character.level || 1) >= 3;
}

/**
 * Kensei Weapons - AC bonus when attacking with melee
 */
export function getKenseiACBonus(character: PlayerCharacter, madeUnarmedStrike: boolean): number {
    if (character.subclass?.id !== 'kensei' || (character.level || 1) < 3) return 0;
    return madeUnarmedStrike ? 2 : 0;
}

// ============================================
// DRUID SUBCLASS FEATURES
// ============================================

/**
 * Combat Wild Shape (Moon) - bonus action transform + heal
 */
export function hasCombatWildShape(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'moon' && (character.level || 1) >= 2;
}

/**
 * Natural Recovery (Land) - restore spell slots on short rest
 */
export function getNaturalRecoverySlots(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'land' || (character.level || 1) < 2) return 0;
    return Math.ceil((character.level || 1) / 2);
}

/**
 * Halo of Spores (Spores) - reaction necrotic damage
 */
export function getHaloOfSporesDamage(character: PlayerCharacter): string {
    if (character.subclass?.id !== 'spores') return '0';
    const level = character.level || 1;
    if (level >= 14) return '1d10';
    if (level >= 10) return '1d8';
    if (level >= 6) return '1d6';
    return '1d4';
}

/**
 * Spirit Totem (Shepherd) - summon spirit aura
 */
export type TotemType = 'bear' | 'hawk' | 'unicorn';
export function getSpiritTotemEffect(character: PlayerCharacter, totemType: TotemType): SubclassFeatureResult {
    if (character.subclass?.id !== 'shepherd' || (character.level || 1) < 2) {
        return { applies: false };
    }

    const level = character.level || 1;

    switch (totemType) {
        case 'bear':
            return { applies: true, tempHp: 5 + level, description: 'Bear Spirit: Temporary HP to allies' };
        case 'hawk':
            return { applies: true, advantageOnAttack: true, description: 'Hawk Spirit: Advantage on attacks vs targets in aura' };
        case 'unicorn':
            return { applies: true, healing: level, description: 'Unicorn Spirit: Bonus healing in aura' };
        default:
            return { applies: false };
    }
}

// ============================================
// BARD SUBCLASS FEATURES
// ============================================

/**
 * Cutting Words (Lore) - subtract inspiration die from enemy roll
 */
export function canUseCuttingWords(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'lore' && (character.level || 1) >= 3;
}

/**
 * Combat Inspiration (Valor) - add to damage or AC
 */
export function hasCombatInspiration(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'valor' && (character.level || 1) >= 3;
}

/**
 * Blade Flourish (Swords) - special attack options
 */
export type BladeFlourish = 'defensive' | 'slashing' | 'mobile';
export function canUseBladeFlourish(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'swords' && (character.level || 1) >= 3;
}

/**
 * Psychic Blades (Whispers) - extra psychic damage
 */
export function getPsychicBladesDamage(character: PlayerCharacter): string {
    if (character.subclass?.id !== 'whispers') return '0';
    const level = character.level || 1;
    if (level >= 15) return '8d6';
    if (level >= 10) return '5d6';
    if (level >= 5) return '3d6';
    return '2d6';
}

// ============================================
// SORCERER SUBCLASS FEATURES
// ============================================

/**
 * Tides of Chaos (Wild Magic) - advantage on demand
 */
export function canUseTidesOfChaos(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'wild-magic' && (character.level || 1) >= 1;
}

/**
 * Strength of the Grave (Shadow) - avoid death
 */
export function canUseStrengthOfTheGrave(character: PlayerCharacter, damageType: string, isCrit: boolean): boolean {
    if (character.subclass?.id !== 'shadow-magic') return false;
    if (damageType === 'radiant' || isCrit) return false;
    return true;
}

/**
 * Favored by the Gods (Divine Soul) - +2d4 to failed roll
 */
export function canUseFavoredByTheGods(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'divine-soul' && (character.level || 1) >= 1;
}

/**
 * Divine Magic (Divine Soul) - access to cleric spells
 */
export function hasDivineMagic(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'divine-soul';
}

// ============================================
// WARLOCK SUBCLASS FEATURES
// ============================================

/**
 * Dark One's Blessing (Fiend) - temp HP on kill
 */
export function getDarkOnesBlessingTempHP(character: PlayerCharacter): number {
    if (character.subclass?.id !== 'fiend') return 0;
    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    return chaMod + (character.level || 1);
}

/**
 * Fey Presence (Archfey) - charm/frighten in cube
 */
export function canUseFeyPresence(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'archfey' && (character.level || 1) >= 1;
}

/**
 * Awakened Mind (Great Old One) - telepathy
 */
export function hasAwakenedMind(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'great-old-one';
}

/**
 * Entropic Ward (Great Old One) - disadvantage on attack, gain advantage if miss
 */
export function canUseEntropicWard(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'great-old-one' && (character.level || 1) >= 6;
}

/**
 * Healing Light (Celestial) - healing pool
 */
export function getHealingLightPool(character: PlayerCharacter): { diceCount: number; maxDicePerUse: number } | null {
    if (character.subclass?.id !== 'celestial') return null;
    const level = character.level || 1;
    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    return {
        diceCount: 1 + level,
        maxDicePerUse: Math.max(1, chaMod)
    };
}

/**
 * Hexblade's Curse - bonus damage, crit on 19-20, heal on kill
 */
export function getHexbladeCurseEffects(character: PlayerCharacter): {
    damageBonus: number;
    critThreshold: number;
    healingOnKill: number
} | null {
    if (character.subclass?.id !== 'hexblade') return null;
    const profBonus = character.proficiencyBonus || 2;
    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);

    return {
        damageBonus: profBonus,
        critThreshold: 19,
        healingOnKill: (character.level || 1) + chaMod
    };
}

/**
 * Hex Warrior - use CHA for weapon attacks
 */
export function hasHexWarrior(character: PlayerCharacter): boolean {
    return character.subclass?.id === 'hexblade' && (character.level || 1) >= 1;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all active subclass features for a character
 */
export function getActiveSubclassFeatures(character: PlayerCharacter): string[] {
    const features: string[] = [];
    const subclassId = character.subclass?.id;
    const level = character.level || 1;

    if (!subclassId) return features;

    // Add detected features based on subclass and level
    const subclassFeatures = character.subclass?.features || [];

    for (const feature of subclassFeatures) {
        if (feature.level <= level) {
            features.push(feature.id);
        }
    }

    return features;
}

/**
 * Check if character has a specific subclass feature
 */
export function hasSubclassFeature(character: PlayerCharacter, featureId: string): boolean {
    return getActiveSubclassFeatures(character).includes(featureId);
}
