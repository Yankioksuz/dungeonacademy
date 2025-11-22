import type { CombatLogEntry } from '@/types';

export function downloadCombatLog(logs: CombatLogEntry[], filename: string = 'combat-log.txt') {
    const text = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const details = log.details ? ` (${log.details})` : '';
        const source = log.source ? `[${log.source}] ` : '';
        return `[${time}] [${log.type.toUpperCase()}] ${source}${log.message}${details}`;
    }).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
