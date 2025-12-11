import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FeatSelectionModal } from './FeatSelectionModal';
import { Sword, BookOpen, Dice6, DoorOpen, CheckCircle2, Backpack, X, Tent, ShoppingBag, Brain, Wand2, Sparkles, ArrowUpCircle } from 'lucide-react';
import type { TalentOption, Subclass, Feat } from '@/types';

interface LevelUpModalProps {
  isOpen: boolean;
  level: number;
  hpIncrease: number;
  talents: TalentOption[]; // Deprecated, kept for compat
  feats?: Feat[];
  selectedFeatId?: string | null;
  onSelectFeat?: (featId: string) => void;
  selectedTalentId: string | null;
  onSelectTalent: (talentId: string) => void;
  subclasses?: Subclass[];
  selectedSubclassId?: string | null;
  onSelectSubclass?: (subclassId: string) => void;
  onConfirm: () => void;

  // ASI Props
  asiScore1?: string; // AbilityName
  asiScore2?: string; // AbilityName
  onSelectAsi?: (score1: string, score2?: string) => void; // score2 is optional if putting +2 in one
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
  feats = [],
  selectedFeatId,
  onSelectFeat,
  onConfirm,
  // ASI Props
  asiScore1,
  asiScore2,
  onSelectAsi,
}: LevelUpModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'feat' | 'asi'>('asi');

  // Auto-switch to feat mode if asi is not available or if user has already selected a feat
  useEffect(() => {
    if (selectedFeatId) setMode('feat');
  }, [selectedFeatId]);

  if (!isOpen) return null;

  const hasTalents = talents.length > 0;
  const hasSubclasses = subclasses && subclasses.length > 0;
  const hasFeats = feats && feats.length > 0;

  const abilities: string[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

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

          <div className="mt-6 text-left max-h-[60vh] overflow-y-auto pr-2">
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

            {hasFeats && (
              <div className="space-y-4 mb-6">
                <div className="flex bg-black/20 p-1 rounded-lg">
                  <button
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'asi' ? 'bg-fantasy-gold text-black shadow' : 'text-muted-foreground hover:text-white'}`}
                    onClick={() => { setMode('asi'); onSelectFeat?.(''); }}
                  >
                    Ability Score Improvement
                  </button>
                  <button
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'feat' ? 'bg-fantasy-gold text-black shadow' : 'text-muted-foreground hover:text-white'}`}
                    onClick={() => { setMode('feat'); onSelectAsi?.('', ''); }}
                  >
                    Feat
                  </button>
                </div>

                {mode === 'asi' ? (
                  <div className="p-4 rounded-lg border border-white/10 bg-black/20 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Select one ability score to increase by 2, or two ability scores to increase by 1.
                    </p>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Ability Score 1 (+1)</label>
                      <div className="flex flex-wrap gap-2">
                        {abilities.map(ability => (
                          <Button
                            key={`asi1-${ability}`}
                            size="sm"
                            variant={asiScore1 === ability ? 'fantasy' : 'outline'}
                            onClick={() => onSelectAsi?.(ability, asiScore2)}
                            className="capitalize"
                          >
                            {ability}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Ability Score 2 (+1)</label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={!asiScore2 ? 'fantasy' : 'outline'}
                          onClick={() => onSelectAsi?.(asiScore1 || '', undefined)}
                          className="border-dashed"
                        >
                          None (+2 to first)
                        </Button>
                        {abilities.map(ability => (
                          <Button
                            key={`asi2-${ability}`}
                            size="sm"
                            variant={asiScore2 === ability ? 'fantasy' : 'outline'}
                            className="capitalize"
                            disabled={asiScore1 === ability}
                            onClick={() => onSelectAsi?.(asiScore1 || '', ability)}
                          >
                            {ability}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <FeatSelectionModal
                    feats={feats}
                    selectedFeatId={selectedFeatId || null}
                    onSelectFeat={(id) => onSelectFeat?.(id)}
                  />
                )}
              </div>
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
            ) : null}
          </div>

          <Button
            onClick={onConfirm}
            disabled={
              (!selectedTalentId && hasTalents) ||
              (!selectedSubclassId && hasSubclasses) ||
              (hasFeats && mode === 'feat' && !selectedFeatId) ||
              (hasFeats && mode === 'asi' && !asiScore1)
            }
            className="w-full py-6 text-xl font-bold bg-fantasy-gold hover:bg-fantasy-gold/90 text-fantasy-dark-bg transition-all hover:scale-105 disabled:opacity-60"
          >
            {t('levelUp.continue', 'Continue Adventure')}
          </Button>
        </div>
      </div>
    </div>
  );
}
