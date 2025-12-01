import type { Condition, ConditionType, PlayerCharacter, CombatEnemy } from '@/types';

/**
 * Condition definitions with descriptions and mechanical effects
 */
export const CONDITION_DEFINITIONS: Record<ConditionType, Omit<Condition, 'type' | 'duration' | 'source'>> = {
    blinded: {
        name: 'Blinded',
        description: 'A blinded creature can\'t see and automatically fails ability checks that require sight. Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage.',
    },
    charmed: {
        name: 'Charmed',
        description: 'A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on ability checks to interact socially with the creature.',
    },
    deafened: {
        name: 'Deafened',
        description: 'A deafened creature can\'t hear and automatically fails ability checks that require hearing.',
    },
    frightened: {
        name: 'Frightened',
        description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can\'t willingly move closer to the source of its fear.',
    },
    grappled: {
        name: 'Grappled',
        description: 'A grappled creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the reach of the grappler.',
    },
    incapacitated: {
        name: 'Incapacitated',
        description: 'An incapacitated creature can\'t take actions or reactions.',
    },
    invisible: {
        name: 'Invisible',
        description: 'An invisible creature is impossible to see without the aid of magic or a special sense. The creature\'s location can be detected by noise or tracks. Attack rolls against the creature have disadvantage, and the creature\'s attack rolls have advantage.',
    },
    paralyzed: {
        name: 'Paralyzed',
        description: 'A paralyzed creature is incapacitated and can\'t move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet.',
    },
    petrified: {
        name: 'Petrified',
        description: 'A petrified creature is transformed, along with any nonmagical objects it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging. The creature is incapacitated, can\'t move or speak, and is unaware of its surroundings. Attack rolls against the creature have advantage. The creature automatically fails Strength and Dexterity saving throws. The creature has resistance to all damage and is immune to poison and disease.',
    },
    poisoned: {
        name: 'Poisoned',
        description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
    },
    prone: {
        name: 'Prone',
        description: 'A prone creature\'s only movement option is to crawl, unless it stands up and thereby ends the condition. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.',
    },
    restrained: {
        name: 'Restrained',
        description: 'A restrained creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws.',
    },
    stunned: {
        name: 'Stunned',
        description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage.',
    },
    unconscious: {
        name: 'Unconscious',
        description: 'An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings. The creature drops whatever it\'s holding and falls prone. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.',
    },
};

/**
 * Add a condition to an entity (character or enemy)
 */
export function addCondition<T extends PlayerCharacter | CombatEnemy>(
    entity: T,
    conditionType: ConditionType,
    duration?: number,
    source?: string
): T {
    const definition = CONDITION_DEFINITIONS[conditionType];

    const condition: Condition = {
        type: conditionType,
        name: definition.name,
        description: definition.description,
        duration,
        source,
    };

    // Check if condition already exists
    const existingIndex = entity.conditions.findIndex(c => c.type === conditionType);

    if (existingIndex >= 0) {
        // Update existing condition
        const updatedConditions = [...entity.conditions];
        updatedConditions[existingIndex] = condition;
        return { ...entity, conditions: updatedConditions };
    }

    // Add new condition
    return {
        ...entity,
        conditions: [...entity.conditions, condition],
    };
}

/**
 * Remove a condition from an entity
 */
export function removeCondition<T extends PlayerCharacter | CombatEnemy>(
    entity: T,
    conditionType: ConditionType
): T {
    return {
        ...entity,
        conditions: entity.conditions.filter(c => c.type !== conditionType),
    };
}

/**
 * Check if entity has a specific condition
 */
export function hasCondition(
    entity: PlayerCharacter | CombatEnemy,
    conditionType: ConditionType
): boolean {
    return entity.conditions.some(c => c.type === conditionType);
}

/**
 * Get all active conditions on an entity
 */
export function getActiveConditions(
    entity: PlayerCharacter | CombatEnemy
): Condition[] {
    return entity.conditions;
}

/**
 * Decrement condition durations (call at end of turn)
 * Returns updated entity with expired conditions removed
 */
export function decrementConditionDurations<T extends PlayerCharacter | CombatEnemy>(
    entity: T
): T {
    const updatedConditions = entity.conditions
        .map(condition => {
            if (condition.duration === undefined || condition.duration === -1) {
                return condition; // Indefinite duration
            }
            return { ...condition, duration: condition.duration - 1 };
        })
        .filter(condition => {
            if (condition.duration === undefined || condition.duration === -1) {
                return true; // Keep indefinite conditions
            }
            return condition.duration > 0; // Remove expired conditions
        });

    return { ...entity, conditions: updatedConditions };
}

/**
 * Check if entity is incapacitated (can't take actions)
 */
export function isIncapacitated(entity: PlayerCharacter | CombatEnemy): boolean {
    return hasCondition(entity, 'incapacitated') ||
        hasCondition(entity, 'paralyzed') ||
        hasCondition(entity, 'petrified') ||
        hasCondition(entity, 'stunned') ||
        hasCondition(entity, 'unconscious');
}

/**
 * Check if attacks against entity have advantage
 */
export function attacksHaveAdvantage(entity: PlayerCharacter | CombatEnemy): boolean {
    return hasCondition(entity, 'blinded') ||
        hasCondition(entity, 'invisible') ||
        hasCondition(entity, 'paralyzed') ||
        hasCondition(entity, 'petrified') ||
        hasCondition(entity, 'prone') ||
        hasCondition(entity, 'restrained') ||
        hasCondition(entity, 'stunned') ||
        hasCondition(entity, 'unconscious');
}

/**
 * Check if entity's attacks have disadvantage
 */
export function attacksHaveDisadvantage(entity: PlayerCharacter | CombatEnemy): boolean {
    return hasCondition(entity, 'blinded') ||
        hasCondition(entity, 'poisoned') ||
        hasCondition(entity, 'prone') ||
        hasCondition(entity, 'restrained');
}
