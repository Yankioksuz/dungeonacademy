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
