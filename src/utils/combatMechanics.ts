import type { CombatEnemy, PlayerCharacter, RollModifier } from '@/types';
import { ConditionManager } from '@/managers/ConditionManager';

export function getAttackRollModifier(
    attacker: PlayerCharacter | CombatEnemy,
    defender: PlayerCharacter | CombatEnemy,
    attackType: 'melee' | 'ranged' = 'melee'
): RollModifier {
    let advantage = false;
    let disadvantage = false;

    // --- ATTACKER CONDITIONS ---

    // Blinded: Disadvantage on attacks
    if (ConditionManager.hasCondition(attacker, 'blinded')) {
        disadvantage = true;
    }

    // Poisoned: Disadvantage on attack rolls
    if (ConditionManager.hasCondition(attacker, 'poisoned')) {
        disadvantage = true;
    }

    // Prone: Disadvantage on attack rolls
    if (ConditionManager.hasCondition(attacker, 'prone')) {
        disadvantage = true;
    }

    // Restrained: Disadvantage on attack rolls
    if (ConditionManager.hasCondition(attacker, 'restrained')) {
        disadvantage = true;
    }

    // Frightened: Disadvantage if source is in sight (Simplified: Always disadvantage if frightened for now)
    if (ConditionManager.hasCondition(attacker, 'frightened')) {
        disadvantage = true;
    }

    // Invisible: Advantage on attacks
    if (ConditionManager.hasCondition(attacker, 'invisible') || ConditionManager.hasCondition(attacker, 'hidden')) {
        advantage = true;
    }

    // Reckless (Custom): Advantage on STR attacks (Assuming STR for melee for simplicity or checks)
    if (ConditionManager.hasCondition(attacker, 'reckless') && attackType === 'melee') {
        advantage = true;
    }

    // --- DEFENDER CONDITIONS ---

    // Blinded: Attacks against have Advantage
    if (ConditionManager.hasCondition(defender, 'blinded')) {
        advantage = true;
    }

    // Paralyzed/Petrified/Stunned/Unconscious: Attacks against have Advantage
    if (
        ConditionManager.hasCondition(defender, 'paralyzed') ||
        ConditionManager.hasCondition(defender, 'petrified') ||
        ConditionManager.hasCondition(defender, 'stunned') ||
        ConditionManager.hasCondition(defender, 'unconscious') ||
        ConditionManager.hasCondition(defender, 'restrained')
    ) {
        advantage = true;
    }

    // Invisible: Attacks against have Disadvantage
    if (ConditionManager.hasCondition(defender, 'invisible') || ConditionManager.hasCondition(defender, 'hidden')) {
        disadvantage = true;
    }

    // Prone: 
    // - Attacks from 5ft (Melee) have Advantage
    // - Attacks from >5ft (Ranged) have Disadvantage
    if (ConditionManager.hasCondition(defender, 'prone')) {
        if (attackType === 'melee') {
            advantage = true;
        } else {
            disadvantage = true;
        }
    }

    // Reckless (Custom): Attacks against have Advantage
    if (ConditionManager.hasCondition(defender, 'reckless')) {
        advantage = true;
    }

    // Cloak of Displacement (Custom logic check could go here)
    // If defender has displacement and NOT incapacitated/restrained... -> Disadvantage

    // --- FINAL CALCULATION ---

    if (advantage && disadvantage) {
        return 'normal';
    }
    if (advantage) {
        return 'advantage';
    }
    if (disadvantage) {
        return 'disadvantage';
    }

    return 'normal';
}

export function canTakeAction(entity: PlayerCharacter | CombatEnemy): boolean {
    if (
        ConditionManager.hasCondition(entity, 'incapacitated') ||
        ConditionManager.hasCondition(entity, 'paralyzed') ||
        ConditionManager.hasCondition(entity, 'petrified') ||
        ConditionManager.hasCondition(entity, 'stunned') ||
        ConditionManager.hasCondition(entity, 'unconscious')
    ) {
        return false;
    }
    return true;
}
