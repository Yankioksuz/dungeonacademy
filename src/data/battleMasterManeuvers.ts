/**
 * Battle Master Maneuvers - D&D 5e Fighter Subclass
 * Each maneuver consumes one superiority die and has a specific effect.
 */

export interface Maneuver {
    id: string;
    name: string;
    description: string;
    timing: 'on-hit' | 'on-attack' | 'bonus-action' | 'reaction';
    effect: ManeuverEffect;
}

export interface ManeuverEffect {
    // Damage effects
    addDamageDie?: boolean; // Add superiority die to damage

    // Attack modifiers
    addToAttackRoll?: boolean; // Add superiority die to attack roll (Precision Attack)

    // Target effects
    targetSave?: 'strength' | 'dexterity' | 'constitution' | 'wisdom';
    onFailedSave?: {
        condition?: 'prone' | 'frightened' | 'pushed' | 'disarmed' | 'goaded';
        pushDistance?: number; // feet
        extraDamage?: boolean; // superiority die added to damage
    };

    // Self effects
    acBonus?: boolean; // Add superiority die to AC (Parry, Riposte)
    tempHpFromDie?: boolean; // Gain temp HP equal to die roll (Rally)
    extraMovement?: boolean; // Add die roll × 5 to movement (Maneuvering Attack, Evasive Footwork)

    // Special
    grantsAllyMovement?: boolean; // Allow ally to move (Commander's Strike, Maneuvering)
}

export const BATTLE_MASTER_MANEUVERS: Maneuver[] = [
    {
        id: 'precision-attack',
        name: 'Precision Attack',
        description: 'When you make a weapon attack roll, you can expend one superiority die to add it to the roll. You can use this maneuver before or after making the attack roll, but before any effects are applied.',
        timing: 'on-attack',
        effect: {
            addToAttackRoll: true,
        },
    },
    {
        id: 'trip-attack',
        name: 'Trip Attack',
        description: 'When you hit a creature with a weapon attack, you can expend one superiority die to attempt to knock the target down. Add the die to damage. If the target is Large or smaller, it must make a Strength saving throw or be knocked prone.',
        timing: 'on-hit',
        effect: {
            addDamageDie: true,
            targetSave: 'strength',
            onFailedSave: {
                condition: 'prone',
            },
        },
    },
    {
        id: 'menacing-attack',
        name: 'Menacing Attack',
        description: 'When you hit a creature with a weapon attack, you can expend one superiority die to attempt to frighten the target. Add the die to damage. The target must make a Wisdom saving throw or be frightened of you until the end of your next turn.',
        timing: 'on-hit',
        effect: {
            addDamageDie: true,
            targetSave: 'wisdom',
            onFailedSave: {
                condition: 'frightened',
            },
        },
    },
    {
        id: 'pushing-attack',
        name: 'Pushing Attack',
        description: 'When you hit a creature with a weapon attack, you can expend one superiority die to attempt to drive the target back. Add the die to damage. If the target is Large or smaller, it must make a Strength saving throw or be pushed up to 15 feet away.',
        timing: 'on-hit',
        effect: {
            addDamageDie: true,
            targetSave: 'strength',
            onFailedSave: {
                condition: 'pushed',
                pushDistance: 15,
            },
        },
    },
    {
        id: 'disarming-attack',
        name: 'Disarming Attack',
        description: 'When you hit a creature with a weapon attack, you can expend one superiority die to attempt to disarm the target. Add the die to damage. The target must make a Strength saving throw or drop one item of your choice that it\'s holding.',
        timing: 'on-hit',
        effect: {
            addDamageDie: true,
            targetSave: 'strength',
            onFailedSave: {
                condition: 'disarmed',
            },
        },
    },
    {
        id: 'goading-attack',
        name: 'Goading Attack',
        description: 'When you hit a creature with a weapon attack, you can expend one superiority die to attempt to goad the target into attacking you. Add the die to damage. The target must make a Wisdom saving throw or have disadvantage on all attack rolls against targets other than you until the end of your next turn.',
        timing: 'on-hit',
        effect: {
            addDamageDie: true,
            targetSave: 'wisdom',
            onFailedSave: {
                condition: 'goaded',
            },
        },
    },
    {
        id: 'riposte',
        name: 'Riposte',
        description: 'When a creature misses you with a melee attack, you can use your reaction and expend one superiority die to make a melee weapon attack against the creature. If you hit, add the superiority die to the damage.',
        timing: 'reaction',
        effect: {
            addDamageDie: true,
        },
    },
    {
        id: 'parry',
        name: 'Parry',
        description: 'When another creature damages you with a melee attack, you can use your reaction and expend one superiority die to reduce the damage by the number you roll plus your Dexterity modifier.',
        timing: 'reaction',
        effect: {
            acBonus: true, // Damage reduction in this case
        },
    },
    {
        id: 'rally',
        name: 'Rally',
        description: 'On your turn, you can use a bonus action and expend one superiority die to bolster the resolve of one of your companions. Choose an ally who can see or hear you. That creature gains temporary hit points equal to the superiority die roll + your Charisma modifier.',
        timing: 'bonus-action',
        effect: {
            tempHpFromDie: true, // Grants temp HP to self (simplified)
        },
    },
    {
        id: 'feinting-attack',
        name: 'Feinting Attack',
        description: 'You can expend one superiority die and use a bonus action on your turn to feint, choosing one creature within 5 feet of you as your target. You have advantage on your next attack roll against that creature this turn. If that attack hits, add the superiority die to the damage.',
        timing: 'bonus-action',
        effect: {
            addDamageDie: true, // Applied when next attack hits
        },
    },
];

/**
 * Get the DC for maneuver saving throws.
 * DC = 8 + proficiency bonus + STR or DEX modifier (whichever is higher)
 */
export function getManeuverSaveDC(
    proficiencyBonus: number,
    strMod: number,
    dexMod: number
): number {
    return 8 + proficiencyBonus + Math.max(strMod, dexMod);
}

/**
 * Roll a superiority die based on fighter level.
 */
export function rollSuperiorityDie(level: number): number {
    let dieSides = 8;
    if (level >= 18) dieSides = 12;
    else if (level >= 10) dieSides = 10;

    return Math.floor(Math.random() * dieSides) + 1;
}
