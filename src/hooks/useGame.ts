import { useState, useCallback } from 'react';
import type { PlayerCharacter, Adventure } from '@/types';
import characterCreationContent from '@/content/characterCreation.json';

export function useGame() {
  const [character, setCharacter] = useState<PlayerCharacter | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [characterCreationStep, setCharacterCreationStep] = useState<number>(0);
  const [isInAdventure, setIsInAdventure] = useState(false);

  const startCharacterCreation = useCallback(() => {
    setCharacterCreationStep(0);
    setIsInAdventure(false);
  }, []);

  const updateCharacterCreation = useCallback((updates: Partial<PlayerCharacter>) => {
    setCharacter((prev) => {
      if (!prev) {
        // Initialize character with defaults
        return {
          id: 'player-1',
          name: '',
          race: characterCreationContent.races[0],
          class: characterCreationContent.classes[0],
          background: characterCreationContent.backgrounds[0],
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

      // If finalData is provided, use it; otherwise use currentCharacter
      // If both are null/undefined, return null
      if (!finalData && !currentCharacter) return null;

      // Build the character - only use finalData if provided (first time creation)
      const charToUse = finalData || currentCharacter;

      if (!charToUse || !charToUse.race || !charToUse.class || !charToUse.background) {
        return null;
      }

      // Calculate final stats
      const race = charToUse.race;
      const charClass = charToUse.class;

      // Apply race ability score increases ONLY to the base scores from finalData
      // Don't re-apply if using currentCharacter (which would already have bonuses)
      const baseScores = charToUse.abilityScores || {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      };

      const finalAbilityScores = { ...baseScores };

      if (finalData) {
        // Only apply racial bonuses on initial character creation
        Object.entries(race.abilityScoreIncrease).forEach(([ability, increase]) => {
          const key = ability.toLowerCase() as keyof typeof finalAbilityScores;
          if (increase !== undefined && finalAbilityScores[key] !== undefined) {
            finalAbilityScores[key] = (finalAbilityScores[key] || 10) + increase;
          }
        });
      }

      // Ensure all ability scores are numbers (not undefined)
      const safeAbilityScores = {
        strength: finalAbilityScores.strength || 10,
        dexterity: finalAbilityScores.dexterity || 10,
        constitution: finalAbilityScores.constitution || 10,
        intelligence: finalAbilityScores.intelligence || 10,
        wisdom: finalAbilityScores.wisdom || 10,
        charisma: finalAbilityScores.charisma || 10,
      };

      // Calculate hit points (using hit die)
      const hitDie = parseInt(charClass.hitDie.replace('d', ''));
      const conModifier = Math.floor((safeAbilityScores.constitution - 10) / 2);
      const maxHP = hitDie + conModifier;

      const finalCharacter: PlayerCharacter = {
        id: charToUse.id || 'player-1',
        name: charToUse.name || '',
        race: race,
        class: charClass,
        background: charToUse.background,
        abilityScores: safeAbilityScores,
        maxHitPoints: maxHP,
        hitPoints: maxHP,
        level: charToUse.level || 1,
        xp: charToUse.xp || 0,
        maxXp: charToUse.maxXp || 300,
        gold: charToUse.gold ?? 10,
        skills: charToUse.background.skillProficiencies || [],
      };

      return finalCharacter;
    });
    // Don't reset characterCreationStep here - let the Game component handle the flow
    setIsInAdventure(false);
  }, []);

  const startAdventure = useCallback((adventureData: Adventure) => {
    setAdventure(adventureData);
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

  const advanceToNextEncounter = useCallback(() => {
    setAdventure((prev) => {
      if (!prev) return null;
      const nextIndex = prev.currentEncounterIndex + 1;
      if (nextIndex >= prev.encounters.length) {
        return prev; // Adventure complete
      }
      return { ...prev, currentEncounterIndex: nextIndex };
    });
  }, []);

  const reset = useCallback(() => {
    setCharacter(null);
    setAdventure(null);
    setCharacterCreationStep(0);
    setIsInAdventure(false);
  }, []);

  return {
    character,
    adventure,
    characterCreationStep,
    isInAdventure,
    startCharacterCreation,
    updateCharacterCreation,
    completeCharacterCreation,
    setCharacterCreationStep,
    startAdventure,
    completeEncounter,
    advanceToNextEncounter,
    reset,
  };
}
