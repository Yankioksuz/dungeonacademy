import type { PlayerCharacter } from '@/types';
import { CONDITION_DEFINITIONS } from '@/utils/conditionUtils';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';

interface ConditionListProps {
    character: PlayerCharacter;
}

export function ConditionList({ character }: ConditionListProps) {
    if (!character.conditions || character.conditions.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-4 shadow-inner">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Active Conditions
            </div>
            <div className="flex flex-wrap gap-2">
                {character.conditions.map((condition, idx) => {
                    const def = CONDITION_DEFINITIONS[condition.type];
                    const description = def?.description || 'No description available.';
                    const tooltipContent = `${condition.type}: ${description}`;

                    return (
                        <Tooltip key={`${condition.type}-${idx}`} content={tooltipContent}>
                            <Badge variant="destructive" className="cursor-help px-3 py-1 text-xs uppercase tracking-wider">
                                {condition.type}
                                {condition.duration && <span className="ml-2 opacity-70">({condition.duration} rds)</span>}
                            </Badge>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}
