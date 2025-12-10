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
        let ac = armorBase + dexMod;
        if (character.fightingStyle === 'Defense') {
            ac += 1;
        }
        if (character.pactBoon === 'Pact of the Chain') {
            ac += 1;
        }
        // Ring of Protection
        if (character.inventory?.some(i => i.id === 'ring-of-protection')) {
            ac += 1;
        }
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
        unarmoredAC += calculateAbilityModifier(character.abilityScores.constitution);
    }
    if (className === 'monk') {
        unarmoredAC += calculateAbilityModifier(character.abilityScores.wisdom);
    }

    if (character.fightingStyle === 'Defense') unarmoredAC += 1;
    if (character.pactBoon === 'Pact of the Chain') unarmoredAC += 1;
    if (className === 'sorcerer' && character.sorcerousOrigin === 'Draconic Bloodline') unarmoredAC += 1;
    // Ring of Protection
    if (character.inventory?.some(i => i.id === 'ring-of-protection')) {
        unarmoredAC += 1;
    }
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
    const abilityMod = calculateAbilityModifier(character.abilityScores[ability]);
    const isProficient = character.class.savingThrows.includes(ability.charAt(0).toUpperCase() + ability.slice(1));
    const proficiencyBonus = isProficient ? calculateProficiencyBonus(character.level) : 0;

    let bonus = abilityMod + proficiencyBonus;
    // Ring of Protection
    if (character.inventory?.some(i => i.id === 'ring-of-protection')) {
        bonus += 1;
    }
    return bonus;
}
