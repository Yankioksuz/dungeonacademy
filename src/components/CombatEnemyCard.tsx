import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Shield, Skull } from 'lucide-react';
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
    };
    isSelected: boolean;
    effectiveAC: number;
    onSelect: () => void;
}

export function CombatEnemyCard({
    enemy,
    isSelected,
    effectiveAC,
    onSelect,
}: CombatEnemyCardProps) {
    const { t } = useTranslation();

    // Get portrait for this enemy
    const portrait = getEnemyPortraitByName(enemy.name);

    return (
        <Card
            className={cn(
                'cursor-pointer transition-all border-2 overflow-hidden',
                isSelected ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-border',
                enemy.isDefeated ? 'opacity-50 grayscale' : ''
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
                        </div>
                    )}

                    {/* Info Section */}
                    <div className="flex-1 p-3">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-sm">{enemy.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Shield className="h-3 w-3" /> AC {effectiveAC}
                                </div>
                            </div>
                            {enemy.isDefeated && (
                                <Badge variant="destructive" className="text-xs">{t('combat.defeated')}</Badge>
                            )}
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
