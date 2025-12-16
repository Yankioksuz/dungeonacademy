import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip } from './ui/tooltip';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, ArrowLeft, User, CheckCircle2, Shuffle } from 'lucide-react';
import characterCreationContent from '@/content/characterCreation.json';
import traitExplanations from '@/content/traitExplanations.json';
import type { Race, Class, Background, SkillName } from '@/types';
import { cn } from '@/lib/utils';
import { generateRandomName } from '@/utils/nameGenerator';
import { PortraitSelector } from './PortraitSelector';
import { portraits } from '@/data/portraits';
import { SKILL_ABILITY_MAP } from '@/utils/skillUtils';

const CHARACTER_CREATION_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'class', label: 'Class' },
  { id: 'background', label: 'Background' },
  { id: 'ability-scores', label: 'Ability Scores' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'review', label: 'Review' },
];

// Tooltip explanations for character creation options
const FIGHTING_STYLE_TOOLTIPS: Record<string, string> = {
  'Archery': '+2 bonus to attack rolls with ranged weapons. Great for bow-focused fighters.',
  'Defense': '+1 bonus to AC while wearing armor. Increases survivability in melee.',
  'Dueling': '+2 damage when wielding a one-handed weapon with no other weapons. Pairs well with a shield.',
  'Great Weapon Fighting': 'Reroll 1s and 2s on damage dice for two-handed weapons. Maximizes damage output.',
  'Two-Weapon Fighting': 'Add ability modifier to off-hand attack damage. Essential for dual-wielders.',
};

const PACT_BOON_TOOLTIPS: Record<string, string> = {
  'Pact of the Blade': 'Create a magical weapon that can take any form. Your patron\'s power manifests as a deadly weapon bent to your will.',
  'Pact of the Chain': 'Gain an improved familiar (imp, pseudodragon, quasit, or sprite). A loyal servant for scouting and assistance.',
  'Pact of the Tome': 'Receive a Book of Shadows with 3 cantrips from any class. Expands your magical versatility.',
};

const SORCEROUS_ORIGIN_TOOLTIPS: Record<string, string> = {
  'Draconic Bloodline': 'Dragon blood flows through you, granting extra HP, natural armor, and eventually elemental resistance and wings.',
  'Wild Magic': 'Your magic is unpredictable. Wild Magic Surge can cause random magical effects - chaotic but powerful.',
  'Divine Soul': 'Divine power infuses your soul. Access cleric spells and gain celestial benefits like Favored by the Gods.',
};

const LANGUAGE_TOOLTIPS: Record<string, string> = {
  'Elvish': 'The flowing language of elves, often used in poetry, song, and magical inscriptions.',
  'Dwarvish': 'A harsh, consonant-heavy language with deep roots in mining and smithing terminology.',
  'Giant': 'The thunderous tongue of giants, ogres, and other massive humanoids.',
  'Gnomish': 'A quick, technical language with many words for invention and illusion.',
  'Goblin': 'The crude but efficient language of goblins, hobgoblins, and bugbears.',
  'Halfling': 'A subtle language with many words borrowed from Common and Elvish.',
  'Orc': 'A guttural language full of harsh sounds and battle cries.',
  'Abyssal': 'The dark tongue of demons, filled with harsh sounds that hurt mortal ears.',
  'Celestial': 'The melodious language of angels and other celestial beings.',
  'Draconic': 'The ancient language of dragons, used in many magical writings.',
  'Deep Speech': 'The alien language of aberrations from the Far Realm.',
  'Infernal': 'The precise, legalistic language of devils and Baator.',
  'Primordial': 'The elemental tongue spoken by creatures of fire, water, earth, and air.',
  'Sylvan': 'The fey language of nature spirits, pixies, and dryads.',
  'Undercommon': 'The trade language of the Underdark, used by drow, duergar, and others.',
};

const SKILL_TOOLTIPS: Record<string, string> = {
  'acrobatics': 'Dexterity-based. Used for balance, tumbling, and aerial maneuvers.',
  'animal-handling': 'Wisdom-based. Calm, train, or control animals.',
  'arcana': 'Intelligence-based. Knowledge of magic, spells, and magical creatures.',
  'athletics': 'Strength-based. Climbing, jumping, swimming, and physical feats.',
  'deception': 'Charisma-based. Lying, disguises, and misdirection.',
  'history': 'Intelligence-based. Knowledge of historical events and civilizations.',
  'insight': 'Wisdom-based. Reading people\'s true intentions and emotions.',
  'intimidation': 'Charisma-based. Threatening others to get what you want.',
  'investigation': 'Intelligence-based. Finding clues, searching, and deduction.',
  'medicine': 'Wisdom-based. Stabilizing the dying and diagnosing illness.',
  'nature': 'Intelligence-based. Knowledge of plants, animals, and natural terrain.',
  'perception': 'Wisdom-based. Noticing hidden things using your senses.',
  'performance': 'Charisma-based. Entertainment through music, dance, or acting.',
  'persuasion': 'Charisma-based. Convincing others through diplomacy and charm.',
  'religion': 'Intelligence-based. Knowledge of deities, rituals, and religious history.',
  'sleight-of-hand': 'Dexterity-based. Pickpocketing, lockpicking, and manual trickery.',
  'stealth': 'Dexterity-based. Moving silently and hiding from detection.',
  'survival': 'Wisdom-based. Tracking, foraging, and navigating the wilderness.',
};

const HIT_DIE_TOOLTIP = 'The die you roll to gain HP when leveling up. Larger die = more HP potential. You also add your Constitution modifier each level.';
const PRIMARY_ABILITY_TOOLTIP = 'The ability score most important for this class. Focus your highest stats here for the best results.';

const SAVING_THROW_TOOLTIPS: Record<string, string> = {
  'Strength': 'Used to resist being pushed, grappled, or physically overpowered. Common for effects like being knocked prone.',
  'Dexterity': 'Used to dodge area effects like fireballs, traps, and breath weapons. Also for avoiding some spells.',
  'Constitution': 'Used to resist poison, disease, exhaustion, and maintaining concentration on spells when damaged.',
  'Intelligence': 'Used to resist mental intrusion, illusions, and some psionic effects. Rare but important.',
  'Wisdom': 'Used to resist charm, fear, and other mind-affecting magic. One of the most common saving throws.',
  'Charisma': 'Used to resist banishment, possession, and effects that target your sense of self.',
};

const DRACONIC_ANCESTRY_TOOLTIP = (type: string, damageType: string, breathType: string) =>
  `${type} Dragon ancestry grants you a ${breathType} breath weapon dealing ${damageType} damage, and resistance to ${damageType} damage.`;


export function CharacterCreation() {
  const { t } = useTranslation();
  const {
    character,
    characterCreationStep,
    updateCharacterCreation,
    setCharacterCreationStep,
    completeCharacterCreation,
  } = useGame();

  // Initialize from character if it exists (when going back)
  const [characterName, setCharacterName] = useState(character?.name || '');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'non-binary' | 'other' | null>(character?.gender || null);
  const [selectedRace, setSelectedRace] = useState<Race | null>(character?.race || null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(character?.class || null);
  const [selectedBackground, setSelectedBackground] = useState<Background | null>(character?.background || null);
  const [selectedPortraitId, setSelectedPortraitId] = useState<string | null>(character?.portraitId || null);
  const [abilityScores, setAbilityScores] = useState(character?.abilityScores || {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  });
  const handleSelectRace = (race: Race) => {
    setSelectedRace(race);
    if (race.id !== 'human' && humanBonusSkill !== null) {
      setHumanBonusSkill(null);
    }
    if (race.id !== 'dragonborn' && draconicAncestry !== null) {
      setDraconicAncestry(null);
    }
  };

  const handleSelectClass = (cls: Class) => {
    setSelectedClass(cls);
    if (cls.id !== 'rogue' && rogueExpertise.length > 0) {
      setRogueExpertise([]);
    }
    if (cls.id !== 'fighter' && fightingStyle !== null) {
      setFightingStyle(null);
    }
    if (cls.id !== 'warlock' && pactBoon !== null) {
      setPactBoon(null);
    }
    if (cls.id !== 'sorcerer' && sorcerousOrigin !== null) {
      setSorcerousOrigin(null);
    }
  };

  const DRACONIC_ANCESTRIES = [
    { type: 'Black', damageType: 'Acid', breathCone: false },
    { type: 'Blue', damageType: 'Lightning', breathCone: false },
    { type: 'Brass', damageType: 'Fire', breathCone: false },
    { type: 'Bronze', damageType: 'Lightning', breathCone: false },
    { type: 'Copper', damageType: 'Acid', breathCone: false },
    { type: 'Gold', damageType: 'Fire', breathCone: true },
    { type: 'Green', damageType: 'Poison', breathCone: true },
    { type: 'Red', damageType: 'Fire', breathCone: true },
    { type: 'Silver', damageType: 'Cold', breathCone: true },
    { type: 'White', damageType: 'Cold', breathCone: true },
  ];

  const EXTRA_LANGUAGES = [
    'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
    'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'
  ];

  // NEW: Racial Options State
  const [draconicAncestry, setDraconicAncestry] = useState<{ type: string; damageType: string; breathCone: boolean } | null>(null);
  const [extraLanguage, setExtraLanguage] = useState<string>('');
  const [humanBonusSkill, setHumanBonusSkill] = useState<SkillName | null>(null);
  const [rogueExpertise, setRogueExpertise] = useState<SkillName[]>([]);
  const [fightingStyle, setFightingStyle] = useState<string | null>(null);
  const [pactBoon, setPactBoon] = useState<string | null>(null);
  const [sorcerousOrigin, setSorcerousOrigin] = useState<string | null>(null);

  // Background language selection
  const [backgroundLanguages, setBackgroundLanguages] = useState<string[]>([]);

  // Helper to parse language count from text like "Two of your choice"
  const parseLanguageCount = (langText: string): number => {
    const lowerText = langText.toLowerCase();
    if (lowerText.includes('two')) return 2;
    if (lowerText.includes('one')) return 1;
    if (lowerText.includes('three')) return 3;
    return 0;
  };

  // Get total background language slots needed
  const getBackgroundLanguageSlots = (): number => {
    if (!selectedBackground?.languages) return 0;
    return selectedBackground.languages.reduce((total, lang) => {
      if (lang.toLowerCase().includes('of your choice')) {
        return total + parseLanguageCount(lang);
      }
      return total;
    }, 0);
  };

  // Update local state when character changes (e.g., when going back or starting fresh)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (selectedPortraitId && selectedRace) {
        const normalizedGender = selectedGender === 'other' ? 'non-binary' : selectedGender;
        const portrait = portraits.find(
          (p) => p.id === selectedPortraitId && p.race === selectedRace.id.toLowerCase() && (!normalizedGender || p.gender === normalizedGender)
        );
        if (!portrait) {
          setSelectedPortraitId(null);
        }
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [selectedRace, selectedGender, selectedPortraitId]);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      if (character) {
        if (character.name) setCharacterName(character.name);
        if (character.gender) setSelectedGender(character.gender);
        if (character.race) setSelectedRace(character.race);
        if (character.class) setSelectedClass(character.class);
        if (character.background) setSelectedBackground(character.background);
        if (character.abilityScores) setAbilityScores(character.abilityScores);
        if (character.portraitId) setSelectedPortraitId(character.portraitId);
        if (character.draconicAncestry) {
          setDraconicAncestry(character.draconicAncestry);
        }
        if (character.bonusSkills?.length) {
          setHumanBonusSkill(character.bonusSkills[0] as SkillName);
        }
        if (character.expertiseSkills?.length) {
          setRogueExpertise(character.expertiseSkills as SkillName[]);
        }
        if (character.fightingStyle) setFightingStyle(character.fightingStyle);
        if (character.pactBoon) setPactBoon(character.pactBoon);
        if (character.sorcerousOrigin) setSorcerousOrigin(character.sorcerousOrigin);
      } else {
        // Reset to defaults when starting fresh character creation
        setCharacterName('');
        setSelectedGender(null);
        setSelectedRace(null);
        setSelectedClass(null);
        setSelectedBackground(null);
        setSelectedPortraitId(null);
        setAbilityScores({
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        });
        setHumanBonusSkill(null);
        setRogueExpertise([]);
        setFightingStyle(null);
        setPactBoon(null);
        setSorcerousOrigin(null);
        setBackgroundLanguages([]);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [character]);

  // Reset background languages when background changes
  useEffect(() => {
    setBackgroundLanguages([]);
  }, [selectedBackground]);

  // Don't render if character is complete (finalized with HP calculated)
  // This check must come AFTER all hooks are called (Rules of Hooks)
  // We check maxHitPoints > 0 because that only gets set in completeCharacterCreation
  if (character && character.maxHitPoints > 0 && characterCreationStep === 0) {
    // Character creation is complete, let Game component show the adventure screen
    return null;
  }

  const currentStep = CHARACTER_CREATION_STEPS[characterCreationStep];
  const isLastStep = characterCreationStep === CHARACTER_CREATION_STEPS.length - 1;
  const isFirstStep = characterCreationStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      // Complete character creation - pass all data directly
      if (selectedRace && selectedClass && selectedBackground && characterName && selectedPortraitId) {
        if (selectedRace.id === 'human' && !humanBonusSkill) {
          return;
        }
        // Create complete character data
        const characterData = {
          id: 'player-1',
          name: characterName,
          gender: selectedGender || undefined,
          race: selectedRace,
          class: selectedClass,
          background: selectedBackground,
          abilityScores,
          level: 1,

          portraitId: selectedPortraitId,
          // Don't set hitPoints/maxHitPoints - let completeCharacterCreation calculate them

          // Pass racial options
          draconicAncestry: draconicAncestry || undefined,
          // Pass extra language if selected (will be merged with others in GameContext)
          languages: [...(extraLanguage ? [extraLanguage] : []), ...backgroundLanguages],
          bonusSkills: humanBonusSkill ? [humanBonusSkill] : [],
          expertiseSkills: rogueExpertise,
          fightingStyle: fightingStyle || undefined,
          pactBoon: pactBoon || undefined,
          sorcerousOrigin: sorcerousOrigin || undefined,
        };

        // Complete with all final data
        completeCharacterCreation(characterData);
      }
    } else {
      // Save current step data
      if (characterCreationStep === 0 && characterName && selectedRace) {
        // Identity step - save name, gender, and race together
        updateCharacterCreation({ name: characterName, gender: selectedGender || undefined, race: selectedRace });
      } else if (characterCreationStep === 1 && selectedClass) {
        updateCharacterCreation({ class: selectedClass });
      } else if (characterCreationStep === 2 && selectedBackground) {
        updateCharacterCreation({ background: selectedBackground });
      } else if (characterCreationStep === 3) {
        updateCharacterCreation({ abilityScores });
      } else if (characterCreationStep === 4 && selectedPortraitId) {
        updateCharacterCreation({ portraitId: selectedPortraitId });
      }

      setCharacterCreationStep(characterCreationStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCharacterCreationStep(characterCreationStep - 1);
    }
  };

  const canProceed = () => {
    switch (characterCreationStep) {
      case 0:
        // Identity step - need both name and race
        return characterName.trim().length > 0 && selectedRace !== null;
      case 1:
        if (!selectedClass) return false;
        if (selectedClass.id === 'fighter' && !fightingStyle) return false;
        if (selectedClass.id === 'warlock' && !pactBoon) return false;
        if (selectedClass.id === 'sorcerer' && !sorcerousOrigin) return false;
        return true;
      case 2: {
        // Background step - check if languages need selection
        if (!selectedBackground) return false;
        const requiredLanguages = getBackgroundLanguageSlots();
        if (requiredLanguages > 0 && backgroundLanguages.length < requiredLanguages) return false;
        return true;
      }
      case 3:
        return true; // Ability scores always valid
      case 4:
        return selectedPortraitId !== null;
      case 5: {
        // Review step - ensure all required fields are present
        const hasHumanSkill = selectedRace?.id === 'human' ? Boolean(humanBonusSkill) : true;
        const hasRequiredLanguages = getBackgroundLanguageSlots() === 0 || backgroundLanguages.length >= getBackgroundLanguageSlots();
        return selectedRace !== null && selectedClass !== null && selectedBackground !== null && characterName.trim().length > 0 && hasHumanSkill && hasRequiredLanguages;
      }
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (characterCreationStep) {
      case 0:
        // Combined Identity Step: Name, Race, and Gender
        return (
          <div className="space-y-6">
            {/* Tutorial */}
            <Alert variant="fantasy">
              <AlertDescription className="text-sm">{t('characterCreation.identityTutorial')}</AlertDescription>
            </Alert>

            {/* Name Input - Moved to Top */}
            <div className="space-y-3">
              <h3 className="font-semibold text-fantasy-gold uppercase tracking-wider">{t('characterCreation.nameLabel')}</h3>
              <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 w-full">
                <p className="text-xs text-muted-foreground mb-3">{t('characterCreation.nameTutorial')}</p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder={t('characterCreation.namePlaceholder')}
                    className="w-full bg-fantasy-dark-surface border-fantasy-purple/50 text-foreground placeholder:text-muted-foreground focus:border-fantasy-purple focus:ring-1 focus:ring-fantasy-purple"
                  />
                  <Tooltip content={t('characterCreation.generateRandomName')} position="top">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const raceName = selectedRace?.name || 'Human';
                        const randomName = generateRandomName(raceName, selectedGender || undefined);
                        setCharacterName(randomName);
                      }}
                      className="shrink-0"
                      disabled={!selectedRace}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {selectedRace
                    ? `${t('characterCreation.randomNameTip')} ${t('characterCreation.randomNameTipForRace')} ${selectedRace.name}!`
                    : t('characterCreation.selectRaceFirst')
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Race Selection */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-semibold text-fantasy-gold uppercase tracking-wider text-lg">{t('characterCreation.race')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {characterCreationContent.races.map((race) => {
                    const isSelected = selectedRace?.id === race.id;
                    // Find a representative portrait (prefer male 01 for generic, or just first available)
                    const racePortrait = portraits.find(p => p.race === race.id && p.gender === 'male')?.src ||
                      portraits.find(p => p.race === race.id)?.src;

                    return (
                      <Card
                        key={race.id}
                        className={cn(
                          'cursor-pointer transition-all hover:scale-[1.02] relative group min-h-48',
                          isSelected && [
                            'ring-2 ring-fantasy-purple',
                            'bg-fantasy-purple/20',
                            'border-fantasy-purple',
                            'shadow-lg shadow-fantasy-purple/20'
                          ],
                          !isSelected && 'hover:ring-1 hover:ring-fantasy-purple/50'
                        )}
                        onClick={() => handleSelectRace(race)}
                      >
                        <div className="flex h-full">
                          {/* Race Image */}
                          <div className="w-1/3 relative shrink-0 border-r border-fantasy-purple/20 overflow-hidden rounded-l-lg">
                            {racePortrait ? (
                              <>
                                <img
                                  src={racePortrait}
                                  alt={race.name}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                              </>
                            ) : (
                              <div className="absolute inset-0 bg-fantasy-dark-surface flex items-center justify-center">
                                <User className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-2 left-2 z-10">
                                <CheckCircle2 className="h-5 w-5 text-fantasy-purple fill-background" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-3 flex flex-col">
                            <div className="flex justify-between items-start mb-1 shrink-0">
                              <h4 className="font-bold text-lg flex items-center gap-2">
                                {race.name}
                              </h4>
                            </div>

                            <p className="text-xs text-muted-foreground mb-3 line-clamp-3 leading-relaxed shrink-0">
                              {race.description}
                            </p>

                            <div className="mt-auto space-y-1">
                              <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80">Traits</p>
                              <div className="flex flex-wrap gap-1">
                                {(race.traits || []).slice(0, 2).map((trait) => {
                                  // Show only first 2 traits to save space
                                  const explanation = traitExplanations.races[trait as keyof typeof traitExplanations.races];
                                  return (
                                    <Tooltip key={trait} content={explanation || trait}>
                                      <Badge
                                        variant="fantasy"
                                        className="text-[10px] px-1.5 py-0 h-5 border-fantasy-purple/30 bg-fantasy-purple/10 text-fantasy-purple-foreground whitespace-nowrap cursor-help"
                                      >
                                        {trait}
                                      </Badge>
                                    </Tooltip>
                                  );
                                })}
                                {(race.traits?.length || 0) > 2 && (
                                  <Tooltip
                                    content={
                                      <div className="space-y-2">
                                        <p className="font-semibold text-xs border-b border-white/20 pb-1 text-fantasy-gold uppercase tracking-wider">More Traits</p>
                                        {(race.traits || []).slice(2).map((trait) => {
                                          const explanation = traitExplanations.races[trait as keyof typeof traitExplanations.races];
                                          return (
                                            <div key={trait} className="text-xs">
                                              <span className="font-bold text-fantasy-gold">{trait}:</span> <span className="text-white/90">{explanation}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    }
                                  >
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-5 border-muted-foreground/30 text-muted-foreground hover:bg-muted/20 cursor-help"
                                    >
                                      +{(race.traits?.length || 0) - 2} more
                                    </Badge>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Racial Sub-Selections - Kept in flow with Race selection */}
                {selectedRace?.id === 'dragonborn' && (
                  <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mt-4">
                    <p className="text-sm font-semibold mb-3">Draconic Ancestry</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Choose your draconic ancestry. This determines your breath weapon and damage resistance.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DRACONIC_ANCESTRIES.map((ancestry) => (
                        <Tooltip
                          key={ancestry.type}
                          content={DRACONIC_ANCESTRY_TOOLTIP(ancestry.type, ancestry.damageType, ancestry.breathCone ? '15ft cone' : '30ft line')}
                        >
                          <Button
                            type="button"
                            variant={draconicAncestry?.type === ancestry.type ? 'default' : 'outline'}
                            className={cn(
                              "justify-start text-xs cursor-help",
                              draconicAncestry?.type === ancestry.type && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                            )}
                            onClick={() => setDraconicAncestry(ancestry)}
                          >
                            <span className="font-bold mr-1">{ancestry.type}</span>
                            <span className="text-[10px] opacity-80">({ancestry.damageType})</span>
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRace?.id === 'human' && (
                  <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mt-4">
                    <p className="text-sm font-semibold mb-3">Extra Language</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Humans learn one extra language of their choice.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXTRA_LANGUAGES.filter(l => l !== 'Common').map((lang) => (
                        <Tooltip key={lang} content={LANGUAGE_TOOLTIPS[lang] || `Learn to speak, read, and write ${lang}.`}>
                          <Button
                            type="button"
                            variant={extraLanguage === lang ? 'default' : 'outline'}
                            className={cn(
                              "text-xs cursor-help",
                              extraLanguage === lang && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                            )}
                            onClick={() => setExtraLanguage(lang)}
                          >
                            {lang}
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRace?.id === 'human' && (
                  <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mt-4">
                    <p className="text-sm font-semibold mb-3">Extra Skill Proficiency</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Choose one skill to gain proficiency in.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(SKILL_ABILITY_MAP) as SkillName[]).map((skill) => (
                        <Tooltip key={skill} content={SKILL_TOOLTIPS[skill] || `Proficiency in ${skill}.`}>
                          <Button
                            type="button"
                            variant={humanBonusSkill === skill ? 'default' : 'outline'}
                            className={cn(
                              "text-xs capitalize cursor-help",
                              humanBonusSkill === skill && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                            )}
                            onClick={() => setHumanBonusSkill(skill)}
                          >
                            {skill.replace(/-/g, ' ')}
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Gender Selection */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-semibold text-fantasy-gold uppercase tracking-wider">{t('characterCreation.genderLabel')}</h3>
                <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 h-fit sticky top-4">
                  <p className="text-xs text-muted-foreground mb-4">{t('characterCreation.genderTutorial')}</p>
                  <div className="flex flex-col gap-3">
                    {['male', 'female', 'non-binary', 'other'].map((gender) => (
                      <Button
                        key={gender}
                        type="button"
                        variant={selectedGender === gender ? 'default' : 'outline'}
                        className={cn(
                          "capitalize w-full h-12 text-md",
                          selectedGender === gender && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                        )}
                        onClick={() => setSelectedGender(gender as 'male' | 'female' | 'non-binary' | 'other')}
                      >
                        {t(`characterCreation.gender.${gender}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        // Class Selection - Grid layout with detail panel
        return (
          <div className="space-y-4">
            <Alert variant="fantasy" className="mb-4">
              <AlertDescription className="text-sm">{t('characterCreation.classTutorial')}</AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Class Grid */}
              <div className="lg:col-span-2">
                <h3 className="font-semibold text-fantasy-gold uppercase tracking-wider text-lg mb-4">{t('characterCreation.class')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {characterCreationContent.classes.map((classOption) => {
                    const isSelected = selectedClass?.id === classOption.id;
                    return (
                      <Card
                        key={classOption.id}
                        className={cn(
                          'cursor-pointer transition-all hover:scale-[1.02] relative p-3 h-28',
                          isSelected && [
                            'ring-2 ring-fantasy-purple',
                            'bg-fantasy-purple/20',
                            'border-fantasy-purple',
                            'shadow-lg shadow-fantasy-purple/20'
                          ],
                          !isSelected && 'hover:ring-1 hover:ring-fantasy-purple/50 bg-fantasy-dark-card'
                        )}
                        onClick={() => handleSelectClass(classOption as unknown as Class)}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-fantasy-purple" />
                          </div>
                        )}
                        <h4 className="font-bold text-sm mb-1">{classOption.name}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
                          {classOption.description}
                        </p>
                      </Card>
                    );
                  })}
                </div>

                {/* Class Sub-Selections */}
                {selectedClass?.id === 'rogue' && (
                  <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mt-4">
                    <p className="text-sm font-semibold mb-2">Rogue Expertise</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Choose up to two skills to gain expertise (double proficiency).
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(SKILL_ABILITY_MAP) as SkillName[]).map((skill) => {
                        const isPicked = rogueExpertise.includes(skill);
                        const limitReached = rogueExpertise.length >= 2 && !isPicked;
                        return (
                          <Tooltip key={skill} content={`${SKILL_TOOLTIPS[skill] || skill} Expertise doubles your proficiency bonus.`}>
                            <Button
                              type="button"
                              variant={isPicked ? 'default' : 'outline'}
                              disabled={limitReached}
                              className={cn(
                                "text-xs capitalize cursor-help",
                                isPicked && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                              )}
                              onClick={() => {
                                setRogueExpertise((prev) => {
                                  if (isPicked) return prev.filter((s) => s !== skill);
                                  if (prev.length >= 2) return prev;
                                  return [...prev, skill];
                                });
                              }}
                            >
                              {skill.replace(/-/g, ' ')}
                            </Button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedClass?.id === 'fighter' && (
                  <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mt-4">
                    <p className="text-sm font-semibold mb-2">Fighting Style</p>
                    <p className="text-xs text-muted-foreground mb-3">Choose one fighting style.</p>
                    <div className="flex flex-wrap gap-2">
                      {['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Two-Weapon Fighting'].map((style) => (
                        <Tooltip key={style} content={FIGHTING_STYLE_TOOLTIPS[style] || style}>
                          <Button
                            type="button"
                            variant={fightingStyle === style ? 'default' : 'outline'}
                            className={cn(
                              "text-xs cursor-help",
                              fightingStyle === style && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                            )}
                            onClick={() => setFightingStyle(style)}
                          >
                            {style}
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedClass?.id === 'warlock' && (
                  <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mt-4">
                    <p className="text-sm font-semibold mb-2">Pact Boon</p>
                    <p className="text-xs text-muted-foreground mb-3">Choose your pact boon.</p>
                    <div className="flex flex-wrap gap-2">
                      {['Pact of the Blade', 'Pact of the Chain', 'Pact of the Tome'].map((pact) => (
                        <Tooltip key={pact} content={PACT_BOON_TOOLTIPS[pact] || pact}>
                          <Button
                            type="button"
                            variant={pactBoon === pact ? 'default' : 'outline'}
                            className={cn(
                              "text-xs cursor-help",
                              pactBoon === pact && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                            )}
                            onClick={() => setPactBoon(pact)}
                          >
                            {pact}
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedClass?.id === 'sorcerer' && (
                  <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mt-4">
                    <p className="text-sm font-semibold mb-2">Sorcerous Origin</p>
                    <p className="text-xs text-muted-foreground mb-3">Choose your origin.</p>
                    <div className="flex flex-wrap gap-2">
                      {['Draconic Bloodline', 'Wild Magic', 'Divine Soul'].map((origin) => (
                        <Tooltip key={origin} content={SORCEROUS_ORIGIN_TOOLTIPS[origin] || origin}>
                          <Button
                            type="button"
                            variant={sorcerousOrigin === origin ? 'default' : 'outline'}
                            className={cn(
                              "text-xs cursor-help",
                              sorcerousOrigin === origin && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                            )}
                            onClick={() => setSorcerousOrigin(origin)}
                          >
                            {origin}
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Class Details Panel */}
              <div className="lg:col-span-1">
                <h3 className="font-semibold text-fantasy-gold uppercase tracking-wider mb-4">Class Details</h3>
                <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 h-fit sticky top-4">
                  {selectedClass ? (
                    <div className="space-y-4">
                      <h4 className="text-xl font-bold text-fantasy-gold">{selectedClass.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedClass.description}
                      </p>

                      <div className="space-y-3 pt-3 border-t border-fantasy-purple/20">
                        <div className="grid grid-cols-2 gap-4">
                          <Tooltip content={PRIMARY_ABILITY_TOOLTIP}>
                            <div className="cursor-help">
                              <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80">Primary Abilities</p>
                              <p className="text-sm">{selectedClass.primaryAbility}</p>
                            </div>
                          </Tooltip>

                          <Tooltip content={HIT_DIE_TOOLTIP}>
                            <div className="cursor-help">
                              <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80">Hit Dice</p>
                              <p className="text-sm">{selectedClass.hitDie}</p>
                            </div>
                          </Tooltip>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80 mb-2">Class Features</p>
                          <div className="space-y-1">
                            {selectedClass.features?.map((feature) => {
                              const explanation = traitExplanations.classes[feature as keyof typeof traitExplanations.classes];
                              return (
                                <Tooltip key={feature} content={explanation || feature}>
                                  <div className="flex items-center gap-2 text-sm cursor-help hover:text-fantasy-purple transition-colors">
                                    <span className="text-fantasy-gold">•</span>
                                    <span>{feature}</span>
                                  </div>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80 mb-2">Saving Throws</p>
                          <div className="inline-flex gap-2">
                            {selectedClass.savingThrows?.map((save) => (
                              <Tooltip key={save} content={SAVING_THROW_TOOLTIPS[save] || `Proficiency in ${save} saving throws.`}>
                                <Badge variant="fantasy" className="text-xs cursor-help">
                                  {save}
                                </Badge>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Select a class to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        // Background Selection - Grid layout with detail panel
        return (
          <div className="space-y-4">
            <Alert variant="fantasy" className="mb-4">
              <AlertDescription className="text-sm">{t('characterCreation.backgroundTutorial')}</AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Background Grid */}
              <div className="lg:col-span-2">
                <h3 className="font-semibold text-fantasy-gold uppercase tracking-wider text-lg mb-4">{t('characterCreation.background')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {characterCreationContent.backgrounds.map((bg) => {
                    const isSelected = selectedBackground?.id === bg.id;
                    return (
                      <Card
                        key={bg.id}
                        className={cn(
                          'cursor-pointer transition-all hover:scale-[1.02] relative p-3 h-24',
                          isSelected && [
                            'ring-2 ring-fantasy-purple',
                            'bg-fantasy-purple/20',
                            'border-fantasy-purple',
                            'shadow-lg shadow-fantasy-purple/20'
                          ],
                          !isSelected && 'hover:ring-1 hover:ring-fantasy-purple/50 bg-fantasy-dark-card'
                        )}
                        onClick={() => setSelectedBackground(bg)}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-fantasy-purple" />
                          </div>
                        )}
                        <h4 className="font-bold text-sm mb-1">{bg.name}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {bg.description}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Right: Background Details Panel */}
              <div className="lg:col-span-1">
                <h3 className="font-semibold text-fantasy-gold uppercase tracking-wider mb-4">Background Details</h3>
                <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 h-fit sticky top-4">
                  {selectedBackground ? (
                    <div className="space-y-4">
                      <h4 className="text-xl font-bold text-fantasy-gold">{selectedBackground.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedBackground.description}
                      </p>

                      <div className="space-y-3 pt-3 border-t border-fantasy-purple/20">
                        <div>
                          <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80 mb-2">Skill Proficiencies</p>
                          <div className="space-y-1">
                            {selectedBackground.skillProficiencies.map((skill) => (
                              <Tooltip
                                key={skill}
                                content={`Proficiency in ${skill} means you add your proficiency bonus (+2 at level 1) to ability checks using this skill.`}
                              >
                                <div className="flex items-center gap-2 text-sm cursor-help hover:text-fantasy-purple transition-colors">
                                  <span className="text-fantasy-gold">•</span>
                                  <span>{skill}</span>
                                </div>
                              </Tooltip>
                            ))}
                          </div>
                        </div>

                        {selectedBackground.languages && selectedBackground.languages.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80 mb-2">Languages</p>
                            {(() => {
                              const slots = getBackgroundLanguageSlots();
                              if (slots > 0) {
                                // Languages require selection
                                return (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                      Choose {slots} language{slots > 1 ? 's' : ''} ({backgroundLanguages.length}/{slots} selected)
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {EXTRA_LANGUAGES.filter(l => l !== 'Common').map((lang) => {
                                        const isSelected = backgroundLanguages.includes(lang);
                                        const canSelect = backgroundLanguages.length < slots || isSelected;
                                        return (
                                          <Tooltip key={lang} content={LANGUAGE_TOOLTIPS[lang] || `Learn to speak, read, and write ${lang}.`}>
                                            <Button
                                              type="button"
                                              variant={isSelected ? 'default' : 'outline'}
                                              size="sm"
                                              disabled={!canSelect}
                                              className={cn(
                                                "text-xs h-7 cursor-help",
                                                isSelected && "ring-2 ring-fantasy-purple bg-fantasy-purple hover:bg-fantasy-purple/90"
                                              )}
                                              onClick={() => {
                                                if (isSelected) {
                                                  setBackgroundLanguages(backgroundLanguages.filter(l => l !== lang));
                                                } else if (canSelect) {
                                                  setBackgroundLanguages([...backgroundLanguages, lang]);
                                                }
                                              }}
                                            >
                                              {lang}
                                            </Button>
                                          </Tooltip>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              } else {
                                // Fixed languages (no selection needed)
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedBackground.languages.map((lang, idx) => (
                                      <Badge key={idx} variant="fantasy" className="text-xs">
                                        {lang}
                                      </Badge>
                                    ))}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        )}

                        <div>
                          <p className="text-[10px] font-semibold text-fantasy-gold uppercase tracking-wide opacity-80 mb-2">Starting Equipment</p>
                          <div className="space-y-1">
                            {selectedBackground.equipment?.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-fantasy-gold">•</span>
                                <span className="text-muted-foreground">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Select a background to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3: {
        // Ability Scores
        const abilityExplanations: Record<string, string> = {
          strength: "Strength measures physical power. It affects melee weapon attacks, damage with melee weapons, Athletics checks, and carrying capacity. High Strength is important for fighters, barbarians, and paladins.",
          dexterity: "Dexterity measures agility, reflexes, and balance. It affects Armor Class (when wearing light or no armor), initiative, ranged weapon attacks, Acrobatics, Sleight of Hand, and Stealth checks. High Dexterity is important for rogues, rangers, and monks.",
          constitution: "Constitution measures health, stamina, and vital force. It affects your hit points (HP) - you add your Constitution modifier to your hit points each level. High Constitution is important for all characters, especially front-line fighters.",
          intelligence: "Intelligence measures reasoning ability and memory. It affects spellcasting for wizards, Investigation, History, Arcana, Nature, and Religion checks. High Intelligence is important for wizards and artificers.",
          wisdom: "Wisdom reflects awareness, intuition, and insight. It affects Perception, Insight, Survival, Medicine, Animal Handling, and spellcasting for clerics and druids. High Wisdom is important for clerics, druids, and rangers.",
          charisma: "Charisma measures force of personality, persuasiveness, and leadership. It affects social interactions, Deception, Intimidation, Performance, Persuasion, and spellcasting for bards, sorcerers, warlocks, and paladins. High Charisma is important for bards, sorcerers, and warlocks.",
        };

        const modifierExplanation = "The modifier is calculated as (score - 10) / 2, rounded down. This modifier is added to attack rolls, damage rolls, ability checks, and saving throws. A score of 10-11 gives +0, 12-13 gives +1, 14-15 gives +2, etc.";

        const POINT_LIMIT = 27;
        const MIN_SCORE = 8;
        const MAX_SCORE = 15;
        const COST_TABLE: Record<number, number> = {
          8: 0,
          9: 1,
          10: 2,
          11: 3,
          12: 4,
          13: 5,
          14: 7,
          15: 9,
        };

        const totalSpent = Object.values(abilityScores).reduce((sum, score) => sum + COST_TABLE[score], 0);
        const remainingPoints = POINT_LIMIT - totalSpent;

        const changeScore = (ability: string, delta: number) => {
          setAbilityScores((prev) => {
            const nextValue = (prev[ability as keyof typeof prev] || 10) + delta;
            const clamped = Math.max(MIN_SCORE, Math.min(MAX_SCORE, nextValue));
            if (clamped === prev[ability as keyof typeof prev]) {
              return prev;
            }

            const hypotheticalScores = { ...prev, [ability]: clamped };
            const newTotal = Object.values(hypotheticalScores).reduce((sum, score) => sum + COST_TABLE[score], 0);
            if (newTotal > POINT_LIMIT) {
              return prev;
            }
            return hypotheticalScores;
          });
        };

        return (
          <div className="space-y-4">
            <Alert variant="fantasy" className="mb-4 space-y-2">
              <AlertDescription className="text-sm">{t('characterCreation.abilityScoresTutorial')}</AlertDescription>
              <p className="text-xs text-muted-foreground">
                Points remaining: <strong>{remainingPoints}</strong> (total budget {POINT_LIMIT})
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAbilityScores({
                  strength: 10,
                  dexterity: 10,
                  constitution: 10,
                  intelligence: 10,
                  wisdom: 10,
                  charisma: 10,
                })}
                className="mt-2"
              >
                Reset to Default Array
              </Button>
            </Alert>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(abilityScores).map(([ability, value]) => {
                const modifier = Math.floor((value - 10) / 2);
                return (
                  <div key={ability} className="space-y-2">
                    <Tooltip content={abilityExplanations[ability] || `${ability} is an important ability score.`}>
                      <label className="text-sm font-semibold capitalize cursor-help hover:text-fantasy-purple transition-colors inline-block">
                        {ability}
                      </label>
                    </Tooltip>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => changeScore(ability, -1)}
                        disabled={value <= MIN_SCORE}
                        className="w-10 h-10"
                      >
                        -
                      </Button>
                      <div className="w-16 text-center px-3 py-2 bg-fantasy-dark-surface border border-fantasy-purple/30 rounded-md text-foreground">
                        {value}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => changeScore(ability, 1)}
                        disabled={value >= MAX_SCORE || remainingPoints <= 0}
                        className="w-10 h-10"
                      >
                        +
                      </Button>
                      <Tooltip content={modifierExplanation}>
                        <Badge variant="gold" className="cursor-help">
                          {modifier >= 0 ? '+' : ''}
                          {modifier}
                        </Badge>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 4: {
        return (
          <div className="space-y-4">
            <div className="p-4 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30">
              <p className="text-sm font-semibold mb-2">{t('characterCreation.portrait')}</p>
              <p className="text-xs text-muted-foreground">{t('characterCreation.portraitTutorial')}</p>
            </div>
            <PortraitSelector
              raceId={selectedRace?.id}
              gender={selectedGender}
              selectedId={selectedPortraitId}
              onSelect={setSelectedPortraitId}
              emptyLabel={t('characterCreation.noPortraits')}
            />
          </div>
        );
      }

      case 5: {
        // Review Step
        const reviewAbilityExplanations: Record<string, string> = {
          strength: "Strength measures physical power. It affects melee weapon attacks, damage with melee weapons, Athletics checks, and carrying capacity.",
          dexterity: "Dexterity measures agility, reflexes, and balance. It affects Armor Class, initiative, ranged weapon attacks, and Stealth checks.",
          constitution: "Constitution measures health, stamina, and vital force. It affects your hit points - you add your Constitution modifier to your hit points each level.",
          intelligence: "Intelligence measures reasoning ability and memory. It affects spellcasting for wizards and Investigation checks.",
          wisdom: "Wisdom reflects awareness, intuition, and insight. It affects Perception, Insight, and spellcasting for clerics and druids.",
          charisma: "Charisma measures force of personality, persuasiveness, and leadership. It affects social interactions and spellcasting for bards, sorcerers, and warlocks.",
        };

        const portraitSrc = selectedPortraitId
          ? portraits.find((portrait) => portrait.id === selectedPortraitId)?.src
          : undefined;

        return (
          <div className="space-y-4">
            <div className="p-4 md:p-6 bg-fantasy-dark-card rounded-md border border-fantasy-purple/30 mb-4">
              <p className="text-lg font-semibold mb-4">{t('characterCreation.reviewTitle')}</p>

              <div className="grid md:grid-cols-[1.5fr_1fr] gap-6">
                <div className="space-y-3 text-sm">
                  <p><strong>{t('characterCreation.name')}:</strong> {characterName}</p>
                  {selectedGender && (
                    <p><strong>{t('characterCreation.genderLabel')}:</strong> {t(`characterCreation.gender.${selectedGender}`)}</p>
                  )}
                  <p><strong>{t('characterCreation.race')}:</strong> {selectedRace?.name}</p>
                  <p><strong>{t('characterCreation.class')}:</strong> {selectedClass?.name}</p>
                  <p><strong>{t('characterCreation.background')}:</strong> {selectedBackground?.name}</p>
                </div>

                <div className="flex items-center justify-center">
                  {portraitSrc ? (
                    <img
                      src={portraitSrc}
                      alt="Selected portrait"
                      className="w-40 h-40 rounded-2xl border-2 border-fantasy-gold/40 object-cover shadow-lg shadow-black/40"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-2xl border border-dashed border-fantasy-purple/40 flex items-center justify-center text-xs text-muted-foreground">
                      {t('characterCreation.portrait')}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-2">{t('characterCreation.abilityScores')}:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {Object.entries(abilityScores).map(([ability, value]) => {
                    const modifier = Math.floor((value - 10) / 2);
                    return (
                      <Tooltip key={ability} content={reviewAbilityExplanations[ability] || `${ability} ability score.`}>
                        <div className="flex items-center justify-between bg-fantasy-dark-surface/60 border border-fantasy-purple/20 rounded-lg px-4 py-2">
                          <span className="capitalize">{ability}</span>
                          <span className="font-semibold">
                            {value} ({modifier >= 0 ? '+' : ''}{modifier})
                          </span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 fade-in">
      <Card className="w-full max-w-4xl mx-auto scroll-parchment slide-up">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <User className="h-12 w-12 text-fantasy-gold" />
          </div>
          <CardTitle className="text-3xl text-center">{t('characterCreation.title')}</CardTitle>
          <CardDescription className="text-center mt-2">
            {t('characterCreation.subtitle')} - {currentStep.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            {CHARACTER_CREATION_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                    index <= characterCreationStep
                      ? 'bg-fantasy-purple text-white'
                      : 'bg-fantasy-dark-surface text-muted-foreground'
                  )}
                >
                  {index + 1}
                </div>
                {index < CHARACTER_CREATION_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-1 mx-2 transition-all',
                      index < characterCreationStep ? 'bg-fantasy-purple' : 'bg-fantasy-dark-surface'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {renderStepContent()}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isFirstStep}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            <Button
              variant="fantasy"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {isLastStep ? t('characterCreation.finish', 'Finish') : t('common.next')}
              {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
