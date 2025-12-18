/**
 * Condition Effects Utility
 * Processes mechanical effects of conditions at turn start/end.
 */

import type { CombatEnemy, PlayerCharacter, ConditionType, AbilityName } from '@/types';

export interface TurnStartResult {
    damage: number;
    damageType: string;
    logs: { message: string; type: 'damage' | 'info' | 'condition' }[];
    updatedEntity: PlayerCharacter | CombatEnemy;
}

/**
 * Roll a single die of given sides
 */
function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Process conditions at the start of an entity's turn.
 * Handles ongoing damage (poison, burning, etc.).
 */
export function processStartOfTurnConditions(
    entity: PlayerCharacter | CombatEnemy,
    entityName: string
): TurnStartResult {
    let totalDamage = 0;
    let damageType = '';
    const logs: TurnStartResult['logs'] = [];
    const updatedEntity = entity;

    const conditions = entity.conditions || [];

    // Process each condition's start-of-turn effects
    for (const condition of conditions) {
        switch (condition.type) {
            case 'poisoned':
                // Some poison sources deal ongoing damage
                // Check if this poison has ongoing damage via source or metadata
                // For general poisoned condition, deal 1d4 poison damage
                if (condition.source?.toLowerCase().includes('venom') ||
                    condition.source?.toLowerCase().includes('poison')) {
                    const poisonDmg = rollDie(4);
                    totalDamage += poisonDmg;
                    damageType = 'poison';
                    logs.push({
                        message: `${entityName} takes ${poisonDmg} poison damage (${condition.source || 'Poisoned'})!`,
                        type: 'damage'
                    });
                }
                break;

            case 'hexed':
                // Hex doesn't deal damage at turn start (only on hit), but log reminder
                logs.push({
                    message: `${entityName} is Hexed and takes extra damage on attacks.`,
                    type: 'info'
                });
                break;

            // Future: Burning, Bleeding conditions
            // case 'burning':
            //     const fireDmg = rollDie(6);
            //     totalDamage += fireDmg;
            //     damageType = 'fire';
            //     logs.push({ message: `${entityName} takes ${fireDmg} fire damage (Burning)!`, type: 'damage' });
            //     break;
        }
    }

    return {
        damage: totalDamage,
        damageType,
        logs,
        updatedEntity
    };
}

/**
 * Check if an entity auto-fails saves of a specific type due to conditions.
 * - Paralyzed, Stunned, Unconscious, Petrified → auto-fail STR/DEX saves.
 */
export function autoFailsSave(
    entity: PlayerCharacter | CombatEnemy,
    saveType: AbilityName
): boolean {
    const autoFailConditions: ConditionType[] = [
        'paralyzed',
        'stunned',
        'unconscious',
        'petrified'
    ];

    const hasAutoFailCondition = (entity.conditions || []).some(c =>
        autoFailConditions.includes(c.type)
    );

    if (!hasAutoFailCondition) return false;

    // These conditions only auto-fail STR and DEX saves
    if (saveType === 'strength' || saveType === 'dexterity') {
        return true;
    }

    return false;
}

/**
 * Check if attacks against this entity are automatic critical hits.
 * - Paralyzed or Unconscious → melee attacks within 5ft are auto-crits.
 */
export function isAutoCritTarget(
    entity: PlayerCharacter | CombatEnemy,
    attackType: 'melee' | 'ranged'
): boolean {
    if (attackType !== 'melee') return false;

    const autoCritConditions: ConditionType[] = ['paralyzed', 'unconscious'];

    return (entity.conditions || []).some(c =>
        autoCritConditions.includes(c.type)
    );
}

/**
 * Get attack roll modifier for an entity based on their conditions.
 * Returns 'advantage', 'disadvantage', or 'normal'.
 */
export function getEntityAttackModifier(
    attacker: PlayerCharacter | CombatEnemy,
    defender: PlayerCharacter | CombatEnemy,
    attackType: 'melee' | 'ranged'
): 'advantage' | 'disadvantage' | 'normal' {
    let advantageCount = 0;

    const attackerConditions = attacker.conditions || [];
    const defenderConditions = defender.conditions || [];

    // --- Attacker Disadvantages ---
    if (attackerConditions.some(c => c.type === 'blinded')) advantageCount--;
    if (attackerConditions.some(c => c.type === 'poisoned')) advantageCount--;
    if (attackerConditions.some(c => c.type === 'frightened')) advantageCount--;
    if (attackerConditions.some(c => c.type === 'restrained')) advantageCount--;
    if (attackerConditions.some(c => c.type === 'prone')) advantageCount--;

    // --- Attacker Advantages ---
    if (attackerConditions.some(c => c.type === 'invisible')) advantageCount++;
    if (attackerConditions.some(c => c.type === 'hidden')) advantageCount++;

    // --- Defender-based Advantages (attacker gets advantage) ---
    if (defenderConditions.some(c => c.type === 'blinded')) advantageCount++;
    if (defenderConditions.some(c => c.type === 'paralyzed')) advantageCount++;
    if (defenderConditions.some(c => c.type === 'petrified')) advantageCount++;
    if (defenderConditions.some(c => c.type === 'restrained')) advantageCount++;
    if (defenderConditions.some(c => c.type === 'stunned')) advantageCount++;
    if (defenderConditions.some(c => c.type === 'unconscious')) advantageCount++;

    // Prone: Advantage if melee, Disadvantage if ranged
    if (defenderConditions.some(c => c.type === 'prone')) {
        if (attackType === 'melee') {
            advantageCount++;
        } else {
            advantageCount--;
        }
    }

    // Invisible defender gives attacker disadvantage
    if (defenderConditions.some(c => c.type === 'invisible')) advantageCount--;

    // --- Result ---
    if (advantageCount > 0) return 'advantage';
    if (advantageCount < 0) return 'disadvantage';
    return 'normal';
}
