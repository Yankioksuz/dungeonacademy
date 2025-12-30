import type { PlayerCharacter } from '../types';
import { getAbilityModifier } from './skillUtils';

/**
 * Calculate the maximum hit points for a character.
 * Includes: Base HP (max at lvl 1), Constitution Modifier, Class traits (Draconic Sorcerer), Racial traits (Hill Dwarf), and Feats (Tough).
 */
export function calculateMaxHitPoints(character: PlayerCharacter): number {
    if (!character.class) return 0;

    const level = character.level || 1;
    const conMod = getAbilityModifier(character.abilityScores.constitution);
    const hitDieString = character.class.hitDie || 'd8';
    const hitDieSize = parseInt(hitDieString.replace('d', '')) || 8;

    // Level 1: Max Die + Con
    let totalHp = hitDieSize + conMod;

    // Levels 2+: Avg Die (rounded up) + Con
    const avgDie = Math.floor(hitDieSize / 2) + 1;
    if (level > 1) {
        totalHp += (avgDie + conMod) * (level - 1);
    }

    // Special: Draconic Sorcerer (+1 HP per level)
    const isDraconic = character.class.id === 'sorcerer' &&
        (character.subclass?.id === 'draconic' || character.sorcerousOrigin === 'Draconic Bloodline');
    if (isDraconic) {
        totalHp += level;
    }

    // Special: Hill Dwarf (+1 HP per level)
    if (character.race?.name === 'Hill Dwarf' || character.race?.name === 'Dwarf (Hill)') {
        totalHp += level;
    }

    // Feat: Tough (+2 HP per level)
    if (character.feats?.includes('tough')) {
        totalHp += level * 2;
    }

    return Math.max(1, totalHp); // Minimum 1 HP
}

/**
 * Get the number of levels a character has in a specific class.
 * Supports both legacy single-class (`character.class`) and multiclass (`character.classes`) formats.
 * @param character The player character
 * @param classId The class ID to check (e.g., 'rogue', 'fighter')
 * @returns The number of levels in that class (0 if none)
 */
export function getLevelInClass(character: PlayerCharacter, classId: string): number {
    // Check new multiclass array first
    if (character.classes && character.classes.length > 0) {
        const classEntry = character.classes.find(c => c.class.id === classId);
        return classEntry?.level || 0;
    }
    // Fallback to legacy single-class check
    if (character.class?.id === classId) {
        return character.level || 1;
    }
    return 0;
}

/**
 * Check if a character has levels in a class sufficient for a specific feature.
 * @param character The player character
 * @param classId The class ID to check
 * @param minLevel The minimum level required in that class
 * @returns True if the character has at least minLevel in the specified class
 */
export function hasClassFeature(character: PlayerCharacter, classId: string, minLevel: number): boolean {
    return getLevelInClass(character, classId) >= minLevel;
}

