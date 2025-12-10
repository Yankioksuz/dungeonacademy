import type { PlayerCharacter } from '../types';
import {
    getMagicItemACBonus,
    getMagicItemSaveBonus,
    getEffectiveAbilityScore
} from './magicItemEffects';


export const SKILLS_ABILITY_MAP: Record<string, keyof PlayerCharacter['abilityScores']> = {
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

export function calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
}

export function getSkillModifier(character: PlayerCharacter, skillName: string): number {
    const normalizedSkill = skillName.toLowerCase().replace(/ /g, '-');
    const ability = SKILLS_ABILITY_MAP[normalizedSkill];
    if (!ability) return 0;

    const abilityScore = character.abilityScores[ability];
    const abilityMod = calculateAbilityModifier(abilityScore);

    // Use type assertion or check if normalizedSkill is a valid key
    const skillData = character.skills[normalizedSkill as keyof typeof character.skills];
    const isProficient = skillData?.proficient;
    const proficiencyBonus = isProficient ? calculateProficiencyBonus(character.level) : 0;

    return abilityMod + proficiencyBonus;
}

export function calculateArmorClass(character: PlayerCharacter): number {
    // Use effective DEX score (accounts for magic items like belts)
    const effectiveDex = getEffectiveAbilityScore(character, 'dexterity');
    const dexMod = calculateAbilityModifier(effectiveDex);

    // Get magic item AC bonuses (Ring of Protection, Cloak of Protection, +X armor/shields, etc.)
    const magicItemACBonus = getMagicItemACBonus(character);

    if (character.equippedArmor) {
        const armorBase = character.equippedArmor.armorClass || 10;
        const armorType = character.equippedArmor.armorType || 'light';

        let ac = armorBase;

        // Apply DEX modifier based on armor type
        if (armorType === 'light') {
            ac += dexMod;
        } else if (armorType === 'medium') {
            ac += Math.min(2, dexMod);
        }
        // Heavy armor: no DEX bonus

        // Add shield AC if equipped
        if (character.equippedShield) {
            ac += character.equippedShield.armorClass || 2;
        }

        // Fighting Style: Defense
        if (character.fightingStyle === 'Defense') {
            ac += 1;
        }
        if (character.pactBoon === 'Pact of the Chain') {
            ac += 1;
        }

        // Add all magic item AC bonuses
        ac += magicItemACBonus;

        // Haste
        if (character.conditions?.some(c => c.type === 'haste')) {
            ac += 2;
        }
        return ac;
    }

    // Unarmored Defense for Barbarian/Monk
    const className = character.class.name.toLowerCase();
    let unarmoredAC = 10 + dexMod;
    if (className === 'barbarian') {
        const effectiveCon = getEffectiveAbilityScore(character, 'constitution');
        unarmoredAC += calculateAbilityModifier(effectiveCon);
    }
    if (className === 'monk') {
        const effectiveWis = getEffectiveAbilityScore(character, 'wisdom');
        unarmoredAC += calculateAbilityModifier(effectiveWis);
    }

    if (character.fightingStyle === 'Defense') unarmoredAC += 1;
    if (character.pactBoon === 'Pact of the Chain') unarmoredAC += 1;
    if (className === 'sorcerer' && character.sorcerousOrigin === 'Draconic Bloodline') unarmoredAC += 3; // 13 base for Draconic Resilience

    // Add shield if equipped (even when unarmored)
    if (character.equippedShield) {
        unarmoredAC += character.equippedShield.armorClass || 2;
    }

    // Add magic item AC bonuses (Ring/Cloak of Protection, Bracers of Defense, etc.)
    unarmoredAC += magicItemACBonus;

    // Haste
    if (character.conditions?.some(c => c.type === 'haste')) {
        unarmoredAC += 2;
    }

    return unarmoredAC;
}

export function calculateInitiative(character: PlayerCharacter): number {
    let bonus = calculateAbilityModifier(character.abilityScores.dexterity);
    if (character.feats?.includes('alert')) {
        bonus += 5;
    }
    return bonus;
}

export function calculatePassiveScore(character: PlayerCharacter, skillName: string): number {
    return 10 + getSkillModifier(character, skillName);
}

export function getSavingThrowModifier(character: PlayerCharacter, ability: keyof PlayerCharacter['abilityScores']): number {
    // Use effective ability score (accounts for magic items)
    const effectiveScore = getEffectiveAbilityScore(character, ability);
    const abilityMod = calculateAbilityModifier(effectiveScore);
    const isProficient = character.class.savingThrows.includes(ability.charAt(0).toUpperCase() + ability.slice(1));
    const proficiencyBonus = isProficient ? calculateProficiencyBonus(character.level) : 0;

    let bonus = abilityMod + proficiencyBonus;

    // Add magic item save bonuses (Ring/Cloak of Protection, etc.)
    bonus += getMagicItemSaveBonus(character);

    return bonus;
}
