import { useCallback } from 'react';
import type { PlayerCharacter, Adventure, QuestEntry, JournalEntry } from '@/types';

interface SaveData {
  character: PlayerCharacter | null;
  adventure: Adventure | null;
  characterCreationStep: number;
  isInAdventure: boolean;
  quests: QuestEntry[];
  journal: JournalEntry[];
  timestamp: number;
  version: string;
}

const SAVE_KEY = 'dnd-teacher-save';
const AUTOSAVE_KEY = 'dnd-teacher-autosave';
const SAVE_VERSION = '1.0.0';

export function useSaveSystem() {
  const saveGame = useCallback((
    character: PlayerCharacter | null,
    adventure: Adventure | null,
    characterCreationStep: number,
    isInAdventure: boolean,
    quests: QuestEntry[],
    journal: JournalEntry[],
    isAutoSave: boolean = false
  ) => {
    const saveData: SaveData = {
      character,
      adventure,
      characterCreationStep,
      isInAdventure,
      quests,
      journal,
      timestamp: Date.now(),
      version: SAVE_VERSION,
    };

    try {
      const key = isAutoSave ? AUTOSAVE_KEY : SAVE_KEY;
      localStorage.setItem(key, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }, []);

  const loadGame = useCallback((isAutoSave: boolean = false): SaveData | null => {
    try {
      const key = isAutoSave ? AUTOSAVE_KEY : SAVE_KEY;
      const saved = localStorage.getItem(key);
      if (!saved) return null;

      const saveData: SaveData = JSON.parse(saved);

      // Version check - in future we can handle migration here
      if (saveData.version !== SAVE_VERSION) {
        console.warn('Save version mismatch, might need migration');
      }

      return saveData;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }, []);

  const deleteSave = useCallback((isAutoSave: boolean = false) => {
    try {
      const key = isAutoSave ? AUTOSAVE_KEY : SAVE_KEY;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }, []);

  const hasSave = useCallback((isAutoSave: boolean = false): boolean => {
    try {
      const key = isAutoSave ? AUTOSAVE_KEY : SAVE_KEY;
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }, []);

  const getSaveInfo = useCallback((isAutoSave: boolean = false) => {
    const saveData = loadGame(isAutoSave);
    if (!saveData) return null;

    return {
      characterName: saveData.character?.name || 'Unknown',
      characterLevel: saveData.character?.level || 1,
      characterClass: saveData.character?.class?.name || 'Unknown',
      characterRace: saveData.character?.race?.name || 'Unknown',
      isInAdventure: saveData.isInAdventure,
      adventureTitle: saveData.adventure?.title || null,
      timestamp: new Date(saveData.timestamp),
    };
  }, [loadGame]);

  return {
    saveGame,
    loadGame,
    deleteSave,
    hasSave,
    getSaveInfo,
  };
}
