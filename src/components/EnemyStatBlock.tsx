import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Book, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CombatEnemy, Condition } from '@/types';

interface EnemyStatBlockProps {
    enemy: CombatEnemy & {
        conditions: Condition[];
        size?: string;
        alignment?: string;
        challenge?: number | string;
        speed?: string | Record<string, number>;
        senses?: string[];
        languages?: string[];
        statBlockSource?: string;
        statBlockHeading?: string;
    };
    isAnalyzed: boolean;
}

const formatSpeed = (speed: string | Record<string, number> | undefined): string => {
    if (!speed) return 'N/A';
    if (typeof speed === 'string') return speed;
    return Object.entries(speed)
        .map(([k, v]) => `${k} ${v}ft`)
        .join(', ');
};

const formatList = (list?: string[]): string => {
    if (!list || list.length === 0) return 'None';
    return list.join(', ');
};

export function EnemyStatBlock({ enemy, isAnalyzed }: EnemyStatBlockProps) {
    const { t } = useTranslation();

    return (
        <Card className="border-dashed border-muted">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-xs uppercase text-muted-foreground">
                            {t('combat.statBlock')}
                        </p>
                        <h4 className="font-bold">{enemy.name}</h4>
                        <p className="text-xs text-muted-foreground">
                            {[enemy.size, enemy.creatureType, enemy.alignment]
                                .filter(Boolean)
                                .join(' · ') || t('combat.none')}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {enemy.challenge && (
                            <Badge variant="outline" className="text-xs">
                                CR {enemy.challenge}
                            </Badge>
                        )}
                        {enemy.xpReward !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                                {t('combat.xpShort')}: {enemy.xpReward}
                            </Badge>
                        )}
                    </div>
                </div>

                {enemy.abilityScores && (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        {(
                            [
                                'strength',
                                'dexterity',
                                'constitution',
                                'intelligence',
                                'wisdom',
                                'charisma',
                            ] as const
                        ).map((ability) => {
                            const score = enemy.abilityScores?.[ability] || 0;
                            const mod = Math.floor((score - 10) / 2);
                            const label = ability.slice(0, 3).toUpperCase();
                            return (
                                <div key={ability} className="bg-muted/40 rounded px-2 py-1">
                                    <div className="text-[10px] uppercase text-muted-foreground">
                                        {label}
                                    </div>
                                    <div className="font-semibold">
                                        {score} ({mod >= 0 ? '+' : ''}
                                        {mod})
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                        <span className="text-muted-foreground">{t('combat.speed')}:</span>{' '}
                        {formatSpeed(enemy.speed)}
                    </div>
                    <div>
                        <span className="text-muted-foreground">{t('combat.senses')}:</span>{' '}
                        {formatList(enemy.senses)}
                    </div>
                    <div>
                        <span className="text-muted-foreground">
                            {t('combat.languages')}:
                        </span>{' '}
                        {formatList(enemy.languages)}
                    </div>
                    <div>
                        <span className="text-muted-foreground">
                            {t('combat.defenses')}:
                        </span>{' '}
                        {formatList(enemy.damageResistances)}
                    </div>
                    <div>
                        <span className="text-muted-foreground">
                            {t('combat.immunities')}:
                        </span>{' '}
                        {formatList(enemy.damageImmunities)}
                    </div>
                    <div>
                        <span className="text-muted-foreground">
                            {t('combat.vulnerabilities')}:
                        </span>{' '}
                        {formatList(enemy.damageVulnerabilities)}
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <div>
                            <span className="text-muted-foreground">
                                {t('combat.conditionImmunities')}:
                            </span>{' '}
                            {formatList(enemy.conditionImmunities)}
                        </div>
                        {!isAnalyzed && (
                            <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                                <Search className="h-3 w-3" /> Analyze enemy to reveal
                                weaknesses
                            </div>
                        )}
                    </div>
                </div>

                {isAnalyzed && (
                    <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-900/30 text-xs">
                        <p className="font-bold mb-1 text-blue-200 flex items-center gap-1">
                            <Book className="h-3 w-3" /> Analysis Results
                        </p>
                        {enemy.damageVulnerabilities &&
                            enemy.damageVulnerabilities.length > 0 && (
                                <p className="text-red-300">
                                    <strong>Vulnerable:</strong>{' '}
                                    {enemy.damageVulnerabilities.join(', ')}
                                </p>
                            )}
                        {enemy.damageResistances &&
                            enemy.damageResistances.length > 0 && (
                                <p className="text-yellow-300">
                                    <strong>Resistant:</strong>{' '}
                                    {enemy.damageResistances.join(', ')}
                                </p>
                            )}
                        {enemy.damageImmunities && enemy.damageImmunities.length > 0 && (
                            <p className="text-gray-400">
                                <strong>Immune:</strong> {enemy.damageImmunities.join(', ')}
                            </p>
                        )}
                        {!enemy.damageVulnerabilities?.length &&
                            !enemy.damageResistances?.length &&
                            !enemy.damageImmunities?.length && (
                                <p className="text-muted-foreground">
                                    No specific damage resistances or vulnerabilities known.
                                </p>
                            )}
                    </div>
                )}

                {enemy.statBlockSource && (
                    <a
                        href={
                            enemy.statBlockSource.startsWith('http')
                                ? enemy.statBlockSource
                                : `/${enemy.statBlockSource}`
                        }
                        className="text-xs text-primary underline"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t('combat.source')}:{' '}
                        {enemy.statBlockHeading || enemy.statBlockSource}
                    </a>
                )}

                {enemy.actions && enemy.actions.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-xs uppercase font-bold text-muted-foreground">
                            {t('combat.actions')}
                        </p>
                        {enemy.actions.map((action) => (
                            <div
                                key={action.name}
                                className="text-xs bg-muted/30 rounded p-2"
                            >
                                <div className="flex justify-between">
                                    <span className="font-semibold">{action.name}</span>
                                    <span className="text-muted-foreground">
                                        +{action.toHit} / {action.damage}
                                    </span>
                                </div>
                                {action.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {action.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {enemy.legendaryActions && enemy.legendaryActions.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-xs uppercase font-bold text-muted-foreground">
                            {t('combat.legendaryActions')}
                        </p>
                        {enemy.legendaryActions.map((action) => (
                            <div key={action.name} className="text-xs">
                                <span className="font-semibold">{action.name}:</span>{' '}
                                {action.description}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
