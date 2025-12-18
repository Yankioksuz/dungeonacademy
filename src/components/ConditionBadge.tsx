import type { ConditionDefinition } from '@/data/conditions';
import { CONDITIONS } from '@/data/conditions';
import type { ConditionType } from '@/types';
import { Tooltip } from '@/components/ui/tooltip';

interface ConditionBadgeProps {
    type: ConditionType;
    duration?: number;
    size?: 'sm' | 'md' | 'lg';
}

export function ConditionBadge({ type, duration, size = 'md' }: ConditionBadgeProps) {
    const def: ConditionDefinition = CONDITIONS[type] || {
        id: type,
        name: type,
        description: 'Unknown condition',
        effects: [],
        icon: () => null,
        color: 'bg-gray-500'
    };

    const Icon = def.icon;

    const sizeClass = {
        sm: 'h-6 w-6 p-1',
        md: 'h-8 w-8 p-1.5',
        lg: 'h-10 w-10 p-2'
    }[size];

    const iconSize = {
        sm: 'h-3 w-3',
        md: 'h-5 w-5',
        lg: 'h-6 w-6'
    }[size];

    const tooltipContent = (
        <div className="space-y-2">
            <h4 className="font-fantasy font-bold text-fantasy-gold flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {def.name}
            </h4>
            <p className="text-xs text-muted-foreground">{def.description}</p>
            {def.effects.length > 0 && (
                <ul className="text-xs space-y-1 list-disc list-inside text-stone-300">
                    {def.effects.map((effect, i) => (
                        <li key={i}>{effect}</li>
                    ))}
                </ul>
            )}
            {duration !== undefined && (
                <p className="text-[10px] text-right text-muted-foreground pt-1 border-t border-white/10 mt-2">
                    {duration === -1 ? 'Permanent' : `${duration} rounds remaining`}
                </p>
            )}
        </div>
    );

    return (
        <Tooltip content={tooltipContent}>
            <div
                className={`
          relative flex items-center justify-center rounded-full text-white shadow-md cursor-help transition-transform hover:scale-110
          ${def.color} ${sizeClass}
        `}
            >
                <Icon className={iconSize} />
                {duration !== undefined && duration >= 0 && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold border border-white/20">
                        {duration}
                    </span>
                )}
            </div>
        </Tooltip>
    );
}
