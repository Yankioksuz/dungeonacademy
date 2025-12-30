import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Shield, Skull, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Condition } from '@/types';
import { ConditionBadge } from './ConditionBadge';
import { useTranslation } from 'react-i18next';
import { getEnemyPortraitByName } from '@/data/enemyPortraits';

interface CombatEnemyCardProps {
    enemy: {
        id: string;
        name: string;
        currentHp: number;
        maxHp: number;
        isDefeated: boolean;
        conditions: Condition[];
        legendaryActions?: {
            name: string;
            cost?: number;
            damage?: string;
            description?: string;
        }[];
    };
    isSelected: boolean;
    effectiveAC: number;
    onSelect: () => void;
    legendaryPoints?: number;
}

export function CombatEnemyCard({
    enemy,
    isSelected,
    effectiveAC,
    onSelect,
    legendaryPoints,
}: CombatEnemyCardProps) {
    const { t } = useTranslation();

    // Get portrait for this enemy
    const portrait = getEnemyPortraitByName(enemy.name);
    const isLegendary = enemy.legendaryActions && enemy.legendaryActions.length > 0;
    const hasLegendaryPointsRemaining = legendaryPoints !== undefined && legendaryPoints > 0;

    return (
        <Card
            className={cn(
                'cursor-pointer transition-all border-2 overflow-hidden',
                isSelected ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-border',
                enemy.isDefeated ? 'opacity-50 grayscale' : '',
                isLegendary && hasLegendaryPointsRemaining && !enemy.isDefeated ? 'ring-2 ring-yellow-500/50' : ''
            )}
            onClick={() => !enemy.isDefeated && onSelect()}
        >
            <CardContent className="p-0">
                <div className="flex">
                    {/* Portrait Section */}
                    {portrait && (
                        <div className="relative w-20 h-20 flex-shrink-0">
                            <img
                                src={portrait.src}
                                alt={enemy.name}
                                className="w-full h-full object-cover"
                            />
                            {enemy.isDefeated && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Skull className="h-8 w-8 text-red-500" />
                                </div>
                            )}
                            {isLegendary && !enemy.isDefeated && (
                                <div className="absolute top-1 left-1">
                                    <Crown className="h-4 w-4 text-yellow-400 drop-shadow-lg" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Info Section */}
                    <div className="flex-1 p-3">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-sm flex items-center gap-1">
                                    {enemy.name}
                                    {isLegendary && !portrait && (
                                        <Crown className="h-3 w-3 text-yellow-400" />
                                    )}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Shield className="h-3 w-3" /> AC {effectiveAC}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                                {enemy.isDefeated && (
                                    <Badge variant="destructive" className="text-xs">{t('combat.defeated')}</Badge>
                                )}
                                {isLegendary && hasLegendaryPointsRemaining && !enemy.isDefeated && (
                                    <Badge variant="outline" className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                                        ⚡ {legendaryPoints} LA
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* HP Bar */}
                        <div className="space-y-1">
                            <Progress
                                value={(enemy.currentHp / enemy.maxHp) * 100}
                                className="h-2"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                                {enemy.currentHp} / {enemy.maxHp}
                            </div>
                        </div>

                        {/* Conditions */}
                        {enemy.conditions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {enemy.conditions.map((condition, idx) => (
                                    <div key={`${condition.type}-${idx}`}>
                                        <ConditionBadge
                                            type={condition.type}
                                            duration={condition.duration}
                                            size="sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

