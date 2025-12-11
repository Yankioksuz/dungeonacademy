import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Search } from 'lucide-react';
import type { Feat } from '@/types';
import { Input } from './ui/input';

interface FeatSelectionModalProps {
    feats: Feat[];
    selectedFeatId: string | null;
    onSelectFeat: (featId: string) => void;
}

export function FeatSelectionModal({
    feats,
    selectedFeatId,
    onSelectFeat,
}: FeatSelectionModalProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFeats = feats.filter(feat =>
        feat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feat.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('feats.search', 'Search feats...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-black/20 border-white/10"
                />
            </div>

            <ScrollArea className="h-[400px] pr-4">
                <div className="grid gap-3">
                    {filteredFeats.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            {t('feats.noResults', 'No feats found matching your search.')}
                        </p>
                    ) : (
                        filteredFeats.map((feat) => {
                            const isSelected = selectedFeatId === feat.id;
                            // Get effects for display
                            const effects = (feat as { effects?: Array<{ type: string; key?: string; value?: number }> }).effects || [];

                            return (
                                <button
                                    key={feat.id}
                                    className={`
                    flex flex-col text-left w-full p-4 rounded-lg border transition-all
                    ${isSelected
                                            ? 'border-fantasy-gold bg-fantasy-gold/10'
                                            : 'border-white/10 hover:border-fantasy-gold/50 bg-black/20'}
                  `}
                                    onClick={() => onSelectFeat(feat.id)}
                                >
                                    <div className="flex items-center justify-between w-full mb-2">
                                        <h3 className="font-bold text-lg text-fantasy-gold">{feat.name}</h3>
                                        {(feat as { source?: string }).source && <Badge variant="secondary" className="text-xs">{(feat as { source?: string }).source}</Badge>}
                                    </div>

                                    <p className="text-sm text-gray-300 mb-3">{feat.description}</p>

                                    {/* Effects Summary */}
                                    {effects.length > 0 && (
                                        <div className="space-y-1 text-xs text-muted-foreground w-full">
                                            <div className="flex flex-wrap gap-1">
                                                {effects.slice(0, 3).map((effect, idx) => (
                                                    <Badge key={idx} variant="outline" className="border-fantasy-blue/50 text-fantasy-blue text-[10px]">
                                                        {effect.type}{effect.value ? `: +${effect.value}` : ''}
                                                    </Badge>
                                                ))}
                                                {effects.length > 3 && (
                                                    <Badge variant="outline" className="border-white/30 text-white/60 text-[10px]">
                                                        +{effects.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Requirements display */}
                                    {feat.prerequisites && (
                                        <div className="mt-3 pt-2 w-full border-t border-white/5 flex gap-2 text-xs text-red-300/80">
                                            <span className="font-semibold uppercase tracking-wider">Prerequisite:</span>
                                            <span>
                                                {feat.prerequisites.level && `Level ${feat.prerequisites.level}`}
                                                {feat.prerequisites.race && ` ${feat.prerequisites.race.join(' or ')}`}
                                                {feat.prerequisites.class && ` ${feat.prerequisites.class.join(' or ')}`}
                                                {feat.prerequisites.abilityScore && ` ${feat.prerequisites.abilityScore.ability} ${feat.prerequisites.abilityScore.minimum}+`}
                                                {feat.prerequisites.proficiency && ` Proficiency in ${feat.prerequisites.proficiency}`}
                                                {feat.prerequisites.spellcasting && " Spellcasting"}
                                                {feat.prerequisites.armor && ` ${feat.prerequisites.armor} Proficiency`}
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
