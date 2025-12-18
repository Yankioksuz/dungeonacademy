import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Trash2, Swords, ShieldCheck, Scroll, History, User } from 'lucide-react';
import adventureData from '@/content/adventure.json';
import intrigueAdventure from '@/content/adventure-shadows.json';
import frozenAdventure from '@/content/adventure-frozen.json';
import sanctumAdventure from '@/content/adventure-sanctum.json';
import type { Adventure as AdventureType, Class } from '@/types';
import { portraits } from '@/data/portraits';
import { PortraitSelector } from './PortraitSelector';
import tutorialArtwork from '@/assets/campaigns/tutorial-adventure.png';
import spireArtwork from '@/assets/campaigns/shadows-of-the-spire.png';
import frozenArtwork from '@/assets/campaigns/frozen-depths.png';
import sanctumArtwork from '@/assets/campaigns/sanctum-of-the-flayed-god.png';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AdventureHistory } from './AdventureHistory';
import { CharacterSheet } from './CharacterSheet';
import { RestModal } from './RestModal';
import { LevelUpModal } from './LevelUpModal';
import { Moon } from 'lucide-react';
import { formatInGameTime, getTimeUntilNextLongRest } from '@/utils/timeUtils';
import { getAvailableMulticlassOptions, canLeaveCurrentClass, MULTICLASS_PREREQUISITES } from '@/data/multiclass';
import characterCreationContent from '@/content/characterCreation.json';

const AVAILABLE_ADVENTURES = [
  {
    id: (adventureData as AdventureType).id,
    title: adventureData.title,
    description: adventureData.description,
    difficulty: 'Beginner',
    length: 'Short',
    data: adventureData as unknown as AdventureType,
    artwork: tutorialArtwork,
  },
  {
    id: (intrigueAdventure as AdventureType).id,
    title: intrigueAdventure.title,
    description: intrigueAdventure.description,
    difficulty: 'Intermediate',
    length: 'Medium',
    data: intrigueAdventure as unknown as AdventureType,
    artwork: spireArtwork,
  },
  {
    id: (frozenAdventure as AdventureType).id,
    title: frozenAdventure.title,
    description: frozenAdventure.description,
    difficulty: 'Advanced',
    length: 'Long',
    data: frozenAdventure as unknown as AdventureType,
    artwork: frozenArtwork,
  },
  {
    id: (sanctumAdventure as AdventureType).id,
    title: sanctumAdventure.title,
    description: sanctumAdventure.description,
    difficulty: 'Deadly',
    length: 'Epic',
    data: sanctumAdventure as unknown as AdventureType,
    artwork: sanctumArtwork,
  }
];

export function Camp() {
  const { t } = useTranslation();
  const {
    character,
    startAdventure,
    reset,
    updateCharacter,
    tutorialsEnabled,
    setTutorialsEnabled,
    prepareSpell,
    unprepareSpell,
    inGameTime,
    canTakeLongRest,
    timeSinceLastLongRest,
    pendingLevelUp,
    confirmLevelUp,
  } = useGame();
  const [selectedAdventureId, setSelectedAdventureId] = useState(AVAILABLE_ADVENTURES[0]?.id);
  const [isStarting, setIsStarting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [pendingPortraitId, setPendingPortraitId] = useState<string | null>(character?.portraitId || null);
  const [activeTab, setActiveTab] = useState("adventures");
  const [selectedMulticlassId, setSelectedMulticlassId] = useState<string | null>(null);

  // Calculate multiclass options
  const allClasses = characterCreationContent.classes as Class[];
  const multiclassOptions = useMemo(() => {
    if (!character) return [];
    const available = getAvailableMulticlassOptions(character, allClasses);
    return allClasses
      .filter(c => c.id !== character.class.id) // Exclude current class
      .map(c => {
        const meetsPrereqs = available.some(ac => ac.id === c.id);
        const prereqs = MULTICLASS_PREREQUISITES[c.id.toLowerCase()];
        let prereqReason = '';
        if (!meetsPrereqs && prereqs) {
          const needed = Object.entries(prereqs)
            .filter(([k, v]) => k !== 'orCondition' && typeof v === 'number')
            .map(([k, v]) => `${k.toUpperCase()} ${v}`);
          prereqReason = `Requires ${needed.join(prereqs.orCondition ? ' or ' : ' and ')}`;
        }
        return { class: c, meetsPrereqs, prereqReason };
      });
  }, [character, allClasses]);

  const canLeave = character ? canLeaveCurrentClass(character) : false;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPendingPortraitId(character?.portraitId || null);
    }, 0);
    return () => clearTimeout(timeout);
  }, [character?.portraitId]);

  if (!character) {
    return null;
  }

  const heroRaceId = character.race.id;
  const heroGender = (character.gender || 'other') as 'male' | 'female' | 'non-binary' | 'other';
  const currentPortrait = character.portraitId
    ? portraits.find((portrait) => portrait.id === character.portraitId)
    : undefined;

  const handleOpenPortraitModal = () => {
    setPendingPortraitId(character.portraitId || null);
    setShowPortraitModal(true);
  };

  const selectedAdventure = AVAILABLE_ADVENTURES.find((adv) => adv.id === selectedAdventureId);

  const handleStartAdventure = () => {
    if (!selectedAdventure || isStarting) return;
    setIsStarting(true);

    const adventureWithIndex: AdventureType = {
      ...selectedAdventure.data,
      currentEncounterIndex: 0,
    };

    startAdventure(adventureWithIndex);
  };

  return (
    <div className="container mx-auto px-4 py-8 fade-in">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card className="scroll-parchment">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-fantasy-gold" />
                {t('camp.hero', 'Your Hero')}
              </CardTitle>
              <CardDescription>
                {t('camp.ready', 'Resting at camp and ready for the next journey.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="flex flex-col items-center gap-3">
                  {currentPortrait ? (
                    <img
                      src={currentPortrait.src}
                      alt={currentPortrait.name}
                      className="w-36 h-36 rounded-2xl border-2 border-fantasy-gold/30 object-cover shadow-lg shadow-black/40"
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-2xl border border-dashed border-fantasy-purple/40 flex items-center justify-center text-xs text-muted-foreground">
                      No portrait selected
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full" onClick={handleOpenPortraitModal}>
                    {t('camp.changePortrait', 'Change Portrait')}
                  </Button>
                </div>
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div>
                    <p className="text-2xl font-fantasy font-semibold">{character.name}</p>
                    <p className="text-muted-foreground">
                      {character.race.name} {character.class.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Badge variant="gold" className="px-3 py-1 text-xs">Lv. {character.level}</Badge>
                    <Badge variant="outline" className="px-3 py-1 text-xs">
                      HP {character.hitPoints}/{character.maxHitPoints}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 text-xs bg-black/40">
                      {t('camp.xp', 'XP')} {character.xp ?? 0}/{character.maxXp ?? 300}
                    </Badge>
                    <Badge variant="fantasy" className="px-3 py-1 text-xs">
                      {character.background.name}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button variant="fantasy" className="w-full text-lg tracking-wide" onClick={handleStartAdventure} disabled={!selectedAdventure || isStarting}>
                  {isStarting ? t('game.starting') : t('camp.embark', 'Embark on Adventure')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-indigo-900/80 via-purple-800/60 to-indigo-900/80 border-2 border-indigo-500/50 text-white hover:border-indigo-400 hover:from-indigo-800/90 hover:via-purple-700/70 hover:to-indigo-800/90 shadow-lg shadow-indigo-900/50"
                  onClick={() => setShowRestModal(true)}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  {t('camp.rest', 'Rest')}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('camp.deleteHero', 'Retire Hero')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-black/40 border border-fantasy-purple/30">
                <TabsTrigger value="adventures" className="flex items-center gap-2 data-[state=active]:bg-fantasy-gold/20 data-[state=active]:text-fantasy-gold">
                  <Scroll className="h-4 w-4" />
                  {t('camp.adventures', 'Adventures')}
                </TabsTrigger>
                <TabsTrigger value="character" className="flex items-center gap-2 data-[state=active]:bg-fantasy-gold/20 data-[state=active]:text-fantasy-gold">
                  <User className="h-4 w-4" />
                  {t('camp.character', 'Character')}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-fantasy-gold/20 data-[state=active]:text-fantasy-gold">
                  <History className="h-4 w-4" />
                  {t('camp.history', 'History')}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 text-xs text-muted-foreground bg-black/40 px-3 py-2 rounded-md border border-fantasy-purple/30">
                <div className="flex flex-col items-end mr-2 text-right border-r border-fantasy-purple/30 pr-3">
                  <span className="text-fantasy-gold font-mono font-bold">
                    {formatInGameTime(inGameTime)}
                  </span>
                  {canTakeLongRest() ? (
                    <span className="text-[10px] text-green-400">Rest Available</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Rest in {getTimeUntilNextLongRest(timeSinceLastLongRest())}
                    </span>
                  )}
                </div>
                <span>
                  {tutorialsEnabled
                    ? t('camp.tutorialsOn', 'Tutorials on')
                    : t('camp.tutorialsOff', 'Tutorials off')}
                </span>
                <Switch checked={tutorialsEnabled} onCheckedChange={setTutorialsEnabled} />
              </div>
            </div>

            <TabsContent value="adventures" className="flex-1 mt-0">
              <Card className="scroll-parchment h-full">
                <CardHeader>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Swords className="h-5 w-5 text-fantasy-gold" />
                          {t('camp.chooseAdventure', 'Choose an Adventure')}
                        </CardTitle>
                        <CardDescription>
                          {t('camp.adventureTip', 'Select the mission you wish to undertake next.')}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {AVAILABLE_ADVENTURES.map((adv) => (
                    <button
                      key={adv.id}
                      className={`w-full text-left rounded-2xl overflow-hidden border transition-all ${adv.id === selectedAdventureId
                        ? 'border-fantasy-gold bg-fantasy-dark-card shadow-xl shadow-black/40'
                        : 'border-fantasy-purple/30 hover:border-fantasy-gold/60 bg-fantasy-dark-card/50'
                        }`}
                      onClick={() => setSelectedAdventureId(adv.id)}
                    >
                      <div className="relative h-40 w-full">
                        <img
                          src={adv.artwork}
                          alt={adv.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                          <h3 className="text-xl font-semibold">{adv.title}</h3>
                          <Badge variant={adv.id === selectedAdventureId ? 'gold' : 'outline'}>
                            {adv.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 space-y-3 text-sm">
                        <p className="text-muted-foreground">{adv.description}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {adv.length}
                          </span>
                          <span>{t('camp.recommended', 'Recommended: Level 1')}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="character" className="flex-1 mt-0">
              <CharacterSheet
                character={character}
                onPrepareSpell={prepareSpell}
                onUnprepareSpell={unprepareSpell}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 mt-0">
              <Card className="scroll-parchment h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-fantasy-gold" />
                    {t('camp.adventureHistory', 'Adventure History')}
                  </CardTitle>
                  <CardDescription>
                    {t('camp.historyDesc', 'Tales of your past exploits and achievements.')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdventureHistory />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full bg-fantasy-dark-card border border-red-500/40 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-red-400">{t('camp.retireTitle', 'Retire Hero?')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('camp.retireBody', 'This will remove your current hero and return you to character creation. This action cannot be undone.')}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  reset();
                }}
              >
                {t('camp.retireConfirm', 'Retire Hero')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPortraitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full bg-fantasy-dark-card border border-fantasy-gold/40 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-fantasy-gold">{t('camp.changePortrait', 'Change Portrait')}</h3>
            <PortraitSelector
              raceId={heroRaceId}
              gender={heroGender as 'male' | 'female' | 'non-binary' | 'other'}
              selectedId={pendingPortraitId}
              onSelect={setPendingPortraitId}
              emptyLabel={t('characterCreation.noPortraits')}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPortraitModal(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="fantasy"
                onClick={() => {
                  if (pendingPortraitId) {
                    updateCharacter({ portraitId: pendingPortraitId });
                  }
                  setShowPortraitModal(false);
                }}
                disabled={!pendingPortraitId}
              >
                {t('common.confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <RestModal isOpen={showRestModal} onClose={() => setShowRestModal(false)} />

      {/* Level Up Modal - shown when XP threshold reached */}
      {character && (
        <LevelUpModal
          isOpen={pendingLevelUp}
          level={character.level + 1}
          hpIncrease={Math.floor(parseInt(character.class.hitDie?.replace('d', '') || '8') / 2) + 1 + Math.floor((character.abilityScores.constitution - 10) / 2)}
          talents={[]}
          selectedTalentId={null}
          onSelectTalent={() => { }}
          currentClassName={character.class.name}
          multiclassOptions={multiclassOptions}
          selectedMulticlassId={selectedMulticlassId}
          onSelectMulticlass={setSelectedMulticlassId}
          canLeaveCurrentClass={canLeave}
          onConfirm={() => {
            confirmLevelUp(selectedMulticlassId);
            setSelectedMulticlassId(null);
          }}
        />
      )}
    </div>
  );
}
