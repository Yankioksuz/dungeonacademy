import type { Condition, ConditionType } from '@/types';

interface Combatant {
    name: string;
    conditions: Condition[];
}

export function hasCondition(entity: Combatant, type: ConditionType): boolean {
    return entity.conditions.some(c => c.type === type);
}

export function canAct(entity: Combatant): boolean {
    const incapacitatingConditions: ConditionType[] = [
        'incapacitated',
        'stunned',
        'paralyzed',
        'unconscious',
        'petrified'
    ];

    return !entity.conditions.some(c => incapacitatingConditions.includes(c.type));
}

export type RollType = 'normal' | 'advantage' | 'disadvantage';

export function getCombatAdvantage(
    attacker: Combatant,
    defender: Combatant,
    attackType: 'melee' | 'ranged'
): RollType {
    let advantage = 0; // +1 for advantage, -1 for disadvantage

    // --- Attacker Conditions ---
    if (hasCondition(attacker, 'blinded')) advantage--;
    if (hasCondition(attacker, 'poisoned')) advantage--;
    if (hasCondition(attacker, 'frightened')) advantage--;
    if (hasCondition(attacker, 'restrained')) advantage--;
    if (hasCondition(attacker, 'prone')) advantage--; // Prone gives disadvantage on attacks

    if (hasCondition(attacker, 'invisible')) advantage++;

    // --- Defender Conditions ---
    if (hasCondition(defender, 'blinded')) advantage++; // Attacker is unseen
    if (hasCondition(defender, 'stunned')) advantage++;
    if (hasCondition(defender, 'paralyzed')) advantage++;
    if (hasCondition(defender, 'unconscious')) advantage++;
    if (hasCondition(defender, 'petrified')) advantage++;
    if (hasCondition(defender, 'restrained')) advantage++;

    if (hasCondition(defender, 'prone')) {
        if (attackType === 'melee') {
            advantage++; // Advantage on melee attacks vs prone
        } else {
            advantage--; // Disadvantage on ranged attacks vs prone
        }
    }

    if (hasCondition(defender, 'invisible')) advantage--; // Attacker can't see defender

    // --- Racial Traits ---
    // Note: We need to know if the defender has specific traits. 
    // Since Combatant interface is simple, we might need to check 'race' if available or rely on a 'traits' list if we expand Combatant.
    // For now, assuming we might pass a fuller object or check name/id if they are players.
    // Ideally, Combatant should have a 'traits' array. Let's assume we can access it or it's added.
    // Since we can't easily change the interface everywhere right now without breaking things, 
    // we will check for specific conditions that represent these traits if they were added as permanent conditions/buffs, 
    // OR we just check if the entity has a property.

    // However, the cleanest way is to check if the defender has the trait.
    // Let's assume 'traits' is optional on Combatant for now to avoid breaking changes, or we cast.
    const def = defender as any;
    if (def.traits) {
        // Brave (Halfling): Advantage on saves vs Frightened. 
        // This function calculates attack advantage, not save advantage. 
        // BUT, if we were calculating a save, we'd need a different function.
        // getCombatAdvantage is currently for ATTACK ROLLS.

        // Wait, 'Brave' gives advantage on SAVING THROWS against being frightened.
        // 'Fey Ancestry' gives advantage on SAVING THROWS against being charmed.
        // 'Dwarven Resilience' gives advantage on SAVING THROWS against poison.
        // 'Gnome Cunning' gives advantage on Int/Wis/Cha SAVES vs magic.

        // This function is for ATTACK rolls (melee/ranged).
        // None of these traits directly affect incoming attack rolls (AC) or outgoing attack rolls (To Hit),
        // EXCEPT for things like 'Invisible' or 'Prone'.

        // So actually, getCombatAdvantage doesn't need to change for these specific SAVE-based traits.
        // We need a `getSavingThrowAdvantage` function!
    }

    // --- Result ---
    if (advantage > 0) return 'advantage';
    if (advantage < 0) return 'disadvantage';
    return 'normal';
}

export function getSavingThrowAdvantage(
    actor: Combatant,
    saveType: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
    effectType?: 'poison' | 'charm' | 'fear' | 'magic'
): RollType {
    let advantage = 0;
    const actorAny = actor as any;
    const traits = actorAny.traits || [];

    // Brave
    if (effectType === 'fear' && traits.includes('Brave')) advantage++;

    // Fey Ancestry
    if (effectType === 'charm' && traits.includes('Fey Ancestry')) advantage++;

    // Dwarven Resilience
    if (effectType === 'poison' && traits.includes('Dwarven Resilience')) advantage++;

    // Gnome Cunning
    if (effectType === 'magic' && ['intelligence', 'wisdom', 'charisma'].includes(saveType) && traits.includes('Gnome Cunning')) advantage++;

    if (advantage > 0) return 'advantage';
    if (advantage < 0) return 'disadvantage';
    return 'normal';
}
