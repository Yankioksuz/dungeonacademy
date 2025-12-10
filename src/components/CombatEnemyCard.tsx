import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Condition } from '@/types';
import { useTranslation } from 'react-i18next';

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

    return (
        <Card
            className={cn(
                'cursor-pointer transition-all border-2',
                isSelected ? 'border-primary shadow-md' : 'border-border',
                enemy.isDefeated ? 'opacity-50 grayscale' : ''
            )}
            onClick={() => !enemy.isDefeated && onSelect()}
        >
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold">{enemy.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Shield className="h-3 w-3" /> AC {effectiveAC}
                        </div>
                    </div>
                    {enemy.isDefeated && (
                        <Badge variant="destructive">{t('combat.defeated')}</Badge>
                    )}
                </div>
                <Progress
                    value={(enemy.currentHp / enemy.maxHp) * 100}
                    className="h-2"
                />
                {enemy.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {enemy.conditions.map((condition, idx) => (
                            <Badge
                                key={`${condition.type}-${idx}`}
                                variant="destructive"
                                className="text-xs"
                            >
                                {condition.type} ({condition.duration})
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
