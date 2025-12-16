import type { PlayerCharacter, SkillName, Skills, AbilityName } from '@/types';
import { getItemSkillBonus } from './itemEffects';

/**
 * Skill to ability mapping for D&D 5e
 */
export const SKILL_ABILITY_MAP: Record<SkillName, AbilityName> = {
    'acrobatics': 'dexterity',
    'animal-handling': 'wisdom',
    'arcana': 'intelligence',
    'athletics': 'strength',
    'deception': 'charisma',
    'history': 'intelligence',
    'insight': 'wisdom',
    'intimidation': 'charisma',
    'investigation': 'intelligence',
    'medicine': 'wisdom',
    'nature': 'intelligence',
    'perception': 'wisdom',
    'performance': 'charisma',
    'persuasion': 'charisma',
    'religion': 'intelligence',
    'sleight-of-hand': 'dexterity',
    'stealth': 'dexterity',
    'survival': 'wisdom',
};

/**
 * Calculate proficiency bonus from character level
 * D&D 5e progression: +2 (1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17-20)
 */
export function getProficiencyBonus(level: number): number {
    if (level >= 17) return 6;
    if (level >= 13) return 5;
    if (level >= 9) return 4;
    if (level >= 5) return 3;
    return 2;
}

/**
 * Get ability modifier from ability score
 * Formula: (score - 10) / 2, rounded down
 */
export function getAbilityModifier(abilityScore: number): number {
    return Math.floor((abilityScore - 10) / 2);
}

/**
 * Get skill modifier for a character
 * Includes ability modifier + proficiency bonus (if proficient) + expertise (if applicable) + item bonuses
 */
export function getSkillModifier(
    character: PlayerCharacter,
    skill: SkillName
): number {
    const ability = SKILL_ABILITY_MAP[skill];
    const abilityScore = character.abilityScores[ability];
    const abilityMod = getAbilityModifier(abilityScore);

    const skillProf = character.skills[skill];
    const profBonus = skillProf?.proficient ? character.proficiencyBonus : 0;
    const multiplier = skillProf?.expertise ? 2 : 1;

    // Item effects (e.g., Fine Clothes +2 Persuasion)
    const itemBonus = getItemSkillBonus(character, skill);

    return abilityMod + (profBonus * multiplier) + itemBonus;
}

/**
 * Get passive score for a skill
 * Formula: 10 + skill modifier (+5 if Observant)
 */
export function getPassiveScore(
    character: PlayerCharacter,
    skill: SkillName
): number {
    let score = 10 + getSkillModifier(character, skill);

    // Observant Feat: +5 to Passive Perception and Investigation
    if ((skill === 'perception' || skill === 'investigation') && character.feats?.includes('observant')) {
        score += 5;
    }

    return score;
}

/**
 * Create default skills object with all skills unproficient
 */
export function createDefaultSkills(): Skills {
    const skills: Partial<Skills> = {};

    const allSkills: SkillName[] = [
        'acrobatics', 'animal-handling', 'arcana', 'athletics',
        'deception', 'history', 'insight', 'intimidation',
        'investigation', 'medicine', 'nature', 'perception',
        'performance', 'persuasion', 'religion', 'sleight-of-hand',
        'stealth', 'survival'
    ];

    allSkills.forEach(skill => {
        skills[skill] = { proficient: false, expertise: false };
    });

    return skills as Skills;
}

/**
 * Get saving throw bonus for an ability
 */
export function getSavingThrowBonus(
    character: PlayerCharacter,
    ability: AbilityName
): number {
    const abilityScore = character.abilityScores[ability];
    const abilityMod = getAbilityModifier(abilityScore);

    const isProficient = character.savingThrowProficiencies[ability];
    if (!isProficient) {
        return abilityMod;
    }

    return abilityMod + character.proficiencyBonus;
}

/**
 * Calculate spell save DC
 * Formula: 8 + proficiency bonus + spellcasting ability modifier
 */
export function getSpellSaveDC(character: PlayerCharacter): number {
    // Determine spellcasting ability based on class
    let spellcastingAbility: AbilityName = 'intelligence';

    const className = character.class.name.toLowerCase();
    if (className === 'cleric' || className === 'druid' || className === 'ranger') {
        spellcastingAbility = 'wisdom';
    } else if (className === 'bard' || className === 'sorcerer' || className === 'warlock' || className === 'paladin') {
        spellcastingAbility = 'charisma';
    }

    const abilityMod = getAbilityModifier(character.abilityScores[spellcastingAbility]);
    return 8 + character.proficiencyBonus + abilityMod;
}

/**
 * Calculate spell attack bonus
 * Formula: proficiency bonus + spellcasting ability modifier
 */
export function getSpellAttackBonus(character: PlayerCharacter): number {
    // Determine spellcasting ability based on class
    let spellcastingAbility: AbilityName = 'intelligence';

    const className = character.class.name.toLowerCase();
    if (className === 'cleric' || className === 'druid' || className === 'ranger') {
        spellcastingAbility = 'wisdom';
    } else if (className === 'bard' || className === 'sorcerer' || className === 'warlock' || className === 'paladin') {
        spellcastingAbility = 'charisma';
    }

    const abilityMod = getAbilityModifier(character.abilityScores[spellcastingAbility]);
    return character.proficiencyBonus + abilityMod;
}

/**
 * Calculate armor class
 * Base: 10 + DEX modifier (+ armor AC if equipped)
 */
export function getArmorClass(character: PlayerCharacter): number {
    const dexMod = getAbilityModifier(character.abilityScores.dexterity);
    let ac = 10 + dexMod;

    if (character.equippedArmor?.armorClass) {
        // If wearing armor, use armor's AC instead of 10 + DEX
        // Note: Some armor limits DEX bonus, but we'll simplify for now
        ac = character.equippedArmor.armorClass + dexMod;
        if (character.fightingStyle === 'Defense') ac += 1;
        if (character.pactBoon === 'Pact of the Chain') ac += 1;
    } else {
        const className = character.class.name.toLowerCase();
        if (className === 'barbarian') {
            ac = 10 + dexMod + getAbilityModifier(character.abilityScores.constitution);
        } else if (className === 'monk') {
            ac = 10 + dexMod + getAbilityModifier(character.abilityScores.wisdom);
        } else if (className === 'sorcerer' && character.sorcerousOrigin === 'Draconic Bloodline') {
            ac = 10 + dexMod + 1;
        }
        if (character.fightingStyle === 'Defense') ac += 1;
        if (character.pactBoon === 'Pact of the Chain') ac += 1;
    }

    return ac;
}

/**
 * Calculate initiative bonus
 * Formula: DEX modifier (+ bonuses)
 */
export function getInitiativeBonus(character: PlayerCharacter): number {
    let bonus = getAbilityModifier(character.abilityScores.dexterity);

    // Alert Feat
    if (character.feats?.includes('alert')) {
        bonus += 5;
    }

    // Swashbuckler (Rakish Audacity) - adds Cha mod to initiative
    if (character.class.id === 'rogue' && character.subclass?.id === 'swashbuckler') {
        bonus += getAbilityModifier(character.abilityScores.charisma);
    }

    // Gloom Stalker (Dread Ambusher) - adds Wis mod to initiative
    if (character.class.id === 'ranger' && character.subclass?.id === 'gloom-stalker') {
        bonus += getAbilityModifier(character.abilityScores.wisdom);
    }

    return bonus;
}
