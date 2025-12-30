import { useTranslation } from 'react-i18next';
import { DiceRoller } from './DiceRoller';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface RollResult {
    roll: number;
    total: number;
    isCritical: boolean;
    isCriticalFailure: boolean;
}

interface DiceRollModalProps {
    isOpen: boolean;
    isRolling: boolean;
    diceRoll: number | null;
    rollResult: RollResult | null;
    onRollComplete: () => void;
    onClose: () => void;
    skillName?: string;
    difficultyClass?: number;
    modifier?: number;
    // Optional boost button (for Favored by the Gods, etc.)
    canBoost?: boolean;
    boostLabel?: string;
    onBoost?: () => void;
}

export function DiceRollModal({
    isOpen,
    isRolling,
    diceRoll,
    rollResult,
    onRollComplete,
    onClose,
    skillName,
    difficultyClass,
    modifier,
    canBoost,
    boostLabel,
    onBoost
}: DiceRollModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const isFailed = rollResult && difficultyClass && rollResult.total < difficultyClass;
    const showBoostButton = canBoost && isFailed && onBoost;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm fade-in">
            <div className="relative w-full max-w-md p-6 mx-4 bg-fantasy-dark-card border-2 border-fantasy-gold/50 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transform transition-all scale-100">

                {/* Header */}
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-fantasy-gold mb-1">
                        {skillName || t('adventure.skillCheck')}
                    </h3>
                    {difficultyClass && (
                        <p className="text-muted-foreground">
                            {t('adventure.difficultyClass')}: {difficultyClass}
                        </p>
                    )}
                </div>

                {/* Dice Roller */}
                <div className="flex justify-center mb-8">
                    <DiceRoller
                        isRolling={isRolling}
                        result={diceRoll}
                        onRollComplete={onRollComplete}
                        sides={20}
                    />
                </div>

                {/* Result Area */}
                {!isRolling && diceRoll !== null && rollResult && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className={cn(
                            "p-4 rounded-lg border text-center",
                            (rollResult.total >= (difficultyClass || 10))
                                ? "bg-green-900/20 border-green-500/30"
                                : "bg-red-900/20 border-red-500/30"
                        )}>
                            <div className="flex items-baseline gap-2 justify-center mb-1">
                                <span className="text-3xl font-bold">{rollResult.total}</span>
                                <span className="text-sm text-muted-foreground">
                                    ({diceRoll} {modifier && modifier >= 0 ? '+' : ''} {modifier})
                                </span>
                            </div>
                            <p className={cn(
                                "text-xl font-bold tracking-widest uppercase",
                                (rollResult.total >= (difficultyClass || 10)) ? "text-green-400" : "text-red-400"
                            )}>
                                {(rollResult.total >= (difficultyClass || 10)) ? t('adventure.success') : t('adventure.failure')}
                            </p>
                        </div>

                        {/* Boost Button (Favored by the Gods) */}
                        {showBoostButton && (
                            <Button
                                onClick={onBoost}
                                variant="fantasy"
                                className="w-full py-4 text-base font-semibold animate-pulse"
                            >
                                <Star className="mr-2 h-4 w-4" />
                                {boostLabel || 'Favored by the Gods (+2d4)'}
                            </Button>
                        )}

                        <Button
                            onClick={onClose}
                            className="w-full py-6 text-lg font-semibold bg-fantasy-gold hover:bg-fantasy-gold/90 text-fantasy-dark-bg"
                        >
                            {t('common.continue', 'Continue')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
