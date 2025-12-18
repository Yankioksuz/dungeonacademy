import type { Condition, ConditionType, PlayerCharacter, CombatEnemy } from '@/types';
import { CONDITIONS } from '@/data/conditions';

export class ConditionManager {

    static addCondition(
        entity: PlayerCharacter | CombatEnemy,
        type: ConditionType,
        duration: number = -1,
        source?: string
    ): PlayerCharacter | CombatEnemy {
        // Check if already has condition
        const existingIndex = (entity.conditions || []).findIndex(c => c.type === type);
        const def = CONDITIONS[type];

        if (!def) {
            console.warn(`Attempted to add unknown condition: ${type}`);
            return entity;
        }

        const newCondition: Condition = {
            type,
            name: def.name,
            description: def.description,
            duration,
            source
        };

        const newConditions = [...(entity.conditions || [])];

        if (existingIndex >= 0) {
            // Overwrite if new duration is longer, or just refresh it
            // For simplicity, we just replace it
            newConditions[existingIndex] = newCondition;
        } else {
            newConditions.push(newCondition);
        }

        return {
            ...entity,
            conditions: newConditions
        };
    }

    static removeCondition(
        entity: PlayerCharacter | CombatEnemy,
        type: ConditionType
    ): PlayerCharacter | CombatEnemy {
        return {
            ...entity,
            conditions: (entity.conditions || []).filter(c => c.type !== type)
        };
    }

    static updateConditions(
        entity: PlayerCharacter | CombatEnemy
    ): { entity: PlayerCharacter | CombatEnemy; expired: Condition[] } {
        const expired: Condition[] = [];
        const activeConditions: Condition[] = [];

        (entity.conditions || []).forEach(c => {
            // If duration is -1, it lasts indefinitely (until manually removed)
            if (c.duration === -1) {
                activeConditions.push(c);
                return;
            }

            // Decrement duration
            // Note: This assumes updateConditions is called once per round
            const newDuration = (c.duration || 0) - 1;

            if (newDuration > 0) {
                activeConditions.push({ ...c, duration: newDuration });
            } else {
                expired.push(c);
            }
        });

        return {
            entity: {
                ...entity,
                conditions: activeConditions
            },
            expired
        };
    }

    static hasCondition(entity: PlayerCharacter | CombatEnemy, type: ConditionType): boolean {
        return (entity.conditions || []).some(c => c.type === type);
    }

    static getCondition(entity: PlayerCharacter | CombatEnemy, type: ConditionType): Condition | undefined {
        return (entity.conditions || []).find(c => c.type === type);
    }
}
