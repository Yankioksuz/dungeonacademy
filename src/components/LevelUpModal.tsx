import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Sparkles, ArrowUpCircle } from 'lucide-react';
import type { TalentOption, Subclass } from '@/types';

interface LevelUpModalProps {
  isOpen: boolean;
  level: number;
  hpIncrease: number;
  talents: TalentOption[];
  selectedTalentId: string | null;
  onSelectTalent: (talentId: string) => void;
  subclasses?: Subclass[];
  selectedSubclassId?: string | null;
  onSelectSubclass?: (subclassId: string) => void;
  onConfirm: () => void;
}

export function LevelUpModal({
  isOpen,
  level,
  hpIncrease,
  talents,
  selectedTalentId,
  onSelectTalent,
  subclasses = [],
  selectedSubclassId,
  onSelectSubclass,
  onConfirm,
}: LevelUpModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const hasTalents = talents.length > 0;
  const hasSubclasses = subclasses && subclasses.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm fade-in">
      <div className="relative w-full max-w-2xl p-8 mx-4 bg-fantasy-dark-card border-2 border-fantasy-gold rounded-xl shadow-[0_0_50px_rgba(255,215,0,0.3)] transform transition-all scale-100 animate-in zoom-in-95 duration-300">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-fantasy-dark-card px-4 py-2 rounded-full border-2 border-fantasy-gold">
          <Sparkles className="w-8 h-8 text-fantasy-gold animate-pulse" />
        </div>

        <div className="text-center space-y-4 mt-4">
          <h2 className="text-4xl font-bold text-fantasy-gold font-cinzel tracking-wider">
            {t('levelUp.title', 'LEVEL UP!')}
          </h2>
          <div className="text-6xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            {level}
          </div>

          <div className="space-y-2 py-2">
            <div className="flex items-center justify-center gap-3 text-lg text-green-400">
              <ArrowUpCircle className="w-6 h-6" />
              <span>{t('levelUp.hpGain', 'Max HP increased by {{hp}}!', { hp: hpIncrease })}</span>
            </div>
            <p className="text-muted-foreground">
              {t('levelUp.message', 'You feel stronger and more experienced. Your health has been fully restored!')}
            </p>
          </div>

          <div className="mt-6 text-left">
            {hasSubclasses && (
              <>
                <p className="text-sm text-muted-foreground mb-2">{t('levelUp.chooseSubclass', 'Choose a Subclass:')}</p>
                <div className="grid gap-3 mb-6">
                  {subclasses.map((subclass) => (
                    <button
                      key={subclass.id}
                      className={`p-4 rounded-lg border transition-all text-left ${selectedSubclassId === subclass.id ? 'border-fantasy-gold bg-fantasy-gold/10' : 'border-white/10 hover:border-fantasy-gold/50'}`}
                      onClick={() => onSelectSubclass?.(subclass.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-lg">{subclass.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{subclass.description}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {hasTalents ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">{t('levelUp.chooseTalent', 'Choose a new talent:')}</p>
                <div className="grid gap-3">
                  {talents.map((talent) => (
                    <button
                      key={talent.id}
                      className={`p-4 rounded-lg border transition-all text-left ${selectedTalentId === talent.id ? 'border-fantasy-gold bg-fantasy-gold/10' : 'border-white/10 hover:border-fantasy-gold/50'}`}
                      onClick={() => onSelectTalent(talent.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-lg">{talent.name}</h3>
                        <span className="text-xs uppercase text-muted-foreground">{talent.bonus.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{talent.description}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('levelUp.noTalents', 'You have already mastered all available talents.')}
              </p>
            )}
          </div>

          <Button
            onClick={onConfirm}
            disabled={(!selectedTalentId && hasTalents) || (!selectedSubclassId && hasSubclasses)}
            className="w-full py-6 text-xl font-bold bg-fantasy-gold hover:bg-fantasy-gold/90 text-fantasy-dark-bg transition-all hover:scale-105 disabled:opacity-60"
          >
            {t('levelUp.continue', 'Continue Adventure')}
          </Button>
        </div>
      </div>
    </div>
  );
}
