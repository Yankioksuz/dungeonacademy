
import { useGame } from '@/contexts/GameContext';
import { CharacterCreation } from './CharacterCreation';
import { Adventure } from './Adventure';
import { Camp } from './Camp';

export function Game() {
  const { character, adventure, isInAdventure } = useGame();

  // Show character creation if no character exists or character is incomplete
  // Character is complete when maxHitPoints > 0 (set in completeCharacterCreation)
  if (!character || character.maxHitPoints === 0) {
    return <CharacterCreation />;
  }

  // Show adventure if adventure has been started
  if (adventure || isInAdventure) {
    return <Adventure />;
  }

  return <Camp />;
}
