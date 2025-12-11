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
            // Medium Armor Master allows +3 DEX instead of +2
            const maxDexBonus = character.feats?.includes('medium-armor-master') ? 3 : 2;
            ac += Math.min(maxDexBonus, dexMod);
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

        // Dual Wielder feat: +1 AC when wielding two melee weapons
        if (character.feats?.includes('dual-wielder') && isDualWielding(character)) {
            ac += 1;
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

    // Dual Wielder feat: +1 AC when wielding two melee weapons
    if (character.feats?.includes('dual-wielder') && isDualWielding(character)) {
        unarmoredAC += 1;
    }

    return unarmoredAC;
}

// Helper to check if character is dual wielding
function isDualWielding(character: PlayerCharacter): boolean {
    // Check if character has a weapon equipped and a shield is NOT equipped
    // In D&D 5e context, if you have a weapon but no shield, you could be dual wielding
    // This is a simplified check - the actual dual wielding logic would depend on inventory
    // For now, we check if they have fightingStyle 'Two-Weapon Fighting' as an indicator
    return !!(character.equippedWeapon && !character.equippedShield && character.fightingStyle === 'Two-Weapon Fighting');
}

export function calculateInitiative(character: PlayerCharacter): number {
    let bonus = calculateAbilityModifier(character.abilityScores.dexterity);
    if (character.feats?.includes('alert')) {
        bonus += 5;
    }
    return bonus;
}

export function calculatePassiveScore(character: PlayerCharacter, skillName: string): number {
    let base = 10 + getSkillModifier(character, skillName);

    // Observant feat: +5 to passive Perception and Investigation
    if (character.feats?.includes('observant')) {
        const normalizedSkill = skillName.toLowerCase();
        if (normalizedSkill === 'perception' || normalizedSkill === 'investigation') {
            base += 5;
        }
    }

    return base;
}

export function calculateSpeed(character: PlayerCharacter): number {
    // Base speed from race (default 30)
    let speed = character.race?.speed || 30;

    // Mobile feat: +10 feet
    if (character.feats?.includes('mobile')) {
        speed += 10;
    }

    // Barbarian: Fast Movement at level 5+ (unarmored or light/medium armor)
    if (character.class.id === 'barbarian' && character.level >= 5) {
        const armorType = character.equippedArmor?.armorType;
        if (!armorType || armorType === 'light' || armorType === 'medium') {
            speed += 10;
        }
    }

    // Monk: Unarmored Movement
    if (character.class.id === 'monk' && !character.equippedArmor && !character.equippedShield) {
        if (character.level >= 2) speed += 10;
        if (character.level >= 6) speed += 5;  // +15 total
        if (character.level >= 10) speed += 5; // +20 total
        if (character.level >= 14) speed += 5; // +25 total
        if (character.level >= 18) speed += 5; // +30 total
    }

    return speed;
}

export function getSavingThrowModifier(character: PlayerCharacter, ability: keyof PlayerCharacter['abilityScores']): number {
    // Use effective ability score (accounts for magic items)
    const effectiveScore = getEffectiveAbilityScore(character, ability);
    const abilityMod = calculateAbilityModifier(effectiveScore);

    // Check class-based save proficiencies
    const classProficient = character.class.savingThrows.includes(ability.charAt(0).toUpperCase() + ability.slice(1));

    // Check feat-based save proficiencies (Resilient)
    // Resilient feat grants proficiency in a chosen ability's saving throw
    // The chosen ability is stored in character.resilientAbility
    const resilientProficient = character.feats?.includes('resilient') &&
        character.resilientAbility === ability;

    const isProficient = classProficient || resilientProficient;
    const proficiencyBonus = isProficient ? calculateProficiencyBonus(character.level) : 0;

    let bonus = abilityMod + proficiencyBonus;

    // Add magic item save bonuses (Ring/Cloak of Protection, etc.)
    bonus += getMagicItemSaveBonus(character);

    return bonus;
}
