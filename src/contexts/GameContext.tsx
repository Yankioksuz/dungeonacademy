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
} from '@/types';
import characterCreationContent from '@/content/characterCreation.json';
import { useSaveSystem } from '@/hooks/useSaveSystem';
import tutorialAdventure from '@/content/adventure.json';
import spireAdventure from '@/content/adventure-shadows.json';
import spellsContent from '@/content/spells.json';
import { getMaxPreparedSpells } from '@/lib/spells';

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

export function GameProvider({ children }: { children: ReactNode }) {
  const { saveGame, loadGame } = useSaveSystem();
  const [character, setCharacter] = useState<PlayerCharacter | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [characterCreationStep, setCharacterCreationStep] = useState<number>(0);
  const [isInAdventure, setIsInAdventure] = useState(false);
  const [tutorialsEnabled, setTutorialsEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [quests, setQuests] = useState<QuestEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const hydrateFromSave = useCallback((savedGame: ReturnType<typeof loadGame> | null) => {
    if (!savedGame) return false;

    setCharacter(savedGame.character);
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
          hitDice: {
            current: 1,
            max: 1,
            die: 'd8'
          },
          level: 1,
          xp: 0, // Initialize xp here
          maxXp: 300, // Initialize maxXp here
          gold: 10, // Initialize gold here
          skills: [],
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
        class: characterCreationContent.classes[0],
        background: characterCreationContent.backgrounds[0],
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
        level: 1,
        xp: 0,
        maxXp: 300,
        gold: 10,
        skills: [],
        talents: [],
      };

      const updatedCharacter = { ...baseCharacter, ...finalData };

      // Calculate HP based on class hit die + CON modifier
      const conModifier = Math.floor((updatedCharacter.abilityScores.constitution - 10) / 2);
      // Parse hitDie from string format "d8" to number 8
      const hitDieString = updatedCharacter.class.hitDie || 'd8';
      const baseHP = parseInt(hitDieString.replace('d', '')) || 8;
      const calculatedMaxHP = baseHP + conModifier;

      console.log('Character HP calculation:', {
        class: updatedCharacter.class.name,
        hitDie: hitDieString,
        baseHP,
        constitution: updatedCharacter.abilityScores.constitution,
        conModifier,
        calculatedMaxHP
      });

      // Merge skills from race and background
      const raceSkills = updatedCharacter.race?.traits?.filter(t => t.includes('Proficiency')).map(t => t.split(':')[1]?.trim()) || [];
      const backgroundSkills = Array.isArray(updatedCharacter.background.skillProficiencies) ? updatedCharacter.background.skillProficiencies : [];
      const allSkills = [...raceSkills, ...backgroundSkills].filter(Boolean);

      return {
        ...updatedCharacter,
        maxHitPoints: calculatedMaxHP,
        hitPoints: calculatedMaxHP,
        hitDice: {
          current: updatedCharacter.level,
          max: updatedCharacter.level,
          die: updatedCharacter.class.hitDie || 'd8'
        },
        skills: allSkills,
        talents: updatedCharacter.talents || [],
        spellSlots: {
          1: { current: 2, max: 2 } // Default 2 level 1 slots for everyone for now
        },
        knownSpells: spellsContent
          .filter(spell =>
            spell.level <= 1 &&
            spell.classes.includes(updatedCharacter.class.name)
          )
          .map(spell => spell.id),
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
        return {
          ...prev,
          // Carry over surplus XP beyond the threshold and raise the next requirement
          xp: newXp - xpForNextLevel,
          maxXp: prev.maxXp + 1000, // Increase requirement
          level: newLevel,
          maxHitPoints: prev.maxHitPoints + 10, // Simple HP boost
          hitPoints: prev.maxHitPoints + 10, // Heal on level up
          // Add spell slots if caster?
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
