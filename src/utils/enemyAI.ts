import type { CombatEnemy, PlayerCharacter } from '@/types';

type EnemyAction = NonNullable<CombatEnemy['actions']>[number];

type BreathAction = {
    type: 'breath';
    name: string;
    damage: string;
    damageType?: string;
    save?: { ability: string; dc: number; onSave?: string; onFail?: string };
};

export type ResolvedEnemyAction = EnemyAction | BreathAction;

/**
 * Calculates average damage from a dice string like "2d6+3".
 */
export const averageDamageFromString = (damage: string): number => {
    if (!damage) return 0;
    let total = 0;
    let matched = false;
    const regex = /(\d+)d(\d+)([+-]\d+)?/gi;
    let m;
    while ((m = regex.exec(damage)) !== null) {
        matched = true;
        const count = Number(m[1]);
        const sides = Number(m[2]);
        const mod = m[3] ? Number(m[3]) : 0;
        total += count * ((sides + 1) / 2) + mod;
    }
    if (!matched) {
        const flat = parseInt(damage, 10);
        if (!Number.isNaN(flat)) total += flat;
    }
    return total;
};

/**
 * Determines the best action for an enemy based on behavior and state.
 */
export const determineEnemyAction = (
    enemy: CombatEnemy,
    _player: PlayerCharacter,
    breathReady: boolean,
    allies: CombatEnemy[] = []
): ResolvedEnemyAction | undefined => {
    const actions = enemy.actions || [];

    // Gather all possible actions including breath
    const pool: ResolvedEnemyAction[] = [...actions];
    if (breathReady && enemy.breathDamage && enemy.breathType) {
        pool.push({
            type: 'breath',
            name: 'Breath Weapon',
            damage: enemy.breathDamage,
            damageType: enemy.breathType,
            save: { ability: 'dex', dc: enemy.breathDC || 12 },
        });
    }

    if (pool.length === 0) return undefined;

    const behavior = enemy.behavior || 'aggressive';
    const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;

    // CAUTIOUS: If low HP (<40%), pick randomly to be unpredictable.
    if (behavior === 'cautious' && hpPercent < 40) {
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // SUPPORT: Heal allies if they are low.
    if (behavior === 'support') {
        const lowHealthAlly = allies.find(
            (a) => !a.isDefeated && a.currentHp / a.maxHp < 0.5
        );
        if (lowHealthAlly) {
            const healAction = pool.find(
                (a) =>
                    a.name.toLowerCase().includes('heal') ||
                    a.name.toLowerCase().includes('cure')
            );
            if (healAction) return healAction;
        }
    }

    // AGGRESSIVE (Default): Maximize Damage
    return pool.reduce((best, action) => {
        if (!best) return action;
        const bestAvg = averageDamageFromString(best.damage || enemy.damage || '');
        const currentAvg = averageDamageFromString(
            action.damage || enemy.damage || ''
        );
        return currentAvg > bestAvg ? action : best;
    }, undefined as ResolvedEnemyAction | undefined);
};
