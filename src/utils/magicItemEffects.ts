/**
 * Magic Item Effects Utility
 * Handles all magic item mechanical effects including:
 * - Attack/Damage bonuses (+X weapons)
 * - AC bonuses (+X armor, Ring of Protection)
 * - Stat modifications (Gauntlets of Ogre Power, Belts of Giant Strength)
 * - Extra damage (Flame Tongue, Frost Brand)
 * - Defensive effects (Cloak of Displacement, Mantle of Spell Resistance)
 * - Attunement tracking
 */

import type { PlayerCharacter, Item } from '@/types';

// === ATTUNEMENT SYSTEM ===
export const MAX_ATTUNED_ITEMS = 3;

export function getAttunedItems(character: PlayerCharacter): Item[] {
    return character.attunedItems || [];
}

export function canAttuneItem(character: PlayerCharacter, item: Item): boolean {
    const attuned = getAttunedItems(character);
    if (attuned.length >= MAX_ATTUNED_ITEMS) return false;
    if (attuned.some(i => i.id === item.id)) return false;

    // Check class restrictions
    const props = item.properties || [];
    if (props.includes('paladin-only') && character.class.id !== 'paladin') return false;
    if (props.includes('warlock-only') && character.class.id !== 'warlock') return false;
    if (props.includes('wizard-only') && character.class.id !== 'wizard') return false;
    if (props.includes('spellcaster-only')) {
        const casters = ['wizard', 'sorcerer', 'warlock', 'cleric', 'druid', 'bard', 'paladin', 'ranger'];
        if (!casters.includes(character.class.id)) return false;
    }

    return true;
}

export function requiresAttunement(item: Item): boolean {
    return (item.properties || []).includes('attunement');
}

export function isAttuned(character: PlayerCharacter, item: Item): boolean {
    return getAttunedItems(character).some(i => i.id === item.id);
}

// === WEAPON BONUSES ===

/**
 * Get attack bonus from a magic weapon (+1, +2, +3)
 */
export function getWeaponAttackBonus(weapon: Item | undefined): number {
    if (!weapon) return 0;

    const damage = weapon.damage || '';

    // Parse +X from damage string (e.g., "1d8+3" -> 3 for Holy Avenger)
    const bonusMatch = damage.match(/\+(\d+)/);
    if (bonusMatch && weapon.rarity) {
        // Only count as magic bonus if it's a magic item
        const bonus = parseInt(bonusMatch[1]);
        // Cap at +3 for typical magic weapons
        if (bonus >= 1 && bonus <= 3) return bonus;
    }

    // Check item ID for known +X weapons
    if (weapon.id?.includes('plus-1') || weapon.name?.includes('+1')) return 1;
    if (weapon.id?.includes('plus-2') || weapon.name?.includes('+2')) return 2;
    if (weapon.id?.includes('plus-3') || weapon.name?.includes('+3')) return 3;

    // Specific legendary weapons
    if (weapon.id === 'holy-avenger') return 3;
    if (weapon.id === 'staff-of-power' || weapon.id === 'staff-of-the-magi') return 2;
    if (weapon.id === 'dagger-venom') return 1;

    return 0;
}

/**
 * Get extra damage dice from magic weapons
 * Returns { dice: string, type: string }[]
 */
export function getWeaponExtraDamage(weapon: Item | undefined, isAttuned: boolean = true): { dice: string; type: string; description: string }[] {
    if (!weapon) return [];

    const extras: { dice: string; type: string; description: string }[] = [];

    // Check if attunement is required but not met
    if (requiresAttunement(weapon) && !isAttuned) return [];

    switch (weapon.id) {
        case 'flame-tongue':
            extras.push({ dice: '2d6', type: 'fire', description: 'Flame Tongue' });
            break;
        case 'frost-brand':
            extras.push({ dice: '1d6', type: 'cold', description: 'Frost Brand' });
            break;
        case 'sunblade':
            // Extra 1d8 radiant vs undead would need target type check
            // For now, just note it's radiant damage
            break;
        case 'holy-avenger':
            // Extra 2d10 radiant vs fiends/undead - needs target type check
            break;
        case 'oathbow':
            // 3d6 is already in the damage string when sworn enemy is targeted
            break;
    }

    return extras;
}

// === CONDITION EFFECTS ===

export interface OnHitConditionEffect {
    condition: 'poisoned' | 'restrained' | 'frightened' | 'paralyzed' | 'blinded';
    duration: number; // rounds
    saveDC?: number;
    saveAbility?: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
    extraDamage?: string; // e.g., "2d10 poison"
    description: string;
}

/**
 * Get conditions that a weapon can apply on a successful hit.
 * Returns an array of condition effects with save information.
 */
export function getWeaponOnHitConditions(weapon: Item | undefined): OnHitConditionEffect[] {
    if (!weapon) return [];

    const effects: OnHitConditionEffect[] = [];

    switch (weapon.id) {
        case 'dagger-venom':
            // Dagger of Venom: DC 15 CON save or poisoned for 1 minute + 2d10 poison damage
            effects.push({
                condition: 'poisoned',
                duration: 10, // 1 minute = 10 rounds
                saveDC: 15,
                saveAbility: 'constitution',
                extraDamage: '2d10 poison',
                description: 'Dagger of Venom'
            });
            break;
        case 'net':
            // Net: Target is restrained (no save, but can escape with DC 10 STR check or 5 slashing)
            effects.push({
                condition: 'restrained',
                duration: -1, // Until escaped
                description: 'Net'
            });
            break;
        // Future: Add more weapons here (e.g., paralytic poison arrows, etc.)
    }

    return effects;
}

export interface UsableConditionEffect {
    condition: 'invisible' | 'haste' | 'flying';
    duration: number; // rounds, -1 for concentration/toggle
    selfTarget: boolean;
    description: string;
}

/**
 * Get conditions that an item can apply when used (activated).
 * Returns an array of condition effects.
 */
export function getItemUsableConditions(item: Item | undefined): UsableConditionEffect[] {
    if (!item) return [];

    const effects: UsableConditionEffect[] = [];

    switch (item.id) {
        case 'cloak-of-invisibility':
            effects.push({
                condition: 'invisible',
                duration: -1, // Until deactivated or attack/spell
                selfTarget: true,
                description: 'Cloak of Invisibility'
            });
            break;
        case 'ring-of-invisibility':
            effects.push({
                condition: 'invisible',
                duration: -1, // Until deactivated
                selfTarget: true,
                description: 'Ring of Invisibility'
            });
            break;
        case 'boots-of-speed': // Example, if exists
            effects.push({
                condition: 'haste',
                duration: 10, // 1 minute
                selfTarget: true,
                description: 'Boots of Speed'
            });
            break;
        case 'winged-boots':
            effects.push({
                condition: 'flying',
                duration: -1, // While active
                selfTarget: true,
                description: 'Winged Boots'
            });
            break;
    }

    return effects;
}

/**
 * Check if weapon overcomes magic resistance
 */
export function isMagicWeapon(weapon: Item | undefined): boolean {
    if (!weapon) return false;
    if ((weapon.properties || []).includes('magic')) return true;
    if (weapon.rarity && ['uncommon', 'rare', 'very rare', 'legendary'].includes(weapon.rarity)) return true;
    return false;
}

// === ARMOR BONUSES ===

/**
 * Get AC bonus from magic armor/shields
 */
export function getArmorACBonus(armor: Item | undefined): number {
    if (!armor) return 0;

    // Check for +X in the name or ID
    if (armor.id?.includes('plus-1') || armor.name?.includes('+1')) return 1;
    if (armor.id?.includes('plus-2') || armor.name?.includes('+2')) return 2;
    if (armor.id?.includes('plus-3') || armor.name?.includes('+3')) return 3;

    return 0;
}

/**
 * Get total AC bonus from all equipped magic items
 */
export function getMagicItemACBonus(character: PlayerCharacter): number {
    let bonus = 0;
    const attuned = getAttunedItems(character);

    // Ring of Protection (+1 AC)
    if (attuned.some(i => i.id === 'ring-of-protection')) {
        bonus += 1;
    }

    // Cloak of Protection (+1 AC)
    if (attuned.some(i => i.id === 'cloak-of-protection')) {
        bonus += 1;
    }

    // Ioun Stone of Protection (+1 AC)
    if (attuned.some(i => i.id === 'ioun-stone-protection')) {
        bonus += 1;
    }

    // Bracers of Defense (+2 AC if no armor/shield)
    if (attuned.some(i => i.id === 'bracers-of-defense')) {
        if (!character.equippedArmor && !character.equippedShield) {
            bonus += 2;
        }
    }

    // Magic armor bonus
    bonus += getArmorACBonus(character.equippedArmor);

    // Magic shield bonus  
    bonus += getArmorACBonus(character.equippedShield);

    return bonus;
}

// === SAVING THROW BONUSES ===

/**
 * Get saving throw bonus from magic items
 */
export function getMagicItemSaveBonus(character: PlayerCharacter): number {
    let bonus = 0;
    const attuned = getAttunedItems(character);

    // Ring of Protection (+1 saves)
    if (attuned.some(i => i.id === 'ring-of-protection')) {
        bonus += 1;
    }

    // Cloak of Protection (+1 saves)
    if (attuned.some(i => i.id === 'cloak-of-protection')) {
        bonus += 1;
    }

    return bonus;
}

/**
 * Check if character has advantage on saves vs spells
 */
export function hasSpellSaveAdvantage(character: PlayerCharacter): boolean {
    const attuned = getAttunedItems(character);

    // Mantle of Spell Resistance
    if (attuned.some(i => i.id === 'mantle-of-spell-resistance')) {
        return true;
    }

    // Spellguard Shield (when equipped)
    if (character.equippedShield?.id === 'spellguard-shield' && isAttuned(character, character.equippedShield)) {
        return true;
    }

    return false;
}

// === STAT MODIFICATIONS ===

interface StatModifications {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
}

/**
 * Get stat modifications from magic items
 * These SET stats to specific values (not bonuses)
 */
export function getStatModifications(character: PlayerCharacter): StatModifications {
    const mods: StatModifications = {};
    const attuned = getAttunedItems(character);

    for (const item of attuned) {
        switch (item.id) {
            // Strength items
            case 'gauntlets-of-ogre-power':
                if ((character.abilityScores?.strength || 10) < 19) mods.strength = 19;
                break;
            case 'belt-of-giant-strength-hill':
                if ((character.abilityScores?.strength || 10) < 21) mods.strength = 21;
                break;
            case 'belt-of-giant-strength-fire':
                if ((character.abilityScores?.strength || 10) < 25) mods.strength = 25;
                break;
            case 'belt-of-giant-strength-storm':
                if ((character.abilityScores?.strength || 10) < 29) mods.strength = 29;
                break;

            // Constitution items
            case 'amulet-of-health':
                if ((character.abilityScores?.constitution || 10) < 19) mods.constitution = 19;
                break;

            // Intelligence items
            case 'headband-of-intellect':
                if ((character.abilityScores?.intelligence || 10) < 19) mods.intelligence = 19;
                break;
        }
    }

    return mods;
}

/**
 * Get effective ability score considering magic items
 */
export function getEffectiveAbilityScore(
    character: PlayerCharacter,
    ability: keyof PlayerCharacter['abilityScores']
): number {
    const baseScore = character.abilityScores?.[ability] || 10;
    const mods = getStatModifications(character);

    if (mods[ability] !== undefined && mods[ability]! > baseScore) {
        return mods[ability]!;
    }

    return baseScore;
}

// === DAMAGE RESISTANCES ===

/**
 * Get damage resistances from magic items
 */
export function getMagicItemResistances(character: PlayerCharacter): string[] {
    const resistances: string[] = [];
    const attuned = getAttunedItems(character);

    // Frost Brand (fire resistance)
    if (character.equippedWeapon?.id === 'frost-brand' && isAttuned(character, character.equippedWeapon)) {
        resistances.push('fire');
    }

    // Armor of Resistance
    if (attuned.some(i => i.id === 'armor-resistance')) {
        // Would need to track which damage type - for now add a generic flag
        resistances.push('chosen'); // Placeholder
    }

    // Dragon Scale Mail
    if (attuned.some(i => i.id === 'dragon-scale-mail')) {
        // Would need to track dragon type - common types:
        resistances.push('draconic'); // Placeholder for dragon type
    }

    // Armor of Invulnerability
    if (attuned.some(i => i.id === 'armor-invulnerability')) {
        resistances.push('nonmagical-bps'); // Bludgeoning, piercing, slashing from nonmagical
    }

    return resistances;
}

// === SPECIAL EFFECTS ===

/**
 * Check if attacker has disadvantage due to Cloak of Displacement
 */
export function hasCloakOfDisplacement(character: PlayerCharacter): boolean {
    const attuned = getAttunedItems(character);
    return attuned.some(i => i.id === 'cloak-of-displacement');
}

/**
 * Check if character has Adamantine Armor (crits become normal hits)
 */
export function hasAdamantineArmor(character: PlayerCharacter): boolean {
    return character.equippedArmor?.id === 'adamantine-armor';
}

/**
 * Get proficiency bonus modifier from magic items
 */
export function getProficiencyBonusMod(character: PlayerCharacter): number {
    const attuned = getAttunedItems(character);

    // Ioun Stone of Mastery (+1 proficiency)
    if (attuned.some(i => i.id === 'ioun-stone-mastery')) {
        return 1;
    }

    return 0;
}

/**
 * Get spell attack bonus from magic items
 */
export function getSpellAttackBonus(character: PlayerCharacter): number {
    let bonus = 0;
    const attuned = getAttunedItems(character);

    // Staff of the Magi (+2 spell attacks)
    if (attuned.some(i => i.id === 'staff-of-the-magi')) {
        bonus += 2;
    }

    // Rod of the Pact Keeper (+1 spell attacks)
    if (attuned.some(i => i.id === 'rod-of-the-pact-keeper')) {
        bonus += 1;
    }

    return bonus;
}

/**
 * Get spell save DC bonus from magic items
 */
export function getSpellSaveDCBonus(character: PlayerCharacter): number {
    let bonus = 0;
    const attuned = getAttunedItems(character);

    // Rod of the Pact Keeper (+1 save DC)
    if (attuned.some(i => i.id === 'rod-of-the-pact-keeper')) {
        bonus += 1;
    }

    return bonus;
}

/**
 * Get ranged damage bonus from Bracers of Archery
 */
export function getRangedDamageBonus(character: PlayerCharacter, weapon: Item | undefined): number {
    if (!weapon) return 0;

    const attuned = getAttunedItems(character);
    const weaponName = weapon.name?.toLowerCase() || '';

    // Bracers of Archery (+2 damage with longbow/shortbow)
    if (attuned.some(i => i.id === 'bracers-of-archery')) {
        if (weaponName.includes('longbow') || weaponName.includes('shortbow') ||
            weapon.id === 'longbow' || weapon.id === 'shortbow') {
            return 2;
        }
    }

    return 0;
}

// === PERCEPTION BONUSES ===

/**
 * Check if character has advantage on Perception (sight)
 */
export function hasPerceptionAdvantage(character: PlayerCharacter): boolean {
    const attuned = getAttunedItems(character);
    return attuned.some(i => i.id === 'eyes-of-the-eagle');
}

// === SUMMARY FUNCTION ===

export interface MagicItemEffectsSummary {
    attackBonus: number;
    damageBonus: number;
    acBonus: number;
    saveBonus: number;
    spellAttackBonus: number;
    spellSaveDCBonus: number;
    proficiencyBonus: number;
    extraDamage: { dice: string; type: string; description: string }[];
    resistances: string[];
    hasDisplacementCloak: boolean;
    hasAdamantine: boolean;
    hasSpellSaveAdvantage: boolean;
    statOverrides: StatModifications;
}

/**
 * Get all magic item effects for a character
 */
export function getMagicItemEffects(character: PlayerCharacter): MagicItemEffectsSummary {
    const weapon = character.equippedWeapon;
    const weaponAttuned = weapon ? isAttuned(character, weapon) : false;

    return {
        attackBonus: getWeaponAttackBonus(weapon),
        damageBonus: getWeaponAttackBonus(weapon) + getRangedDamageBonus(character, weapon),
        acBonus: getMagicItemACBonus(character),
        saveBonus: getMagicItemSaveBonus(character),
        spellAttackBonus: getSpellAttackBonus(character),
        spellSaveDCBonus: getSpellSaveDCBonus(character),
        proficiencyBonus: getProficiencyBonusMod(character),
        extraDamage: getWeaponExtraDamage(weapon, weaponAttuned),
        resistances: getMagicItemResistances(character),
        hasDisplacementCloak: hasCloakOfDisplacement(character),
        hasAdamantine: hasAdamantineArmor(character),
        hasSpellSaveAdvantage: hasSpellSaveAdvantage(character),
        statOverrides: getStatModifications(character),
    };
}
