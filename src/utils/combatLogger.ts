import type { CombatLogEntry, CombatLogEntryType } from '@/types';

export function createLogEntry(
    type: CombatLogEntryType,
    message: string,
    details?: string,
    source?: string,
    target?: string
): CombatLogEntry {
    return {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type,
        message,
        details,
        source,
        target
    };
}

export function formatRollBreakdown(base: number, modifiers: { label: string; value: number }[]): string {
    const modsString = modifiers
        .map(m => `${m.value >= 0 ? '+' : '-'} ${Math.abs(m.value)} (${m.label})`)
        .join(' ');
    const total = base + modifiers.reduce((acc, m) => acc + m.value, 0);
    return `Rolled ${base} ${modsString} = ${total}`;
}
