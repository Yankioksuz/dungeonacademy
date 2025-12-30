// Enemy Portrait Data
// Maps Enemy IDs to their portrait images

import goblinPortrait from '@/assets/enemies/goblin.png';
import goblinLeaderPortrait from '@/assets/enemies/goblin-leader.png';
import vaelthrisPortrait from '@/assets/enemies/vaelthris.png';
import frostSirenPortrait from '@/assets/enemies/frost-siren.png';

import steamConstructPortrait from '@/assets/enemies/steam-construct.png';
import moltenGuardianPortrait from '@/assets/enemies/molten-guardian.png';
import mirrorConstructPortrait from '@/assets/enemies/mirror-construct.png';
import maskedGuardPortrait from '@/assets/enemies/masked-guard.png';
import frostCultistPortrait from '@/assets/enemies/frost-cultist.png';
import frostSmithPortrait from '@/assets/enemies/frost-smith.png';
import heartWinterPortrait from '@/assets/enemies/heart-winter.png';
import skyWardenPortrait from '@/assets/enemies/sky-warden.png';

// Sanctum of the Flayed God
import fleshWardenPortrait from '@/assets/enemies/flesh-warden.png';
import boneSwarmPortrait from '@/assets/enemies/bone-swarm.png';
import gateGuardianPortrait from '@/assets/enemies/gate-guardian.png';
import painEaterPortrait from '@/assets/enemies/pain-eater.png';
import baronKrovPortrait from '@/assets/enemies/baron-krov.png';
import highPriestVexPortrait from '@/assets/enemies/high-priest-vex.png';
import stoneGargoylePortrait from '@/assets/enemies/stone-gargoyle.png';
import harpyMatriarchPortrait from '@/assets/enemies/harpy-matriarch.png';
import mindProjectionPortrait from '@/assets/enemies/mind-projection.png';
import sanguinePontiffPortrait from '@/assets/enemies/sanguine-pontiff.png';
import bloodAvatarPortrait from '@/assets/enemies/blood-avatar.png';

export interface EnemyPortrait {
    id: string;
    name: string;
    src: string;
    aliases?: string[]; // Alternative names that should use this portrait
}

export const enemyPortraits: EnemyPortrait[] = [
    // Basic Enemies
    {
        id: 'goblin',
        name: 'Goblin',
        src: goblinPortrait,
        aliases: ['goblin-scout', 'goblin-raider', 'goblin-warrior']
    },
    {
        id: 'goblin-leader',
        name: 'Goblin Leader',
        src: goblinLeaderPortrait,
        aliases: ['goblin-boss', 'goblin-warlord', 'hobgoblin']
    },
    // Shadows of the Azure Spire Enemies
    {
        id: 'steam-construct',
        name: 'Steam Construct',
        src: steamConstructPortrait,
        aliases: ['automaton', 'gear-construct']
    },
    {
        id: 'molten-guardian',
        name: 'Molten Guardian',
        src: moltenGuardianPortrait,
        aliases: ['fire-elemental', 'magma-beast', 'fire-spirit']
    },
    {
        id: 'mirror-construct',
        name: 'Mirror Construct',
        src: mirrorConstructPortrait,
        aliases: ['pinnacle-guardian', 'glass-golem', 'reflection', 'mirror-guardian', 'mirror-sentinel']
    },
    {
        id: 'masked-guard',
        name: 'Masked Guard',
        src: maskedGuardPortrait,
        aliases: ['guard-captain', 'elite-guard', 'soldier', 'vault-guardian']
    },
    {
        id: 'sky-warden',
        name: 'Sky Warden',
        src: skyWardenPortrait,
        aliases: ['aerie-warden', 'winged-guard']
    },
    // Frozen Depths Enemies
    {
        id: 'vaelthris',
        name: 'Vaelthris the Pale',
        src: vaelthrisPortrait,
        aliases: ['pale-architect', 'vaelthris-the-pale', 'mage']
    },
    {
        id: 'frost-siren',
        name: 'Frost Siren',
        src: frostSirenPortrait,
        aliases: ['ice-siren', 'water-elemental', 'ice-spirit']
    },
    {
        id: 'frost-cultist',
        name: 'Frost Cultist',
        src: frostCultistPortrait,
        aliases: ['ice-cultist', 'winter-priest', 'acolyte']
    },
    {
        id: 'frost-smith',
        name: 'Frost-Burned Smith',
        src: frostSmithPortrait,
        aliases: ['undead-dwarf', 'frozen-dwarf', 'ghost-smith']
    },
    {
        id: 'heart-winter',
        name: 'The Heart of Winter',
        src: heartWinterPortrait,
        aliases: ['ice-elemental', 'winter-core', 'boss-elemental']
    },
    // Sanctum of the Flayed God Enemies
    {
        id: 'flesh-warden',
        name: 'Flesh Warden',
        src: fleshWardenPortrait,
        aliases: ['cult-fanatic', 'cultist', 'dinner-guests']
    },
    {
        id: 'bone-swarm',
        name: 'Bone Swarm',
        src: boneSwarmPortrait,
        aliases: ['skeleton-swarm', 'carrion-crawler']
    },
    {
        id: 'gate-guardian',
        name: 'Gate Guardian',
        src: gateGuardianPortrait,
        aliases: ['stone-golem', 'gate-keeper']
    },
    {
        id: 'pain-eater',
        name: 'Pain Eater',
        src: painEaterPortrait,
        aliases: ['imp', 'demon-scout']
    },
    {
        id: 'baron-krov',
        name: 'Baron Krov',
        src: baronKrovPortrait,
        aliases: ['jailer', 'executioner', 'gladiator']
    },
    {
        id: 'high-priest-vex',
        name: 'High Priest Vex',
        src: highPriestVexPortrait,
        aliases: ['priest', 'cult-leader']
    },
    {
        id: 'stone-gargoyle',
        name: 'Stone Gargoyle',
        src: stoneGargoylePortrait,
        aliases: ['gargoyle', 'statue-sentinel']
    },
    {
        id: 'harpy-matriarch',
        name: 'Harpy Matriarch',
        src: harpyMatriarchPortrait,
        aliases: ['harpy', 'matriarch']
    },
    {
        id: 'mind-projection',
        name: 'Mind Projection',
        src: mindProjectionPortrait,
        aliases: ['specter', 'mind-flayer-gost']
    },
    {
        id: 'sanguine-pontiff',
        name: 'Sanguine Pontiff',
        src: sanguinePontiffPortrait,
        aliases: ['lich', 'pontiff']
    },
    {
        id: 'blood-avatar',
        name: 'Blood Avatar',
        src: bloodAvatarPortrait,
        aliases: ['pit-fiend', 'avatar-of-blood']
    }
];

/**
 * Get portrait by exact enemy ID or by checking aliases
 */
export function getEnemyPortrait(enemyId: string): EnemyPortrait | undefined {
    const normalizedId = enemyId.toLowerCase().replace(/\s+/g, '-');

    // First try exact match
    const exactMatch = enemyPortraits.find(p => p.id === normalizedId);
    if (exactMatch) return exactMatch;

    // Then try aliases
    return enemyPortraits.find(p =>
        p.aliases?.some(alias => normalizedId.includes(alias) || alias.includes(normalizedId))
    );
}

/**
 * Get portrait source URL for an enemy
 */
export function getEnemyPortraitSrc(enemyId: string): string | undefined {
    return getEnemyPortrait(enemyId)?.src;
}

/**
 * Get portrait by matching enemy name (fuzzy match)
 */
export function getEnemyPortraitByName(name: string): EnemyPortrait | undefined {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '-');

    // Try to find a portrait whose name or id is contained in the enemy name
    return enemyPortraits.find(p => {
        const pName = p.name.toLowerCase().replace(/\s+/g, '-');
        return normalizedName.includes(pName) ||
            normalizedName.includes(p.id) ||
            p.aliases?.some(alias => normalizedName.includes(alias));
    });
}
