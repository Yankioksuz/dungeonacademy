import type { PlayerCharacter } from '../types';

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
    const dexMod = calculateAbilityModifier(character.abilityScores.dexterity);

    if (character.equippedArmor) {
        const armorBase = character.equippedArmor.armorClass || 10;
        // Light armor: full dex mod
        // Medium armor: max +2 dex mod
        // Heavy armor: no dex mod
        // For now, assuming simple logic or that armor type is handled elsewhere. 
        // Since Item type doesn't strictly define armor type (light/medium/heavy), 
        // we might need to infer or just add dex mod for now.
        // Let's assume standard 5e rules if we can infer type, but for now:
        // If AC is > 13 it's likely heavy/medium. 
        // Let's stick to a simple rule: Base AC + Dex Mod.
        // Ideally, we should update Item type to include armor category.
        return armorBase + dexMod;
    }

    // Unarmored defense (10 + Dex)
    // Barbarian/Monk unarmored defense could be added here if classes existed
    return 10 + dexMod;
}

export function calculateInitiative(character: PlayerCharacter): number {
    return calculateAbilityModifier(character.abilityScores.dexterity);
}

export function calculatePassiveScore(character: PlayerCharacter, skillName: string): number {
    return 10 + getSkillModifier(character, skillName);
}

export function getSavingThrowModifier(character: PlayerCharacter, ability: keyof PlayerCharacter['abilityScores']): number {
    const abilityMod = calculateAbilityModifier(character.abilityScores[ability]);
    const isProficient = character.class.savingThrows.includes(ability.charAt(0).toUpperCase() + ability.slice(1));
    const proficiencyBonus = isProficient ? calculateProficiencyBonus(character.level) : 0;

    return abilityMod + proficiencyBonus;
}
