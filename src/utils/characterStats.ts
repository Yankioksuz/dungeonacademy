import type { PlayerCharacter } from '../types';

export const SKILLS_ABILITY_MAP: Record<string, keyof PlayerCharacter['abilityScores']> = {
    'Acrobatics': 'dexterity',
    'Animal Handling': 'wisdom',
    'Arcana': 'intelligence',
    'Athletics': 'strength',
    'Deception': 'charisma',
    'History': 'intelligence',
    'Insight': 'wisdom',
    'Intimidation': 'charisma',
    'Investigation': 'intelligence',
    'Medicine': 'wisdom',
    'Nature': 'intelligence',
    'Perception': 'wisdom',
    'Performance': 'charisma',
    'Persuasion': 'charisma',
    'Religion': 'intelligence',
    'Sleight of Hand': 'dexterity',
    'Stealth': 'dexterity',
    'Survival': 'wisdom',
};

export function calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
}

export function getSkillModifier(character: PlayerCharacter, skillName: string): number {
    const ability = SKILLS_ABILITY_MAP[skillName];
    if (!ability) return 0;

    const abilityScore = character.abilityScores[ability];
    const abilityMod = calculateAbilityModifier(abilityScore);

    const isProficient = character.skills.includes(skillName);
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
