import type { Feat, PlayerCharacter } from '../types';

export function checkFeatPrerequisites(feat: Feat, character: PlayerCharacter): boolean {
    if (!feat.prerequisites) return true;

    const { prerequisites } = feat;

    // Level check
    if (prerequisites.level && character.level < prerequisites.level) {
        return false;
    }

    // Ability Score check
    if (prerequisites.abilityScore) {
        const { ability, minimum } = prerequisites.abilityScore;
        // Map ability name (e.g. 'strength') to character ability score
        const score = character.abilityScores[ability];
        if (score < minimum) {
            return false;
        }
    }

    // Race check
    if (prerequisites.race) {
        if (!prerequisites.race.includes(character.race.name)) {
            return false;
        }
    }

    // Class checkers
    if (prerequisites.class) {
        if (!prerequisites.class.includes(character.class.name)) {
            return false;
        }
    }

    // Proficiency check
    if (prerequisites.proficiency) {
        // This is tricky as proficiency names might vary.
        // Assuming simple skill check for now or armor lookup
        // For now we check skills
        /* 
        const isSkillProficient = character.skills[prerequisites.proficiency as keyof typeof character.skills]?.proficient;
        if (!isSkillProficient) return false;
        */
        // To be safe and simple for now, we might skip complex string matching or implement strict checks later
    }

    // Spellcasting check
    if (prerequisites.spellcasting) {
        const spellcastingClasses = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard', 'Paladin', 'Ranger', 'Eldritch Knight', 'Arcane Trickster'];
        const hasSpellcasting = spellcastingClasses.includes(character.class.name) || (character.subclass && spellcastingClasses.includes(character.subclass.name));
        if (!hasSpellcasting) return false;
    }

    // Armor check
    if (prerequisites.armor) {
        if (prerequisites.armor === 'heavy' || prerequisites.armor === 'Heavy Armor') {
            if (!character.armorProficiencies.includes('Heavy Armor')) return false;
        }
        if (prerequisites.armor === 'medium' || prerequisites.armor === 'Medium Armor') {
            if (!character.armorProficiencies.includes('Medium Armor')) return false;
        }
        if (prerequisites.armor === 'light' || prerequisites.armor === 'Light Armor') {
            if (!character.armorProficiencies.includes('Light Armor')) return false;
        }
    }

    return true;
}

/**
 * Check if a character has a specific feat
 */
export function hasFeat(character: PlayerCharacter, featId: string): boolean {
    return character.feats?.includes(featId) ?? false;
}

/**
 * Get damage reduction from feats (e.g., Heavy Armor Master)
 */
export function getFeatDamageReduction(
    character: PlayerCharacter,
    damageType: string
): number {
    let reduction = 0;

    // Heavy Armor Master: -3 from B/P/S while wearing heavy armor
    if (hasFeat(character, 'heavy-armor-master') &&
        character.equippedArmor?.armorType === 'heavy' &&
        ['bludgeoning', 'piercing', 'slashing'].includes(damageType.toLowerCase())) {
        reduction += 3;
    }

    return reduction;
}

/**
 * Check if character should have advantage on a saving throw due to feats
 */
export function getFeatSaveAdvantage(
    character: PlayerCharacter,
    saveType: string,
    effectType?: string
): boolean {
    // War Caster: Advantage on concentration saves
    if (hasFeat(character, 'war-caster') && effectType === 'concentration' && saveType === 'constitution') {
        return true;
    }

    // Mage Slayer: Advantage on saves vs spells from adjacent creatures
    if (hasFeat(character, 'mage-slayer') && effectType === 'magic') {
        return true;
    }

    return false;
}

/**
 * Get initiative bonus from feats
 */
export function getFeatInitiativeBonus(character: PlayerCharacter): number {
    let bonus = 0;

    // Alert: +5 to initiative
    if (hasFeat(character, 'alert')) {
        bonus += 5;
    }

    return bonus;
}

/**
 * Get speed bonus from feats
 */
export function getFeatSpeedBonus(character: PlayerCharacter): number {
    let bonus = 0;

    // Mobile: +10 ft speed
    if (hasFeat(character, 'mobile')) {
        bonus += 10;
    }

    return bonus;
}

/**
 * Get HP bonus from feats
 */
export function getFeatHpBonus(character: PlayerCharacter): number {
    let bonus = 0;

    // Tough: +2 HP per level
    if (hasFeat(character, 'tough')) {
        bonus += character.level * 2;
    }

    return bonus;
}

/**
 * Get passive score bonus from feats
 */
export function getFeatPassiveBonus(character: PlayerCharacter, skill: string): number {
    let bonus = 0;

    // Observant: +5 to passive Perception and Investigation
    if (hasFeat(character, 'observant')) {
        const normalizedSkill = skill.toLowerCase();
        if (normalizedSkill === 'perception' || normalizedSkill === 'investigation') {
            bonus += 5;
        }
    }

    return bonus;
}

/**
 * Check if character has a finesse weapon equipped (for Defensive Duelist)
 */
export function hasEquippedFinesseWeapon(character: PlayerCharacter): boolean {
    const weapon = character.equippedWeapon;
    if (!weapon) return false;

    const props = (weapon.properties || []).map((p: string) => p.toLowerCase());
    return props.includes('finesse');
}

/**
 * Calculate Lucky feat points available (should be tracked in featureUses)
 */
export function getLuckyPointsRemaining(character: PlayerCharacter): number {
    if (!hasFeat(character, 'lucky')) return 0;
    return character.featureUses?.luckPoints ?? 3;
}

