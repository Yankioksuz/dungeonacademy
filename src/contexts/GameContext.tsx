import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  PlayerCharacter,
  Adventure,
  Item,
  Encounter,
  QuestEntry,
  QuestStatus,
  JournalEntry,
  AdventureHistoryEntry,
  Condition,
  ConditionType,
  AbilityName,
  SavingThrowProficiencies,
  SkillName,
  EquipmentSlot,
  Equipment,
} from '@/types';
import characterCreationContent from '@/content/characterCreation.json';
import { useSaveSystem } from '@/hooks/useSaveSystem';
import tutorialAdventure from '@/content/adventure.json';
import spireAdventure from '@/content/adventure-shadows.json';
import spellsContent from '@/content/spells.json';
import { getMaxPreparedSpells } from '@/lib/spells';
import { getProficiencyBonus, createDefaultSkills, getPassiveScore } from '@/utils/skillUtils';
import {
  calculateSpellSlots
} from '@/utils/characterStats';
import { calculateMaxHitPoints } from '@/utils/characterUtils';
import { getDefaultFeatureUses } from '@/utils/featureUtils';
import { CLASS_PROGRESSION } from '@/data/classProgression';

type CharacterUpdater =
  | Partial<PlayerCharacter>
  | ((prev: PlayerCharacter) => PlayerCharacter);

interface GameContextType {
  character: PlayerCharacter | null;
  adventure: Adventure | null;
  characterCreationStep: number;
  isInAdventure: boolean;
  tutorialsEnabled: boolean;
  setTutorialsEnabled: (value: boolean) => void;
  quests: QuestEntry[];
  journal: JournalEntry[];
  startCharacterCreation: () => void;
  updateCharacterCreation: (updates: Partial<PlayerCharacter>) => void;
  completeCharacterCreation: (finalData?: Partial<PlayerCharacter>) => void;
  setCharacterCreationStep: (step: number) => void;
  startAdventure: (adventureData: Adventure) => void;
  completeEncounter: (encounterId: string) => void;
  advanceToNextEncounter: (nextEncounterId?: string) => void;
  endAdventure: (outcome?: 'success' | 'failure' | 'abandoned', summary?: string) => void;
  reset: () => void;
  addItem: (item: Item) => void;
  equipItem: (item: Item) => void;
  unequipItem: (slot: 'weapon' | 'armor') => void;
  useItem: (item: Item) => void;
  updateCharacter: (updates: CharacterUpdater) => void;
  startConcentration: (spellId: string, spellName: string) => void;
  endConcentration: () => void;
  prepareSpell: (spellId: string) => void;
  unprepareSpell: (spellId: string) => void;
  spendSpellSlot: (level: number) => boolean;
  restoreSpellSlots: () => void;
  addQuest: (quest: QuestEntry) => void;
  updateQuestStatus: (questId: string, status: QuestStatus) => void;
  updateQuestObjective: (questId: string, objectiveId: string, completed: boolean) => void;
  addJournalEntry: (message: string, title?: string) => void;
  loadFromSave: (isAutoSave?: boolean) => boolean;
  gainXp: (amount: number) => void;
  deleteHistoryEntry: (entryId: string) => void;
  // NEW: Condition management
  addCondition: (condition: Condition) => void;
  removeCondition: (conditionType: ConditionType) => void;
  // NEW: Death saves
  recordDeathSave: (success: boolean) => void;
  resetDeathSaves: () => void;
  // NEW: Temporary HP
  addTemporaryHitPoints: (amount: number) => void;
  // NEW: Attunement
  attuneItem: (item: Item) => boolean;
  unattuneItem: (item: Item) => void;
  // NEW: Equipment slots
  equipToSlot: (item: Item, slot: EquipmentSlot) => void;
  unequipSlot: (slot: EquipmentSlot) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const addVisitedEncounter = (visited: string[] | undefined, encounterId?: string) => {
  const current = new Set(visited || []);
  if (encounterId) {
    current.add(encounterId);
  }
  return Array.from(current);
};

const canonicalAdventures = [tutorialAdventure, spireAdventure].reduce<Record<string, Adventure>>(
  (catalog, adventureData) => {
    const typedAdventure = {
      ...(adventureData as unknown as Adventure),
      currentEncounterIndex: 0,
      visitedEncounterIds: [],
    };
    catalog[typedAdventure.id] = typedAdventure;
    return catalog;
  },
  {}
);

const getCanonicalAdventure = (adventureId?: string): Adventure | null => {
  if (!adventureId) return null;
  return canonicalAdventures[adventureId] ?? null;
};

const mergeAdventureWithLatestData = (savedAdventure: Adventure | null): Adventure | null => {
  if (!savedAdventure) return null;

  const canonicalSource =
    getCanonicalAdventure(savedAdventure.id) ||
    getCanonicalAdventure(tutorialAdventure.id);
  if (!canonicalSource) return savedAdventure;

  const canonicalEncounters = canonicalSource.encounters as unknown as Encounter[];
  const savedEncounterMap = new Map(savedAdventure.encounters?.map((enc) => [enc.id, enc]) || []);

  const mergedEncounters = canonicalEncounters.map((enc) => {
    const saved = savedEncounterMap.get(enc.id);
    return {
      ...enc,
      completed: saved?.completed ?? false,
    };
  });

  const currentEncounterId = savedAdventure.encounters?.[savedAdventure.currentEncounterIndex]?.id;
  const mappedIndex = currentEncounterId
    ? mergedEncounters.findIndex((enc) => enc.id === currentEncounterId)
    : -1;
  const safeIndex =
    mappedIndex >= 0
      ? mappedIndex
      : Math.min(savedAdventure.currentEncounterIndex ?? 0, mergedEncounters.length - 1);

  return {
    ...canonicalSource,
    ...savedAdventure,
    encounters: mergedEncounters,
    currentEncounterIndex: safeIndex,
    visitedEncounterIds: savedAdventure.visitedEncounterIds || [],
  };
};

// Helper to migrate old character data to new format
const migrateCharacter = (char: Partial<PlayerCharacter> | null): PlayerCharacter | null => {
  if (!char) return null;

  // Calculate proficiency bonus if missing
  const level = char.level || 1;
  const proficiencyBonus = char.proficiencyBonus || getProficiencyBonus(level);

  // Migrate skills from array to object if needed
  let skills = char.skills;
  if (Array.isArray(skills)) {
    const defaultSkills = createDefaultSkills();
    skills.forEach((skillName: string) => {
      const normalized = skillName.toLowerCase().replace(/ /g, '-') as SkillName;
      if (defaultSkills[normalized]) {
        defaultSkills[normalized].proficient = true;
      }
    });
    skills = defaultSkills;
  } else if (!skills) {
    skills = createDefaultSkills();
  }

  // Ensure conditions array exists
  const conditions = Array.isArray(char.conditions) ? char.conditions : [];

  // Ensure death saves exist
  const deathSaves = char.deathSaves || { successes: 0, failures: 0 };

  // Ensure saving throw proficiencies exist
  let savingThrowProficiencies = char.savingThrowProficiencies;
  if (!savingThrowProficiencies && char.class) {
    // Try to get from class definition
    const classDef = char.class ? characterCreationContent.classes.find(c => c.name === char.class!.name) : undefined;
    if (classDef && classDef.savingThrowProficiencies) {
      savingThrowProficiencies = {
        strength: false, dexterity: false, constitution: false,
        intelligence: false, wisdom: false, charisma: false
      };
      classDef.savingThrowProficiencies.forEach((ability: string) => {
        const abilityName = ability as AbilityName;
        (savingThrowProficiencies as Record<AbilityName, boolean>)[abilityName] = true;
      });
    } else {
      // Fallback defaults based on class name
      savingThrowProficiencies = {
        strength: false, dexterity: false, constitution: false,
        intelligence: false, wisdom: false, charisma: false
      };
      // Set defaults based on class name logic would go here, but we'll rely on class defs mostly
    }
  }

  // Calculate passive scores if missing
  const passivePerception = char.passivePerception || getPassiveScore({ ...char, skills, proficiencyBonus } as PlayerCharacter, 'perception');
  const passiveInvestigation = char.passiveInvestigation || getPassiveScore({ ...char, skills, proficiencyBonus } as PlayerCharacter, 'investigation');
  const passiveInsight = char.passiveInsight || getPassiveScore({ ...char, skills, proficiencyBonus } as PlayerCharacter, 'insight');

  return {
    ...char,
    proficiencyBonus,
    skills,
    conditions,
    deathSaves,
    savingThrowProficiencies: savingThrowProficiencies || {
      strength: false, dexterity: false, constitution: false,
      intelligence: false, wisdom: false, charisma: false
    },
    abilityScores: char.abilityScores || {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10
    },
    hitPoints: char.hitPoints ?? char.maxHitPoints ?? 10,
    maxHitPoints: char.maxHitPoints ?? 10,
    temporaryHitPoints: char.temporaryHitPoints || 0,
    hitDice: char.hitDice || { current: 1, max: 1, die: 'd8' },
    level: char.level || 1,
    xp: char.xp || 0,
    maxXp: char.maxXp || 300,
    gold: char.gold || 0,
    languages: char.languages || ['Common'],
    weaponProficiencies: char.weaponProficiencies || [],
    armorProficiencies: char.armorProficiencies || [],
    senses: char.senses || [],
    passivePerception,
    passiveInvestigation,
    passiveInsight,
    featureUses: char.featureUses || getDefaultFeatureUses(char as PlayerCharacter),
    id: char.id || `player-${Date.now()}`,
    name: char.name || 'Hero',
    race: char.race || characterCreationContent.races[0],
    class: char.class || {
      ...characterCreationContent.classes[0],
      savingThrowProficiencies: characterCreationContent.classes[0].savingThrowProficiencies as AbilityName[]
    },
    // NEW: Migrate to multiclass format - create classes array if missing
    classes: char.classes || (char.class ? [{
      class: char.class,
      level: char.level || 1,
      subclass: char.subclass
    }] : undefined),
    background: char.background || characterCreationContent.backgrounds[0] || {
      id: 'soldier',
      name: 'Soldier',
      description: 'A trained soldier.',
      skillProficiencies: ['Athletics', 'Intimidation'],
      equipment: []
    },
  } as PlayerCharacter;
};

export function GameProvider({ children }: { children: ReactNode }) {
  const { saveGame, loadGame } = useSaveSystem();
  const [character, setCharacter] = useState<PlayerCharacter | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [characterCreationStep, setCharacterCreationStep] = useState<number>(0);
  const [isInAdventure, setIsInAdventure] = useState(false);
  const [tutorialsEnabled, setTutorialsEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [quests, setQuests] = useState<QuestEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const hydrateFromSave = useCallback((savedGame: ReturnType<typeof loadGame> | null) => {
    if (!savedGame) return false;

    // Migrate character data
    const migratedCharacter = savedGame.character ? migrateCharacter(savedGame.character) : null;
    setCharacter(migratedCharacter);
    const mergedAdventure = mergeAdventureWithLatestData(savedGame.adventure);
    const savedAdventure = mergedAdventure
      ? {
        ...mergedAdventure,
        visitedEncounterIds: addVisitedEncounter(
          mergedAdventure.visitedEncounterIds,
          mergedAdventure.encounters[mergedAdventure.currentEncounterIndex]?.id
        ),
      }
      : null;
    setAdventure(savedAdventure);
    setCharacterCreationStep(savedGame.characterCreationStep);
    setIsInAdventure(savedGame.isInAdventure);

    // Recalculate spell slots from scratch to fix any legacy data issues
    // This ensures non-casters don't have stray slots from previous bugs
    if (migratedCharacter) {
      migratedCharacter.spellSlots = calculateSpellSlots(migratedCharacter);
      setCharacter(migratedCharacter); // Update character state with recalculated slots
    }

    setQuests(savedGame.quests || []);
    setJournal(savedGame.journal || []);
    return true;
  }, []);

  const loadFromSave = useCallback((isAutoSave: boolean = true) => {
    const savedGame = loadGame(isAutoSave);
    const applied = hydrateFromSave(savedGame);
    if (applied) {
      setIsLoaded(true);
    }
    return applied;
  }, [hydrateFromSave, loadGame]);

  // Load game on mount
  useEffect(() => {
    const savedGame = loadGame(true); // Load autosave

    // Use setTimeout to avoid synchronous state update warning and ensure proper batching
    setTimeout(() => {
      hydrateFromSave(savedGame);
      setIsLoaded(true);
    }, 0);
  }, [hydrateFromSave, loadGame]);

  // Auto-save whenever state changes
  useEffect(() => {
    if (isLoaded) {
      saveGame(
        character,
        adventure,
        characterCreationStep,
        isInAdventure,
        quests,
        journal,
        true
      );
    }
  }, [character, adventure, characterCreationStep, isInAdventure, quests, journal, isLoaded, saveGame]);

  const startCharacterCreation = useCallback(() => {
    // Only clear character if we're resetting (have adventure or complete character)
    // Don't clear on initial load
    setCharacterCreationStep(0);
    setIsInAdventure(false);
    setAdventure(null);
  }, []);

  const updateCharacterCreation = useCallback((updates: Partial<PlayerCharacter>) => {
    setCharacter((prev) => {
      if (!prev) {
        // Initialize character with minimal defaults - don't set race/class/background yet
        return {
          id: 'player-1',
          name: '',
          abilityScores: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
          },
          hitPoints: 0,
          maxHitPoints: 0,
          temporaryHitPoints: 0,
          hitDice: {
            current: 1,
            max: 1,
            die: 'd8'
          },
          level: 1,
          xp: 0, // Initialize xp here
          maxXp: 300, // Initialize maxXp here
          gold: 10, // Initialize gold here
          skills: createDefaultSkills(),
          conditions: [],
          deathSaves: { successes: 0, failures: 0 },
          proficiencyBonus: 2,
          savingThrowProficiencies: {
            strength: false, dexterity: false, constitution: false,
            intelligence: false, wisdom: false, charisma: false
          },
          passivePerception: 10,
          passiveInvestigation: 10,
          passiveInsight: 10,
          talents: [],
          ...updates,
        } as PlayerCharacter;
      }
      return { ...prev, ...updates };
    });
  }, []);

  const completeCharacterCreation = useCallback((finalData?: Partial<PlayerCharacter>) => {
    setCharacter((currentCharacter) => {
      // If we already have a complete character with HP > 0, don't recreate it
      // This prevents applying racial bonuses multiple times
      if (currentCharacter && currentCharacter.maxHitPoints > 0 && !finalData) {
        return currentCharacter;
      }

      const baseCharacter = currentCharacter || {
        id: 'player-1',
        name: 'Hero',
        race: characterCreationContent.races[0],
        class: {
          ...characterCreationContent.classes[0],
          savingThrowProficiencies: characterCreationContent.classes[0].savingThrowProficiencies as AbilityName[]
        },
        background: characterCreationContent.backgrounds[0] || {
          id: 'soldier',
          name: 'Soldier',
          description: 'A trained soldier.',
          skillProficiencies: ['Athletics', 'Intimidation'],
          equipment: []
        },
        portraitId: undefined,
        abilityScores: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        hitPoints: 0,
        maxHitPoints: 0,
        temporaryHitPoints: 0,
        level: 1,
        xp: 0,
        maxXp: 300,
        gold: 10,
        skills: createDefaultSkills(),
        conditions: [],
        deathSaves: { successes: 0, failures: 0 },
        proficiencyBonus: 2,
        savingThrowProficiencies: {
          strength: false, dexterity: false, constitution: false,
          intelligence: false, wisdom: false, charisma: false
        },
        passivePerception: 10,
        passiveInvestigation: 10,
        passiveInsight: 10,
        talents: [],
        languages: ['Common'],
        weaponProficiencies: [],
        armorProficiencies: [],
        senses: [],
      };

      const abilityScores = (() => {
        const sourceScores = finalData?.abilityScores || baseCharacter.abilityScores;
        const scores = { ...sourceScores };

        // Apply racial ability score increases only when finalizing creation
        if (finalData?.race?.abilityScoreIncrease) {
          Object.entries(finalData.race.abilityScoreIncrease).forEach(([ability, increase]) => {
            const key = ability.toLowerCase() as keyof typeof scores;
            if (typeof increase === 'number' && scores[key] !== undefined) {
              scores[key] = scores[key] + increase;
            }
          });
        }

        return scores;
      })();

      const updatedCharacter = {
        ...baseCharacter,
        ...finalData,
        abilityScores,
        class: finalData?.class ? {
          ...finalData.class,
          savingThrowProficiencies: finalData.class.savingThrowProficiencies as AbilityName[]
        } : baseCharacter.class,
        languages: finalData?.languages || baseCharacter.languages || [],
        weaponProficiencies: finalData?.weaponProficiencies || baseCharacter.weaponProficiencies || [],
        armorProficiencies: finalData?.armorProficiencies || baseCharacter.armorProficiencies || [],
        senses: finalData?.senses || baseCharacter.senses || []
      };

      // Calculate HP using utility
      const calculatedMaxHP = calculateMaxHitPoints(updatedCharacter);

      console.log('Character HP calculation:', {
        class: updatedCharacter.class.name,
        hitDie: updatedCharacter.class.hitDie,
        constitution: updatedCharacter.abilityScores.constitution,
        calculatedMaxHP
      });

      return {
        ...updatedCharacter,
        maxHitPoints: calculatedMaxHP,
        hitPoints: calculatedMaxHP,
        hitDice: {
          current: updatedCharacter.level,
          max: updatedCharacter.level,
          die: updatedCharacter.class.hitDie || 'd8'
        },
        // NEW: Racial & Class Details
        languages: (() => {
          const langs = ['Common'];
          const raceName = updatedCharacter.race?.name;
          if (raceName === 'Elf') langs.push('Elvish');
          if (raceName === 'Dwarf') langs.push('Dwarvish');
          if (raceName === 'Dragonborn') langs.push('Draconic');
          if (raceName === 'Tiefling') langs.push('Infernal');
          if (raceName === 'Gnome') langs.push('Gnomish');
          if (raceName === 'Half-Orc') langs.push('Orc');
          // Add extra languages passed from creation
          if (updatedCharacter.languages) {
            langs.push(...updatedCharacter.languages);
          }
          return [...new Set(langs)];
        })(),
        weaponProficiencies: (() => {
          const profs: string[] = [];
          const raceTraits = updatedCharacter.race?.traits || [];
          if (raceTraits.includes('Elf Weapon Training')) {
            profs.push('Longsword', 'Shortsword', 'Shortbow', 'Longbow');
          }
          if (raceTraits.includes('Dwarven Combat Training')) {
            profs.push('Battleaxe', 'Handaxe', 'Light Hammer', 'Warhammer');
          }
          // Simple class defaults (can be expanded)
          const className = updatedCharacter.class.name;
          if (['Fighter', 'Paladin', 'Ranger', 'Barbarian'].includes(className)) {
            profs.push('Simple Weapons', 'Martial Weapons');
          } else if (['Cleric', 'Warlock'].includes(className)) {
            profs.push('Simple Weapons');
          } else if (className === 'Druid') {
            profs.push('Club', 'Dagger', 'Dart', 'Javelin', 'Mace', 'Quarterstaff', 'Scimitar', 'Sickle', 'Sling', 'Spear');
          } else if (className === 'Rogue' || className === 'Bard') {
            profs.push('Simple Weapons', 'Hand Crossbow', 'Longsword', 'Rapier', 'Shortsword');
          } else if (className === 'Monk') {
            profs.push('Simple Weapons', 'Shortsword');
          } else if (['Sorcerer', 'Wizard'].includes(className)) {
            profs.push('Dagger', 'Dart', 'Sling', 'Quarterstaff', 'Light Crossbow');
          }
          return profs;
        })(),
        armorProficiencies: (() => {
          const profs: string[] = [];
          const className = updatedCharacter.class.name;
          if (['Fighter', 'Paladin'].includes(className)) profs.push('All Armor', 'Shields');
          else if (['Ranger', 'Cleric', 'Barbarian', 'Druid'].includes(className)) profs.push('Light Armor', 'Medium Armor', 'Shields');
          else if (['Rogue', 'Warlock', 'Bard'].includes(className)) profs.push('Light Armor');
          return profs;
        })(),
        senses: (() => {
          const senses: string[] = [];
          const raceTraits = updatedCharacter.race?.traits || [];
          if (raceTraits.includes('Darkvision')) senses.push('Darkvision (60 ft)');
          return senses;
        })(),
        draconicAncestry: updatedCharacter.draconicAncestry, // Preserve passed value
        skills: (() => {
          const skills = createDefaultSkills();
          // Apply race skills
          // Apply race skills
          const raceSkills: string[] = [];
          const traits = updatedCharacter.race?.traits || [];

          if (traits.includes('Keen Senses')) raceSkills.push('Perception');
          if (traits.includes('Menacing')) raceSkills.push('Intimidation');

          // Legacy/Generic support
          traits.forEach(t => {
            if (t.includes('Proficiency:')) {
              raceSkills.push(t.split(':')[1]?.trim());
            }
          });
          // Apply background skills
          const backgroundSkills = Array.isArray(updatedCharacter.background.skillProficiencies) ? updatedCharacter.background.skillProficiencies : [];

          const bonusSkills = updatedCharacter.bonusSkills || [];

          [...raceSkills, ...backgroundSkills, ...bonusSkills].filter(Boolean).forEach(skillName => {
            const normalized = skillName.toLowerCase().replace(/ /g, '-') as SkillName;
            if (skills[normalized]) {
              skills[normalized].proficient = true;
            }
          });

          (updatedCharacter.expertiseSkills || []).forEach(skillName => {
            const normalized = skillName.toLowerCase().replace(/ /g, '-') as SkillName;
            if (skills[normalized]) {
              skills[normalized].proficient = true;
              skills[normalized].expertise = true;
            }
          });

          if (traits.includes('Extra Skill Proficiency')) {
            const extraSkill = (Object.keys(skills) as SkillName[]).find((skill) => !skills[skill].proficient);
            if (extraSkill) {
              skills[extraSkill].proficient = true;
            }
          }
          return skills;
        })(),
        savingThrowProficiencies: (() => {
          const profs: SavingThrowProficiencies = {
            strength: false, dexterity: false, constitution: false,
            intelligence: false, wisdom: false, charisma: false
          };
          // Get from class definition
          const classDef = characterCreationContent.classes.find(c => c.name === updatedCharacter.class.name);
          if (classDef && classDef.savingThrowProficiencies) {
            classDef.savingThrowProficiencies.forEach((ability: string) => {
              const key = ability as AbilityName;
              if (profs[key] !== undefined) {
                profs[key] = true;
              }
            });
          }
          return profs;
        })(),
        talents: updatedCharacter.talents || [],
        spellSlots: calculateSpellSlots(updatedCharacter),
        knownSpells: (() => {
          const classSpells = spellsContent
            .filter(spell =>
              spell.level <= 1 &&
              spell.classes.includes(updatedCharacter.class.name)
            )
            .map(spell => spell.id);

          // Racial Spells
          const racialSpells: string[] = [];
          const traits = updatedCharacter.race?.traits || [];

          if (traits.includes('Infernal Legacy')) racialSpells.push('thaumaturgy');
          // Add other racial spells here if needed (e.g., Drow Magic)

          return [...new Set([...classSpells, ...racialSpells])];
        })(),
        preparedSpells: (() => {
          const known = spellsContent
            .filter(spell =>
              spell.level <= 1 &&
              spell.classes.includes(updatedCharacter.class.name)
            )
            .map(spell => spell.id);
          const nonCantripKnown = spellsContent
            .filter(spell =>
              spell.level > 0 &&
              spell.level <= 1 &&
              spell.classes.includes(updatedCharacter.class.name)
            )
            .map(spell => spell.id);
          const maxPrepared = getMaxPreparedSpells(updatedCharacter as PlayerCharacter);
          if (maxPrepared <= 0) return known;
          // Cantrips stay in knownSpells; only non-cantrips count toward prepared limit
          const preparedNonCantrips = nonCantripKnown.slice(0, maxPrepared);
          return [...preparedNonCantrips];
        })(),
        featureUses: getDefaultFeatureUses(updatedCharacter as PlayerCharacter),
      };
    });
    // Don't reset characterCreationStep here - let the Game component handle the flow
    setIsInAdventure(false);
  }, []);

  const startAdventure = useCallback((adventureData: Adventure) => {
    const startingIndex = adventureData.currentEncounterIndex ?? 0;
    const startingEncounter = adventureData.encounters[startingIndex];
    const initialVisited = addVisitedEncounter(
      adventureData.visitedEncounterIds,
      startingEncounter?.id
    );

    setAdventure({
      ...adventureData,
      visitedEncounterIds: initialVisited,
    });
    setIsInAdventure(true);
  }, []);

  const completeEncounter = useCallback((encounterId: string) => {
    setAdventure((prev) => {
      if (!prev) return null;
      const updatedEncounters = prev.encounters.map((enc) =>
        enc.id === encounterId ? { ...enc, completed: true } : enc
      );
      return { ...prev, encounters: updatedEncounters };
    });
  }, []);

  const advanceToNextEncounter = useCallback((nextEncounterId?: string) => {
    setAdventure((prev) => {
      if (!prev) return null;

      // If no nextEncounterId provided or it's empty, just increment index
      if (!nextEncounterId) {
        const nextIndex = prev.currentEncounterIndex + 1;
        if (nextIndex >= prev.encounters.length) {
          // Adventure complete
          setIsInAdventure(false);
          return null;
        }
        const nextEncounter = prev.encounters[nextIndex];
        return {
          ...prev,
          currentEncounterIndex: nextIndex,
          visitedEncounterIds: addVisitedEncounter(prev.visitedEncounterIds, nextEncounter?.id),
        };
      }

      // Find the encounter by ID
      const nextIndex = prev.encounters.findIndex(enc => enc.id === nextEncounterId);
      if (nextIndex === -1) {
        console.error('Encounter not found:', nextEncounterId);
        return prev; // Stay on current encounter if not found
      }

      const nextEncounter = prev.encounters[nextIndex];
      return {
        ...prev,
        currentEncounterIndex: nextIndex,
        visitedEncounterIds: addVisitedEncounter(prev.visitedEncounterIds, nextEncounter?.id),
      };
    });
  }, []);

  const endAdventure = useCallback((outcome: 'success' | 'failure' | 'abandoned' = 'abandoned', summary?: string) => {
    if (adventure) {
      setCharacter((prevChar) => {
        if (!prevChar) return null;

        const historyEntry: AdventureHistoryEntry = {
          id: `hist-${Date.now()}`,
          adventureId: adventure.id,
          adventureTitle: adventure.title,
          completedAt: Date.now(),
          outcome,
          summary: summary || (outcome === 'success' ? 'Victory!' : 'Adventure ended.'),
          levelAtCompletion: prevChar.level
        };

        return {
          ...prevChar,
          adventureHistory: [historyEntry, ...(prevChar.adventureHistory || [])]
        };
      });
    }
    setAdventure(null);
    setIsInAdventure(false);
  }, [adventure]);

  const reset = useCallback(() => {
    // Full reset - clear everything
    setCharacter(null);
    setAdventure(null);
    setCharacterCreationStep(0);
    setIsInAdventure(false);
    setQuests([]);
    setJournal([]);
  }, []);

  const addItem = useCallback((item: Item) => {
    setCharacter((prev) => {
      if (!prev) return null;

      const isGoldLoot =
        item.type === 'treasure' &&
        (item.id?.toLowerCase().includes('gold') || item.name.toLowerCase().includes('gold'));

      if (isGoldLoot) {
        const goldAmount = item.value ?? 0;
        return {
          ...prev,
          gold: prev.gold + goldAmount,
        };
      }

      return {
        ...prev,
        inventory: [...(prev.inventory || []), item],
      };
    });
  }, []);

  const equipItem = useCallback((item: Item) => {
    setCharacter((prev) => {
      if (!prev) return null;

      if (item.type === 'weapon') {
        return { ...prev, equippedWeapon: item };
      } else if (item.type === 'armor') {
        return { ...prev, equippedArmor: item };
      }
      return prev;
    });
  }, []);

  const unequipItem = useCallback((slot: 'weapon' | 'armor') => {
    setCharacter((prev) => {
      if (!prev) return null;

      if (slot === 'weapon') {
        return { ...prev, equippedWeapon: undefined };
      } else if (slot === 'armor') {
        return { ...prev, equippedArmor: undefined };
      }
      return prev;
    });
  }, []);

  // NEW: Equipment slot functions
  const equipToSlot = useCallback((item: Item, slot: EquipmentSlot) => {
    setCharacter((prev) => {
      if (!prev) return null;

      const newEquipment: Equipment = { ...prev.equipment };
      newEquipment[slot] = item;

      // Also update legacy fields for backward compatibility
      const updates: Partial<PlayerCharacter> = { equipment: newEquipment };
      if (slot === 'mainHand') {
        updates.equippedWeapon = item;
      } else if (slot === 'armor') {
        updates.equippedArmor = item;
      } else if (slot === 'offHand' && item.type === 'shield') {
        updates.equippedShield = item;
      }

      // Check armor proficiency and apply condition if needed
      let conditions = [...(prev.conditions || [])];
      const armorItem = slot === 'armor' ? item : prev.equippedArmor;
      const shieldItem = slot === 'offHand' && item.type === 'shield' ? item : prev.equippedShield;

      // Check if character is now wearing non-proficient armor/shield
      const profs = prev.armorProficiencies || [];
      const hasAllArmor = profs.includes('All Armor');
      const hasLightArmor = profs.includes('Light Armor');
      const hasMediumArmor = profs.includes('Medium Armor');
      const hasHeavyArmor = profs.includes('Heavy Armor');
      const hasShields = profs.includes('Shields');

      let isNotProficient = false;
      if (armorItem?.armorType) {
        const armorType = armorItem.armorType;
        if (armorType === 'light' && !hasLightArmor && !hasAllArmor) isNotProficient = true;
        if (armorType === 'medium' && !hasMediumArmor && !hasAllArmor) isNotProficient = true;
        if (armorType === 'heavy' && !hasHeavyArmor && !hasAllArmor) isNotProficient = true;
      }
      if (shieldItem && !hasShields) {
        isNotProficient = true;
      }

      // Update conditions
      const hasArmorCondition = conditions.some(c => c.type === 'armor-not-proficient');
      if (isNotProficient && !hasArmorCondition) {
        conditions.push({
          type: 'armor-not-proficient',
          name: 'Armor Non-Proficiency',
          description: 'Disadvantage on STR/DEX ability checks, attack rolls, and saving throws. Cannot cast spells.',
          duration: -1,
          source: 'Equipment'
        });
      } else if (!isNotProficient && hasArmorCondition) {
        conditions = conditions.filter(c => c.type !== 'armor-not-proficient');
      }
      updates.conditions = conditions;

      return { ...prev, ...updates };
    });
  }, []);

  const unequipSlot = useCallback((slot: EquipmentSlot) => {
    setCharacter((prev) => {
      if (!prev) return null;

      const newEquipment: Equipment = { ...prev.equipment };
      delete newEquipment[slot];

      // Also update legacy fields for backward compatibility
      const updates: Partial<PlayerCharacter> = { equipment: newEquipment };
      if (slot === 'mainHand') {
        updates.equippedWeapon = undefined;
      } else if (slot === 'armor') {
        updates.equippedArmor = undefined;
      } else if (slot === 'offHand') {
        updates.equippedShield = undefined;
      }

      // Re-check armor proficiency after unequipping
      let conditions = [...(prev.conditions || [])];
      const armorItem = slot === 'armor' ? undefined : prev.equippedArmor;
      const shieldItem = slot === 'offHand' ? undefined : prev.equippedShield;

      // Check if still wearing non-proficient armor/shield
      const profs = prev.armorProficiencies || [];
      const hasAllArmor = profs.includes('All Armor');
      const hasLightArmor = profs.includes('Light Armor');
      const hasMediumArmor = profs.includes('Medium Armor');
      const hasHeavyArmor = profs.includes('Heavy Armor');
      const hasShields = profs.includes('Shields');

      let isNotProficient = false;
      if (armorItem?.armorType) {
        const armorType = armorItem.armorType;
        if (armorType === 'light' && !hasLightArmor && !hasAllArmor) isNotProficient = true;
        if (armorType === 'medium' && !hasMediumArmor && !hasAllArmor) isNotProficient = true;
        if (armorType === 'heavy' && !hasHeavyArmor && !hasAllArmor) isNotProficient = true;
      }
      if (shieldItem && !hasShields) {
        isNotProficient = true;
      }

      // Update conditions
      if (!isNotProficient) {
        conditions = conditions.filter(c => c.type !== 'armor-not-proficient');
      }
      updates.conditions = conditions;

      return { ...prev, ...updates };
    });
  }, []);

  const useItem = useCallback((item: Item) => {
    setCharacter((prev) => {
      if (!prev) return null;

      // Use potion
      if (item.type === 'potion' && item.healing) {
        const newHp = Math.min(prev.maxHitPoints, prev.hitPoints + item.healing);
        return {
          ...prev,
          hitPoints: newHp,
          inventory: (prev.inventory || []).filter(i => i.id !== item.id),
        };
      }

      if (item.type === 'scroll') {
        return {
          ...prev,
          inventory: (prev.inventory || []).filter(i => i.id !== item.id),
        };
      }

      return prev;
    });
  }, []);

  const updateCharacter = useCallback((updates: CharacterUpdater) => {
    setCharacter((prev) => {
      if (!prev) return null;
      if (typeof updates === 'function') {
        return updates(prev);
      }
      return { ...prev, ...updates };
    });
  }, []);

  const startConcentration = useCallback((spellId: string, spellName: string) => {
    setCharacter((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        concentratingOn: {
          spellId,
          spellName,
          startedAt: Date.now(),
        },
      };
    });
  }, []);

  const endConcentration = useCallback(() => {
    setCharacter((prev) => {
      if (!prev) return null;
      if (!prev.concentratingOn) return prev;
      return { ...prev, concentratingOn: undefined };
    });
  }, []);

  const prepareSpell = useCallback((spellId: string) => {
    setCharacter((prev) => {
      if (!prev) return null;
      const maxPrepared = getMaxPreparedSpells(prev);
      if (maxPrepared <= 0) return prev;
      const current = prev.preparedSpells || [];
      if (current.includes(spellId) || current.length >= maxPrepared) return prev;
      return { ...prev, preparedSpells: [...current, spellId] };
    });
  }, []);

  const unprepareSpell = useCallback((spellId: string) => {
    setCharacter((prev) => {
      if (!prev) return null;
      const current = prev.preparedSpells || [];
      return { ...prev, preparedSpells: current.filter((id) => id !== spellId) };
    });
  }, []);

  const spendSpellSlot = useCallback((level: number) => {
    let spent = false;
    setCharacter((prev) => {
      if (!prev) return null;
      const slots = prev.spellSlots?.[level];
      if (!slots || slots.current <= 0) return prev;
      spent = true;
      return {
        ...prev,
        spellSlots: {
          ...prev.spellSlots,
          [level]: {
            ...slots,
            current: slots.current - 1,
          },
        },
      };
    });
    return spent;
  }, []);

  const restoreSpellSlots = useCallback(() => {
    setCharacter((prev) => {
      if (!prev || !prev.spellSlots) return prev;
      const restored: PlayerCharacter['spellSlots'] = {};
      Object.entries(prev.spellSlots).forEach(([level, pool]) => {
        restored[Number(level)] = { ...pool, current: pool.max };
      });
      return { ...prev, spellSlots: restored };
    });
  }, []);

  const addQuest = useCallback((quest: QuestEntry) => {
    setQuests((prev) => {
      const exists = prev.find((q) => q.id === quest.id);
      if (exists) {
        return prev.map((q) => (q.id === quest.id ? { ...q, ...quest } : q));
      }
      return [...prev, quest];
    });
  }, []);

  const updateQuestStatus = useCallback((questId: string, status: QuestStatus) => {
    setQuests((prev) =>
      prev.map((quest) =>
        quest.id === questId
          ? {
            ...quest,
            status,
          }
          : quest
      )
    );
  }, []);

  const updateQuestObjective = useCallback((questId: string, objectiveId: string, completed: boolean) => {
    setQuests((prev) =>
      prev.map((quest) => {
        if (quest.id !== questId) return quest;
        const updatedObjectives = quest.objectives.map((objective) =>
          objective.id === objectiveId ? { ...objective, completed } : objective
        );
        return { ...quest, objectives: updatedObjectives };
      })
    );
  }, []);

  const addJournalEntry = useCallback((message: string, title?: string) => {
    setJournal((prev) => {
      const entry: JournalEntry = {
        id: `journal - ${Date.now()} -${Math.random().toString(36).slice(2, 8)} `,
        title,
        message,
        timestamp: Date.now(),
      };
      const next = [entry, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  const gainXp = useCallback((amount: number) => {
    setCharacter((prev) => {
      if (!prev) return null;
      const newXp = prev.xp + amount;
      // Use maxXp as the current threshold for leveling up (progress bar + logic)
      const xpForNextLevel = prev.maxXp;

      if (newXp >= xpForNextLevel) {
        // Level Up!
        const newLevel = prev.level + 1;
        addJournalEntry(`Congratulations! You reached Level ${newLevel} !`, 'Level Up');

        // Draconic Bloodline Sorcerer: +1 HP per level
        const draconicBonus = prev.class.id === 'sorcerer' && prev.sorcerousOrigin === 'Draconic Bloodline' ? 1 : 0;

        // Calculate new spell slots
        const newSpellSlots = calculateSpellSlots({ ...prev, level: newLevel });
        const hasNewSlots = Object.keys(newSpellSlots).length > 0;
        const slotsToUpdate = hasNewSlots ? newSpellSlots : prev.spellSlots;

        // Unlock new class features
        const className = prev.class.name.toLowerCase();
        const progression = CLASS_PROGRESSION[className];
        const newFeatures: string[] = [];

        if (progression) {
          // Get features for the new level
          const featuresForLevel = progression[newLevel] || [];
          featuresForLevel.forEach(feat => {
            addJournalEntry(`You gained a new feature: ${feat}`, 'Level Up Feature');
            newFeatures.push(feat);
          });
        }

        // Merge with existing features (assumes features are strings in class definition)
        const currentFeatures = prev.class.features || [];
        const uniqueFeatures = [...new Set([...currentFeatures, ...newFeatures])];
        const toughBonus = prev.feats?.includes('tough') ? 2 : 0;

        const leveledCharacter = {
          ...prev,
          // Carry over surplus XP beyond the threshold and raise the next requirement
          xp: newXp - xpForNextLevel,
          maxXp: prev.maxXp + 1000, // Increase requirement
          level: newLevel,
          maxHitPoints: prev.maxHitPoints + 10 + draconicBonus + toughBonus, // Simple HP boost + Draconic bonus + Tough
          hitPoints: prev.maxHitPoints + 10 + draconicBonus + toughBonus, // Heal on level up
          spellSlots: slotsToUpdate,
          class: {
            ...prev.class,
            features: uniqueFeatures
          }
        };

        return {
          ...leveledCharacter,
          proficiencyBonus: getProficiencyBonus(newLevel),
          featureUses: getDefaultFeatureUses(leveledCharacter)
        };
      }

      return {
        ...prev,
        xp: newXp
      };
    });
  }, [addJournalEntry]);

  const deleteHistoryEntry = useCallback((entryId: string) => {
    setCharacter((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        adventureHistory: (prev.adventureHistory || []).filter(entry => entry.id !== entryId)
      };
    });
  }, []);

  const addCondition = useCallback((condition: Condition) => {
    setCharacter((prev) => {
      if (!prev) return null;
      // Check if already has condition
      const existing = prev.conditions.find(c => c.type === condition.type);
      if (existing) {
        // Update existing
        return {
          ...prev,
          conditions: prev.conditions.map(c => c.type === condition.type ? condition : c)
        };
      }
      return {
        ...prev,
        conditions: [...prev.conditions, condition]
      };
    });
  }, []);

  const removeCondition = useCallback((conditionType: ConditionType) => {
    setCharacter((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        conditions: prev.conditions.filter(c => c.type !== conditionType)
      };
    });
  }, []);

  const recordDeathSave = useCallback((success: boolean) => {
    setCharacter((prev) => {
      if (!prev) return null;
      const current = prev.deathSaves;
      if (success) {
        return {
          ...prev,
          deathSaves: { ...current, successes: Math.min(3, current.successes + 1) }
        };
      } else {
        return {
          ...prev,
          deathSaves: { ...current, failures: Math.min(3, current.failures + 1) }
        };
      }
    });
  }, []);

  const resetDeathSaves = useCallback(() => {
    setCharacter((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        deathSaves: { successes: 0, failures: 0 }
      };
    });
  }, []);

  const addTemporaryHitPoints = useCallback((amount: number) => {
    setCharacter((prev) => {
      if (!prev) return null;
      // Temp HP doesn't stack, take higher value
      return {
        ...prev,
        temporaryHitPoints: Math.max(prev.temporaryHitPoints, amount)
      };
    });
  }, []);

  // Attunement functions
  const MAX_ATTUNED_ITEMS = 3;

  const attuneItem = useCallback((item: Item): boolean => {
    let success = false;
    setCharacter((prev) => {
      if (!prev) return null;
      const currentAttuned = prev.attunedItems || [];

      // Check if already attuned
      if (currentAttuned.some(i => i.id === item.id)) {
        return prev;
      }

      // Check if at max
      if (currentAttuned.length >= MAX_ATTUNED_ITEMS) {
        return prev;
      }

      success = true;
      return {
        ...prev,
        attunedItems: [...currentAttuned, item]
      };
    });
    return success;
  }, []);

  const unattuneItem = useCallback((item: Item) => {
    setCharacter((prev) => {
      if (!prev) return null;
      const currentAttuned = prev.attunedItems || [];
      return {
        ...prev,
        attunedItems: currentAttuned.filter(i => i.id !== item.id)
      };
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        character,
        adventure,
        characterCreationStep,
        isInAdventure,
        quests,
        journal,
        tutorialsEnabled,
        startCharacterCreation,
        updateCharacterCreation,
        completeCharacterCreation,
        setCharacterCreationStep,
        startAdventure,
        completeEncounter,
        advanceToNextEncounter,
        endAdventure,
        reset,
        addItem,
        equipItem,
        unequipItem,
        useItem,
        updateCharacter,
        startConcentration,
        endConcentration,
        prepareSpell,
        unprepareSpell,
        spendSpellSlot,
        restoreSpellSlots,
        addQuest,
        updateQuestStatus,
        updateQuestObjective,
        addJournalEntry,
        loadFromSave,
        gainXp,
        setTutorialsEnabled,
        deleteHistoryEntry,
        addCondition,
        removeCondition,
        recordDeathSave,
        resetDeathSaves,
        addTemporaryHitPoints,
        attuneItem,
        unattuneItem,
        equipToSlot,
        unequipSlot,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
