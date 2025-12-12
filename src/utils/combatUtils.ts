import type { Condition, ConditionType } from '@/types';

interface Combatant {
    name: string;
    conditions: Condition[];
    traits?: string[];
    feats?: string[];
    features?: string[];
}

export function hasCondition(entity: Combatant, type: ConditionType): boolean {
    return entity.conditions?.some(c => c.type === type) || false;
}

export function canAct(entity: Combatant): boolean {
    const incapacitatingConditions: ConditionType[] = [
        'incapacitated',
        'stunned',
        'paralyzed',
        'unconscious',
        'petrified'
    ];

    return !(entity.conditions?.some(c => incapacitatingConditions.includes(c.type)) || false);
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
    if (hasCondition(attacker, 'armor-not-proficient')) advantage--; // Armor non-proficiency penalty

    if (hasCondition(attacker, 'invisible')) advantage++;
    if (hasCondition(attacker, 'reckless')) advantage++; // Reckless Attack (Attacker)

    // --- Defender Conditions ---
    if (hasCondition(defender, 'blinded')) advantage++; // Attacker is unseen
    if (hasCondition(defender, 'reckless')) advantage++; // Reckless Attack (Defender grants advantage)
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

    // --- Result ---
    if (advantage > 0) return 'advantage';
    if (advantage < 0) return 'disadvantage';
    return 'normal';
}

export function getSavingThrowAdvantage(
    actor: Combatant,
    saveType: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
    effectType?: 'poison' | 'charm' | 'fear' | 'magic' | 'concentration'
): RollType {
    let advantage = 0;
    const traits = actor.traits || [];
    const feats = actor.feats || [];
    const features = actor.features || [];

    // Brave
    if (effectType === 'fear' && traits.includes('Brave')) advantage++;

    // Fey Ancestry
    if (effectType === 'charm' && traits.includes('Fey Ancestry')) advantage++;

    // Dwarven Resilience
    if (effectType === 'poison' && traits.includes('Dwarven Resilience')) advantage++;

    // Gnome Cunning
    if (effectType === 'magic' && ['intelligence', 'wisdom', 'charisma'].includes(saveType) && traits.includes('Gnome Cunning')) advantage++;

    // Danger Sense (Barbarian)
    // "Advantage on Dexterity saving throws against effects that you can see"
    // Assuming for now that most Dex saves in combat (fireball, traps) are visible
    if (saveType === 'dexterity' && features.includes('Danger Sense')) {
        // Danger Sense doesn't work if blinded/deafened/incapacitated
        if (!hasCondition(actor, 'blinded') && !hasCondition(actor, 'deafened') && canAct(actor)) {
            advantage++;
        }
    }

    // War Caster feat: advantage on concentration saves
    if (effectType === 'concentration' && saveType === 'constitution' && feats.includes('war-caster')) {
        advantage++;
    }

    // Mage Slayer feat: advantage on saves vs spells cast within 5 feet
    // Note: This is a simplification - in full implementation, would need distance check
    if (effectType === 'magic' && feats.includes('mage-slayer')) {
        advantage++;
    }

    if (advantage > 0) return 'advantage';
    if (advantage < 0) return 'disadvantage';
    return 'normal';
}

export function calculateArmorClass(
    character: Combatant & {
        dexterity?: number;
        constitution?: number;
        wisdom?: number;
        equippedArmor?: { armorClass: number; type: string };
        equippedShield?: { armorClass: number };
        class?: { id: string };
        subclass?: { id: string };
    }
): number {
    let ac = 10;
    const dexMod = Math.floor(((character.dexterity || 10) - 10) / 2);

    if (character.equippedArmor) {
        ac = character.equippedArmor.armorClass;
        // Add Dex based on armor type (simplified logic: light=full, medium=max 2, heavy=0)
        // For now trusting the item's AC or just adding Dex if it's not heavy. 
        // Assuming light/medium for simplicity or checking type if available.
        if (character.equippedArmor.type === 'light') {
            ac += dexMod;
        } else if (character.equippedArmor.type === 'medium') {
            ac += Math.min(2, dexMod);
        }
        // Heavy armor adds no dex
    } else {
        // Unarmored
        ac = 10 + dexMod;

        // Draconic Resilience (Sorcerer)
        if (character.class?.id === 'sorcerer' && character.subclass?.id === 'draconic') {
            ac = 13 + dexMod;
        }

        // Unarmored Defense (Monk)
        if (character.class?.id === 'monk') {
            const wisMod = Math.floor(((character.wisdom || 10) - 10) / 2);
            ac = 10 + dexMod + wisMod;
        }

        // Unarmored Defense (Barbarian)
        if (character.class?.id === 'barbarian') {
            const conMod = Math.floor(((character.constitution || 10) - 10) / 2);
            const barbAc = 10 + dexMod + conMod;
            // Use the higher of the two if multiple apply (though usually they don't stack)
            if (barbAc > ac) ac = barbAc;
        }
    }

    if (character.equippedShield) {
        ac += character.equippedShield.armorClass;
    }

    // Defensive Duelist or other buffs could be added here

    return ac;
}

export function calculateDamage(
    baseDamage: number,
    damageDice: string, // e.g., "1d8"
    attacker: Combatant & {
        class?: { id: string };
        subclass?: { id: string };
        hasFeatures?: string[];
    },
    defender: Combatant & {
        hitPoints?: number;
        maxHitPoints?: number;
    },
    isCrit: boolean = false
): { total: number; breakdown: string } {
    // const diceParts = damageDice.split('+'); // simplified parsing
    // In a real function we'd parse this fully. 
    // For now assuming we just return base + modifications or handle it elsewhere if 'baseDamage' is final roll.
    // If baseDamage IS the rolled value:

    let total = baseDamage;
    const parts: string[] = [`Base (${damageDice}): ${baseDamage}`];

    // Colossus Slayer (Ranger - Hunter)
    // "1d8 extra damage if target is below max HP"
    if (
        attacker.class?.id === 'ranger' &&
        attacker.subclass?.id === 'hunter' &&
        defender.hitPoints !== undefined &&
        defender.maxHitPoints !== undefined &&
        defender.hitPoints < defender.maxHitPoints
    ) {
        // Roll 1d8 (Average 4 for now, or use random if allowed here)
        // Ideally should roll, but let's assume average or random if we import math.
        const colossusDmg = Math.floor(Math.random() * 8) + 1;
        total += colossusDmg;
        parts.push(`Colossus Slayer: ${colossusDmg}`);
    }

    // Critical Hit processing would normally double dice here if passed in dice count
    if (isCrit) {
        // Simplified crit logic: double total (standard 5e is double DICE, but this is a helper)
        total = Math.floor(total * 1.5); // Homebrew crit or placeholder
        parts.push('Critical Hit (1.5x)');
    }

    return { total, breakdown: parts.join(', ') };
}

// --- Enemy Combat Utilities ---

const DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing',
    'poison', 'psychic', 'radiant', 'slashing', 'thunder'
] as const;

export type DamageType = typeof DAMAGE_TYPES[number];

export const detectDamageType = (damage: string): DamageType => {
    const normalized = damage.toLowerCase();
    const match = DAMAGE_TYPES.find((type) => normalized.includes(type));
    return match || 'slashing';
};

const abilityLookup: Record<string, 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'> = {
    str: 'strength',
    strength: 'strength',
    dex: 'dexterity',
    dexterity: 'dexterity',
    con: 'constitution',
    constitution: 'constitution',
    int: 'intelligence',
    intelligence: 'intelligence',
    wis: 'wisdom',
    wisdom: 'wisdom',
    cha: 'charisma',
    charisma: 'charisma',
};

interface EnemyLike {
    abilityScores?: Partial<Record<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', number>>;
    savingThrows?: Partial<Record<string, number>>;
    savingThrowBonus?: number;
    conditionImmunities?: string[];
    damageImmunities?: string[];
    damageResistances?: string[];
    damageVulnerabilities?: string[];
}

export const getEnemyAbilityMod = (enemy: EnemyLike, ability: string): number => {
    const key = abilityLookup[ability.toLowerCase()] || 'strength';
    const score = enemy.abilityScores?.[key];
    if (typeof score === 'number') {
        return Math.floor((score - 10) / 2);
    }
    return 0;
};

export const getEnemySavingThrowBonus = (enemy: EnemyLike, ability: string): number => {
    const key = abilityLookup[ability.toLowerCase()] || 'strength';
    const shortKey = key.slice(0, 3);
    const explicit = enemy.savingThrows?.[key] ?? enemy.savingThrows?.[shortKey];
    if (typeof explicit === 'number') return explicit;
    if (enemy.savingThrowBonus) return enemy.savingThrowBonus;
    return getEnemyAbilityMod(enemy, key);
};

export const isEnemyConditionImmune = (enemy: EnemyLike, condition: string): boolean => {
    const immunities = (enemy.conditionImmunities || []).map(i => i.toLowerCase());
    return immunities.includes(condition.toLowerCase());
};

export const adjustDamageForDefenses = (
    enemy: EnemyLike,
    amount: number,
    damageType: string,
    options?: { isSpell?: boolean; isMagical?: boolean }
): { adjustedDamage: number; note: string | null } => {
    const type = (damageType || 'slashing').toLowerCase();
    const isMagical = options?.isSpell || options?.isMagical;
    const matchType = (entries?: string[]) =>
        (entries || []).some((entry) => {
            const normalized = entry.toLowerCase();
            if (normalized.includes('nonmagical') && isMagical) return false;
            return normalized.includes(type);
        });

    if (matchType(enemy.damageImmunities)) {
        return { adjustedDamage: 0, note: `immune to ${type}` };
    }

    let adjustedDamage = amount;
    let note: string | null = null;

    if (matchType(enemy.damageVulnerabilities)) {
        adjustedDamage *= 2;
        note = `vulnerable to ${type}`;
    }

    if (matchType(enemy.damageResistances)) {
        adjustedDamage = Math.floor(adjustedDamage / 2);
        note = `resists ${type}`;
    }

    return { adjustedDamage, note };
};

