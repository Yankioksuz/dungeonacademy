import type { PlayerCharacter, Item } from '../types';
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
    if (className === 'monk' && !character.equippedShield) {
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
    let classProficient = character.class.savingThrows.includes(ability.charAt(0).toUpperCase() + ability.slice(1));

    // Monk Level 14: Diamond Soul (Proficiency in all saves)
    if (character.class.id === 'monk' && character.level >= 14) {
        classProficient = true;
    }

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

    // Paladin Level 6: Aura of Protection (Charisma modifier to all saves)
    if (character.class.id === 'paladin' && character.level >= 6) {
        const chaMod = calculateAbilityModifier(getEffectiveAbilityScore(character, 'charisma'));
        // Minimum bonus is +1? RAW says "bonus equal to your Charisma modifier (minimum of +1)"
        if (chaMod > 0) bonus += chaMod;
    }

    return bonus;
}

/**
 * Check if character is proficient with the given armor type
 * @returns true if proficient, false otherwise
 */
export function isArmorProficient(character: PlayerCharacter, armorType: 'light' | 'medium' | 'heavy' | 'shield' | undefined): boolean {
    if (!armorType) return true; // No armor = no proficiency needed

    const profs = character.armorProficiencies || [];

    // "All Armor" covers light, medium, and heavy (but not shields separately)
    if (profs.includes('All Armor') && armorType !== 'shield') {
        return true;
    }

    // Check specific proficiencies
    if (armorType === 'light' && (profs.includes('Light Armor') || profs.includes('All Armor'))) {
        return true;
    }
    if (armorType === 'medium' && (profs.includes('Medium Armor') || profs.includes('All Armor'))) {
        return true;
    }
    if (armorType === 'heavy' && (profs.includes('Heavy Armor') || profs.includes('All Armor'))) {
        return true;
    }
    if (armorType === 'shield' && profs.includes('Shields')) {
        return true;
    }

    return false;
}

/**
 * Get armor proficiency penalties for the character
 * In D&D 5e, wearing armor you're not proficient with gives:
 * - Disadvantage on any ability check, saving throw, or attack roll that involves Strength or Dexterity
 * - Can't cast spells
 */
export interface ArmorProficiencyPenalties {
    hasDisadvantage: boolean;
    cannotCastSpells: boolean;
    reason: string;
}

export function getArmorProficiencyPenalties(character: PlayerCharacter): ArmorProficiencyPenalties {
    const noPenalties: ArmorProficiencyPenalties = {
        hasDisadvantage: false,
        cannotCastSpells: false,
        reason: ''
    };

    // Check equipped armor
    if (character.equippedArmor) {
        const armorType = character.equippedArmor.armorType;
        if (!isArmorProficient(character, armorType)) {
            return {
                hasDisadvantage: true,
                cannotCastSpells: true,
                reason: `Not proficient with ${armorType} armor`
            };
        }
    }

    // Check equipped shield
    if (character.equippedShield) {
        if (!isArmorProficient(character, 'shield')) {
            return {
                hasDisadvantage: true,
                cannotCastSpells: true,
                reason: 'Not proficient with shields'
            };
        }
    }

    return noPenalties;
}

/**
 * Check if character is wearing armor they're proficient with
 */
export function isWearingProficientArmor(character: PlayerCharacter): boolean {
    const penalties = getArmorProficiencyPenalties(character);
    return !penalties.hasDisadvantage;
}


/**
 * Check if character is proficient with the given weapon
 * @returns true if proficient, false otherwise
 */
export function isWeaponProficient(character: PlayerCharacter, weapon: Item | undefined): boolean {
    if (!weapon || weapon.type !== 'weapon') return false;

    const profs = character.weaponProficiencies || [];

    // Check specific weapon name proficiency (e.g., "Longsword", "Rapier")
    if (profs.includes(weapon.name)) return true;

    // Check category proficiency (Simple/Martial)
    const subtype = weapon.subtype || '';
    if (subtype.includes('Simple') && profs.includes('Simple Weapons')) return true;
    if (subtype.includes('Martial') && profs.includes('Martial Weapons')) return true;

    // Check Monk weapons (Shortsword + simple melee weapons that lack 'heavy' or 'two-handed')
    if (character.class.name === 'Monk') {
        if (weapon.name === 'Shortsword') return true;
        if (subtype.includes('Simple Melee') &&
            !weapon.properties?.includes('two-handed') &&
            !weapon.properties?.includes('heavy')) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate available spell slots based on class and level (D&D 5e Standard)
 */
export function calculateSpellSlots(character: PlayerCharacter): Record<number, { current: number; max: number }> {
    const level = character.level;
    const className = character.class.name.toLowerCase();

    // Slot progression table for Full Casters (Bard, Cleric, Druid, Sorcerer, Wizard)
    // Row = Level (1-20), Col = Slot Level (1-9)
    const fullCasterSlots = [
        [2, 0, 0, 0, 0, 0, 0, 0, 0], // Lvl 1
        [3, 0, 0, 0, 0, 0, 0, 0, 0], // Lvl 2
        [4, 2, 0, 0, 0, 0, 0, 0, 0], // Lvl 3
        [4, 3, 0, 0, 0, 0, 0, 0, 0], // Lvl 4
        [4, 3, 2, 0, 0, 0, 0, 0, 0], // Lvl 5
        [4, 3, 3, 0, 0, 0, 0, 0, 0], // Lvl 6
        [4, 3, 3, 1, 0, 0, 0, 0, 0], // Lvl 7
        [4, 3, 3, 2, 0, 0, 0, 0, 0], // Lvl 8
        [4, 3, 3, 3, 1, 0, 0, 0, 0], // Lvl 9
        [4, 3, 3, 3, 2, 0, 0, 0, 0], // Lvl 10
        [4, 3, 3, 3, 2, 1, 0, 0, 0], // Lvl 11
        [4, 3, 3, 3, 2, 1, 0, 0, 0], // Lvl 12
        [4, 3, 3, 3, 2, 1, 1, 0, 0], // Lvl 13
        [4, 3, 3, 3, 2, 1, 1, 0, 0], // Lvl 14
        [4, 3, 3, 3, 2, 1, 1, 1, 0], // Lvl 15
        [4, 3, 3, 3, 2, 1, 1, 1, 0], // Lvl 16
        [4, 3, 3, 3, 2, 1, 1, 1, 1], // Lvl 17
        [4, 3, 3, 3, 3, 1, 1, 1, 1], // Lvl 18
        [4, 3, 3, 3, 3, 2, 1, 1, 1], // Lvl 19
        [4, 3, 3, 3, 3, 2, 2, 1, 1], // Lvl 20
    ];

    // Half Casters (Paladin, Ranger) - Start at Level 2, effectively Level/2 rounded up
    const isHalfCaster = ['paladin', 'ranger'].includes(className);

    // Warlock Pact Magic - Special Case
    // Uses short rest slots, always highest level available
    if (className === 'warlock') {
        const slots = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
        const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;

        // Return single entry for warlock slot level
        return {
            [slotLevel]: { current: slots, max: slots }
        };
    }

    let slotCounts: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(className)) {
        slotCounts = fullCasterSlots[Math.min(level, 20) - 1] || slotCounts;
    } else if (isHalfCaster && level >= 2) {
        // Effective caster level is roughly level / 2
        // Just approximation mapping to full caster table for now
        const effectiveLevel = Math.ceil(level / 2);
        slotCounts = fullCasterSlots[Math.min(effectiveLevel, 20) - 1] || slotCounts;
    }
    // Arcane Trickster / Eldritch Knight check could go here (1/3 caster)

    // Construct spellSlots object
    const spellSlots: Record<number, { current: number; max: number }> = {};
    slotCounts.forEach((count, index) => {
        if (count > 0) {
            spellSlots[index + 1] = { current: count, max: count };
        }
    });

    return spellSlots;
}
