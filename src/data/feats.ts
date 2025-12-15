// Feat data utilities
// Loads and provides access to feats from feats.json

import featsData from '@/content/feats.json';
import type { Feat, FeatEffect, PlayerCharacter, AbilityName } from '@/types';

// Type the raw JSON data
interface RawFeat {
    id: string;
    name: string;
    source?: string;
    description: string;
    prerequisites?: {
        abilityScore?: Record<string, number>;
        armor?: string;
        spellcasting?: boolean;
    };
    effects?: Array<{
        type: string;
        key?: string;
        value?: number;
        choice?: string | string[];
        trigger?: string;
        reset?: string;
        attackPenalty?: number;
        damageBonus?: number;
        weaponProp?: string;
        weaponType?: string;
        skills?: string[];
        perTurn?: boolean;
        damage?: string;
        damageType?: string;
        ability?: string;
    }>;
}

// Transform raw feat data to typed Feat interface
function transformFeat(raw: RawFeat): Feat {
    const effects: FeatEffect[] = (raw.effects || []).map(effect => ({
        type: effect.type as FeatEffect['type'],
        key: effect.key,
        value: effect.value,
        trigger: effect.trigger,
        reset: effect.reset,
        attackPenalty: effect.attackPenalty,
        damageBonus: effect.damageBonus,
        weaponProp: effect.weaponProp,
        weaponType: effect.weaponType,
    }));

    return {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        source: raw.source,
        prerequisites: raw.prerequisites ? {
            abilityScore: raw.prerequisites.abilityScore ? {
                ability: Object.keys(raw.prerequisites.abilityScore)[0] as AbilityName,
                minimum: Object.values(raw.prerequisites.abilityScore)[0],
            } : undefined,
            armor: raw.prerequisites.armor,
            spellcasting: raw.prerequisites.spellcasting,
        } : undefined,
        benefits: {
            other: [raw.description],
        },
        effects,
    };
}

// All feats, transformed
export const ALL_FEATS: Feat[] = (featsData as RawFeat[]).map(transformFeat);

/**
 * Get all available feats
 */
export function getAllFeats(): Feat[] {
    return ALL_FEATS;
}

/**
 * Get a feat by its ID
 */
export function getFeatById(id: string): Feat | undefined {
    return ALL_FEATS.find(feat => feat.id === id);
}

/**
 * Check if a character meets the prerequisites for a feat
 */
export function meetsPrerequisites(character: PlayerCharacter, feat: Feat): boolean {
    if (!feat.prerequisites) return true;

    const prereqs = feat.prerequisites;

    // Check ability score requirement
    if (prereqs.abilityScore) {
        const { ability, minimum } = prereqs.abilityScore;
        if (character.abilityScores[ability] < minimum) {
            return false;
        }
    }

    // Check armor proficiency requirement
    if (prereqs.armor) {
        const armorType = prereqs.armor.toLowerCase();
        const hasProf = character.armorProficiencies?.some(
            prof => prof.toLowerCase().includes(armorType) || prof.toLowerCase() === 'all armor'
        );
        if (!hasProf) return false;
    }

    // Check spellcasting requirement
    if (prereqs.spellcasting) {
        const spellcastingClasses = ['Wizard', 'Sorcerer', 'Cleric', 'Druid', 'Bard', 'Warlock', 'Paladin', 'Ranger'];
        if (!spellcastingClasses.includes(character.class.name)) {
            return false;
        }
    }

    // Check level requirement
    if (prereqs.level && character.level < prereqs.level) {
        return false;
    }

    // Check race requirement
    if (prereqs.race && !prereqs.race.includes(character.race.name)) {
        return false;
    }

    // Check class requirement
    if (prereqs.class && !prereqs.class.includes(character.class.name)) {
        return false;
    }

    return true;
}

/**
 * Get feats available to a character (not already taken, meets prerequisites)
 */
export function getAvailableFeats(character: PlayerCharacter): Feat[] {
    const takenFeatIds = new Set(character.feats || []);

    return ALL_FEATS.filter(feat =>
        !takenFeatIds.has(feat.id) && meetsPrerequisites(character, feat)
    );
}

/**
 * Get the feats a character has taken
 */
export function getCharacterFeats(character: PlayerCharacter): Feat[] {
    if (!character.feats) return [];
    return character.feats.map(id => getFeatById(id)).filter((f): f is Feat => !!f);
}

/**
 * Check if a feat has a specific effect type
 */
export function hasEffectType(feat: Feat, effectType: string): boolean {
    return feat.effects?.some(e => e.type === effectType) || false;
}

/**
 * Get all effects of a specific type from a feat
 */
export function getEffectsOfType(feat: Feat, effectType: string): FeatEffect[] {
    return feat.effects?.filter(e => e.type === effectType) || [];
}
