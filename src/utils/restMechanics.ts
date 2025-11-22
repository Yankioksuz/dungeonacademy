import type { PlayerCharacter } from '@/types';

export function calculateShortRestHealing(
    hitDie: string,
    conMod: number
): number {
    const sides = parseInt(hitDie.replace('d', ''));
    const roll = Math.floor(Math.random() * sides) + 1;
    return Math.max(0, roll + conMod); // Minimum 0 healing (though usually min 1, RAW says add mod)
}

export function calculateLongRestRecovery(character: PlayerCharacter): PlayerCharacter {
    // 1. Restore HP
    const newHp = character.maxHitPoints;

    // 2. Restore Hit Dice (recover half of max, minimum 1)
    const hitDiceRecovered = Math.max(1, Math.floor(character.hitDice.max / 2));
    const newHitDiceCurrent = Math.min(
        character.hitDice.max,
        character.hitDice.current + hitDiceRecovered
    );

    // 3. Restore Spell Slots
    const newSpellSlots = character.spellSlots ? { ...character.spellSlots } : undefined;
    if (newSpellSlots) {
        for (const level in newSpellSlots) {
            // Ensure we're iterating over own properties and it's a number key
            if (Object.prototype.hasOwnProperty.call(newSpellSlots, level)) {
                const lvl = Number(level);
                if (!isNaN(lvl) && newSpellSlots[lvl]) {
                    newSpellSlots[lvl] = {
                        ...newSpellSlots[lvl],
                        current: newSpellSlots[lvl].max
                    };
                }
            }
        }
    }

    return {
        ...character,
        hitPoints: newHp,
        hitDice: {
            ...character.hitDice,
            current: newHitDiceCurrent
        },
        spellSlots: newSpellSlots
    };
}
