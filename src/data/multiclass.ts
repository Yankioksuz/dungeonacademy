// Multiclassing data and utilities for D&D 5e
import type { PlayerCharacter, Class, AbilityName } from '@/types';

// Prerequisites to multiclass INTO a class (from D&D 5e PHB)
export interface MulticlassPrerequisites {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    // Some classes allow OR conditions (Fighter: STR 13 OR DEX 13)
    orCondition?: boolean;
}

export const MULTICLASS_PREREQUISITES: Record<string, MulticlassPrerequisites> = {
    barbarian: { strength: 13 },
    bard: { charisma: 13 },
    cleric: { wisdom: 13 },
    druid: { wisdom: 13 },
    fighter: { strength: 13, dexterity: 13, orCondition: true }, // STR 13 OR DEX 13
    monk: { dexterity: 13, wisdom: 13 },
    paladin: { strength: 13, charisma: 13 },
    ranger: { dexterity: 13, wisdom: 13 },
    rogue: { dexterity: 13 },
    sorcerer: { charisma: 13 },
    warlock: { charisma: 13 },
    wizard: { intelligence: 13 },
};

// Proficiencies gained when multiclassing INTO a class (not full starting proficiencies)
export const MULTICLASS_PROFICIENCIES: Record<string, { armor: string[]; weapons: string[] }> = {
    barbarian: { armor: ['Shields'], weapons: ['Simple Weapons', 'Martial Weapons'] },
    bard: { armor: ['Light Armor'], weapons: ['Simple Weapons'] },
    cleric: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: [] },
    druid: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: [] },
    fighter: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: ['Simple Weapons', 'Martial Weapons'] },
    monk: { armor: [], weapons: ['Simple Weapons', 'Shortswords'] },
    paladin: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: ['Simple Weapons', 'Martial Weapons'] },
    ranger: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: ['Simple Weapons', 'Martial Weapons'] },
    rogue: { armor: ['Light Armor'], weapons: ['Hand Crossbows', 'Longswords', 'Rapiers', 'Shortswords'] },
    sorcerer: { armor: [], weapons: [] },
    warlock: { armor: ['Light Armor'], weapons: ['Simple Weapons'] },
    wizard: { armor: [], weapons: [] },
};

// Caster type for spell slot calculation
export type CasterType = 'full' | 'half' | 'third' | 'pact' | 'none';

export const CLASS_CASTER_TYPE: Record<string, CasterType> = {
    barbarian: 'none',
    bard: 'full',
    cleric: 'full',
    druid: 'full',
    fighter: 'none', // Eldritch Knight is 'third' at subclass level
    monk: 'none',
    paladin: 'half',
    ranger: 'half',
    rogue: 'none', // Arcane Trickster is 'third' at subclass level
    sorcerer: 'full',
    warlock: 'pact', // Special: Pact Magic doesn't combine with spell slots
    wizard: 'full',
};

// Subclasses that grant spellcasting
export const SPELLCASTING_SUBCLASSES: Record<string, CasterType> = {
    'eldritch-knight': 'third',
    'arcane-trickster': 'third',
};

/**
 * Check if a character meets the prerequisites to multiclass INTO a target class
 */
export function meetsMulticlassPrereqs(character: PlayerCharacter, targetClassId: string): boolean {
    const prereqs = MULTICLASS_PREREQUISITES[targetClassId.toLowerCase()];
    if (!prereqs) return false; // Unknown class

    const abilityScores = character.abilityScores;

    if (prereqs.orCondition) {
        // OR condition: need to meet at least one
        const abilities = Object.keys(prereqs).filter(k => k !== 'orCondition') as AbilityName[];
        return abilities.some(ability => {
            const required = prereqs[ability];
            return required !== undefined && abilityScores[ability] >= required;
        });
    } else {
        // AND condition: need to meet all
        const abilities = Object.keys(prereqs) as AbilityName[];
        return abilities.every(ability => {
            const required = prereqs[ability];
            return required === undefined || abilityScores[ability] >= required;
        });
    }
}

/**
 * Check if character meets prereqs to LEAVE their current class (same rules apply)
 */
export function canLeaveCurrentClass(character: PlayerCharacter): boolean {
    const currentClassId = character.classes?.[0]?.class?.id || character.class?.id;
    if (!currentClassId) return false;
    return meetsMulticlassPrereqs(character, currentClassId);
}

/**
 * Get all classes a character can multiclass into
 */
export function getAvailableMulticlassOptions(character: PlayerCharacter, allClasses: Class[]): Class[] {
    // Must meet prereqs to leave current class
    if (!canLeaveCurrentClass(character)) return [];

    // Get already-taken class IDs
    const takenClassIds = new Set(
        character.classes?.map(cl => cl.class.id) || [character.class?.id]
    );

    return allClasses.filter(cls =>
        !takenClassIds.has(cls.id) && meetsMulticlassPrereqs(character, cls.id)
    );
}

/**
 * Get the level a character has in a specific class
 */
export function getClassLevel(character: PlayerCharacter, classId: string): number {
    if (!character.classes) {
        // Legacy single-class character
        return character.class?.id === classId ? character.level : 0;
    }
    const classEntry = character.classes.find(cl => cl.class.id === classId);
    return classEntry?.level || 0;
}

/**
 * Get the primary (first) class
 */
export function getPrimaryClass(character: PlayerCharacter): Class {
    return character.classes?.[0]?.class || character.class;
}

/**
 * Get display string for character's classes (e.g., "Fighter 5 / Wizard 3")
 */
export function getClassDisplayString(character: PlayerCharacter): string {
    if (!character.classes || character.classes.length === 0) {
        return `${character.class?.name || 'Unknown'} ${character.level}`;
    }
    return character.classes
        .map(cl => `${cl.class.name} ${cl.level}`)
        .join(' / ');
}

/**
 * Calculate the effective caster level for multiclass spell slot calculation
 */
export function getMulticlassCasterLevel(character: PlayerCharacter): number {
    if (!character.classes) {
        // Single class character - use existing logic
        return 0; // Will be handled by existing calculateSpellSlots
    }

    let casterLevel = 0;

    for (const cl of character.classes) {
        const classId = cl.class.id.toLowerCase();
        const subclassId = cl.subclass?.id;

        // Check if subclass grants spellcasting
        const subclassCasterType = subclassId ? SPELLCASTING_SUBCLASSES[subclassId] : undefined;
        const classCasterType = CLASS_CASTER_TYPE[classId] || 'none';

        // Use subclass caster type if it grants spellcasting, otherwise class type
        const effectiveCasterType = subclassCasterType || classCasterType;

        switch (effectiveCasterType) {
            case 'full':
                casterLevel += cl.level;
                break;
            case 'half':
                // Half casters only count from level 2+
                if (cl.level >= 2) {
                    casterLevel += Math.floor(cl.level / 2);
                }
                break;
            case 'third':
                // Third casters only count from level 3+
                if (cl.level >= 3) {
                    casterLevel += Math.floor(cl.level / 3);
                }
                break;
            case 'pact':
                // Warlock Pact Magic doesn't combine - handled separately
                break;
            case 'none':
            default:
                // No spellcasting contribution
                break;
        }
    }

    return casterLevel;
}

/**
 * Check if character has Warlock levels (Pact Magic is separate)
 */
export function hasWarlockLevels(character: PlayerCharacter): number {
    return getClassLevel(character, 'warlock');
}
