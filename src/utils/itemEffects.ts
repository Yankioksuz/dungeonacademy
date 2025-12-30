/**
 * Item Effects System - Calculates bonuses from equipped items
 * E.g., Fine Clothes give +2 to Persuasion when equipped
 */

import type { PlayerCharacter, Item, ItemEffect, SkillName, AbilityName } from '@/types';

/**
 * Format item effect for display
 */
export function formatItemEffect(effect: ItemEffect): string {
    switch (effect.type) {
        case 'skillBonus':
            return `+${effect.value} ${effect.skill ? effect.skill.charAt(0).toUpperCase() + effect.skill.slice(1) : 'Skill'}`;
        case 'saveBonus': // e.g. "fear" -> "Fear Saves"
            const conditions = effect.condition ? ` ${effect.condition}` : '';
            const saveType = effect.save === 'all' || !effect.save ? 'Saves' : `${effect.save.charAt(0).toUpperCase() + effect.save.slice(1)} Saves`;
            return `+${effect.value}${conditions} ${saveType}`;
        case 'abilityCheckBonus':
            return `+${effect.value} ${effect.ability ? effect.ability.charAt(0).toUpperCase() + effect.ability.slice(1) : 'Ability'} Checks`;
        case 'advantage':
            return `Adv. on ${effect.skill ? effect.skill.charAt(0).toUpperCase() + effect.skill.slice(1) : 'Checks'}`;
        default:
            return 'Unknown Effect';
    }
}

/**
 * Format weapon/armor property for display
 * Handles compound properties like "versatile-1d8" -> "Versatile (1d8)"
 */
export function formatItemProperty(property: string): string {
    // Map of known properties to their display format
    const propertyMap: Record<string, string> = {
        'finesse': 'Finesse',
        'light': 'Light',
        'melee': 'Melee',
        'ranged': 'Ranged',
        'two-handed': 'Two-Handed',
        'heavy': 'Heavy',
        'thrown': 'Thrown',
        'reach': 'Reach',
        'loading': 'Loading',
        'magic': 'Magic',
        'special': 'Special',
        'attunement': 'Requires Attunement',
    };

    // Check for exact match first
    if (propertyMap[property]) {
        return propertyMap[property];
    }

    // Handle compound properties with values
    if (property.startsWith('versatile-')) {
        const die = property.split('-')[1];
        return `Versatile (${die})`;
    }

    if (property.startsWith('disadvantage-')) {
        return `Stealth Disadvantage`;
    }

    if (property.startsWith('strength-')) {
        const requirement = property.split('-')[1];
        return `Str ${requirement} Required`;
    }

    if (property.endsWith('-only')) {
        const className = property.split('-')[0];
        return `${className.charAt(0).toUpperCase() + className.slice(1)} Only`;
    }

    // Default: capitalize and replace hyphens with spaces
    return property
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Get all equipped items that could provide effects
 */
export function getEquippedItems(character: PlayerCharacter): Item[] {
    const items: Item[] = [];

    // Legacy equipment fields
    if (character.equippedArmor) items.push(character.equippedArmor);
    if (character.equippedWeapon) items.push(character.equippedWeapon);
    if (character.equippedShield) items.push(character.equippedShield);

    // New equipment slots
    if (character.equipment) {
        const slots = ['mainHand', 'offHand', 'armor', 'helmet', 'gloves', 'boots', 'amulet', 'ring1', 'ring2'] as const;
        slots.forEach(slot => {
            const item = character.equipment?.[slot];
            if (item && !items.some(i => i.id === item.id)) {
                items.push(item);
            }
        });
    }

    return items;
}

/**
 * Get all active item effects from equipped items
 */
export function getActiveItemEffects(character: PlayerCharacter): ItemEffect[] {
    const equippedItems = getEquippedItems(character);
    const attunedItems = character.attunedItems || [];
    const effects: ItemEffect[] = [];

    equippedItems.forEach(item => {
        if (!item.effects) return;

        item.effects.forEach(effect => {
            // Check if effect applies
            if (effect.when === 'attuned') {
                // Only applies if item is attuned
                if (!attunedItems.some(a => a.id === item.id)) return;
            }
            // 'equipped' and 'always' both apply for equipped items
            effects.push(effect);
        });
    });

    return effects;
}

/**
 * Get skill bonus from equipped items
 */
export function getItemSkillBonus(character: PlayerCharacter, skill: SkillName): number {
    const effects = getActiveItemEffects(character);
    let bonus = 0;

    effects.forEach(effect => {
        if (effect.type === 'skillBonus' && effect.skill === skill) {
            bonus += effect.value;
        }
    });

    return bonus;
}

/**
 * Get ability check bonus from equipped items
 */
export function getItemAbilityCheckBonus(character: PlayerCharacter, ability: AbilityName): number {
    const effects = getActiveItemEffects(character);
    let bonus = 0;

    effects.forEach(effect => {
        if (effect.type === 'abilityCheckBonus' && effect.ability === ability) {
            bonus += effect.value;
        }
    });

    return bonus;
}

/**
 * Get saving throw bonus from equipped items (for specific conditions like fear)
 */
export function getItemSaveBonus(
    character: PlayerCharacter,
    ability?: AbilityName,
    condition?: string
): number {
    const effects = getActiveItemEffects(character);
    let bonus = 0;

    effects.forEach(effect => {
        if (effect.type === 'saveBonus') {
            // Check if this bonus applies
            const abilityMatches = !effect.save || effect.save === 'all' || effect.save === ability;
            const conditionMatches = !effect.condition || effect.condition === condition;

            if (abilityMatches && conditionMatches) {
                bonus += effect.value;
            }
        }
    });

    return bonus;
}

/**
 * Check if player has advantage on a skill check from items
 */
export function hasItemSkillAdvantage(character: PlayerCharacter, skill: SkillName): boolean {
    const effects = getActiveItemEffects(character);
    return effects.some(
        effect => effect.type === 'advantage' && effect.skill === skill
    );
}
