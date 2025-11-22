export const TYPES_VERSION = '1.0.0';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  category: QuizCategory;
}

export type QuizCategory = 'rules' | 'character-creation' | 'spells' | 'abilities';

export interface Quiz {
  id: string;
  title: string;
  category: QuizCategory;
  questions: QuizQuestion[];
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  percentage: number;
}

export interface DnDContent {
  rules: RuleContent[];
  characterCreation: CharacterCreationContent;
  spells: SpellContent[];
  abilities: AbilityContent[];
}

export interface RuleContent {
  id: string;
  title: string;
  description: string;
  category: string;
  details: string[];
}

export interface CharacterCreationContent {
  races: Race[];
  classes: Class[];
  backgrounds: Background[];
}

export interface Race {
  id: string;
  name: string;
  description: string;
  abilityScoreIncrease: { [key: string]: number | undefined };
  traits: string[];
}

export interface Class {
  id: string;
  name: string;
  description: string;
  hitDie: string;
  primaryAbility: string;
  savingThrows: string[];
  features: string[];
}

export interface Background {
  id: string;
  name: string;
  description: string;
  skillProficiencies: string[];
  languages?: string[];
  equipment: string[];
}

export interface SpellContent {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  classes: string[];
  damage?: string;
  healing?: string;
  damageType?: string;
  saveType?: string;
  concentration?: boolean;
  ritual?: boolean;
  upcastDescription?: string;
  cantripScaling?: {
    level5?: string;
    level11?: string;
    level17?: string;
  };
  componentTags?: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialDescription?: string;
  };
}

export interface AbilityContent {
  id: string;
  name: string;
  class: string;
  level: number;
  description: string;
  type: 'feature' | 'spell' | 'ability';
}

// Gameplay types
export interface PlayerCharacter {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'non-binary' | 'other';
  race: Race;
  class: Class;
  background: Background;
  portraitId?: string;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  hitPoints: number;
  maxHitPoints: number;
  hitDice: {
    current: number;
    max: number;
    die: string; // e.g., "d10"
  };
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  skills: string[];
  spells?: SpellContent[];
  inventory?: Item[];
  equippedWeapon?: Item;
  equippedArmor?: Item;
  talents?: string[];
  spellSlots?: {
    [level: number]: {
      current: number;
      max: number;
    };
  };
  knownSpells?: string[];
  preparedSpells?: string[];
  concentratingOn?: {
    spellId: string;
    spellName: string;
    startedAt: number;
  };
  adventureHistory?: AdventureHistoryEntry[];
}



export interface AdventureHistoryEntry {
  id: string;
  adventureId: string;
  adventureTitle: string;
  completedAt: number;
  outcome: 'success' | 'failure' | 'abandoned';
  summary?: string;
  levelAtCompletion: number;
}

export interface TalentOption {
  id: string;
  name: string;
  description: string;
  bonus: {
    type: 'skill' | 'combat' | 'social';
    value: string;
  };
  requirements?: {
    level?: number;
    classId?: string;
  };
}

export interface Item {
  id: string;
  templateId?: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'treasure';
  description: string;
  damage?: string;
  armorClass?: number;
  healing?: number;
  value?: number;
  equipped?: boolean;
  spellId?: string;
  spellLevel?: number;
}

export interface CombatEnemy {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  armorClass: number;
  attackBonus: number;
  damage: string;
  initiative: number;
  isDefeated: boolean;
  xpReward?: number;
  savingThrowBonus?: number;
}

export interface CombatState {
  isActive: boolean;
  turn: number;
  currentTurnEntity: 'player' | string; // player or enemy id
  player: {
    hp: number;
    initiative: number;
  };
  enemies: CombatEnemy[];
  combatLog: CombatLogEntry[];
}

export type CombatLogEntryType =
  | 'attack' | 'damage' | 'heal' | 'miss' | 'defeat' | 'info' | 'xp' | 'levelup'
  | 'spell' | 'condition' | 'initiative';

export interface CombatLogEntry {
  id: string;
  message: string;
  type: CombatLogEntryType;
  timestamp: number;
  details?: string;
  source?: string;
  target?: string;
}

export interface Encounter {
  id: string;
  title: string;
  description: string;
  type: 'combat' | 'skill' | 'social' | 'exploration' | 'tutorial';
  autoStartCombat?: boolean;
  playerAdvantage?: boolean;
  repeatable?: boolean;
  tutorial?: {
    title: string;
    content: string;
    concept: string;
  };
  options: EncounterOption[];
  enemy?: {
    name: string;
    armorClass: number;
    hitPoints: number;
    attackBonus: number;
    damage: string;
    xpReward?: number;
  };
  skillCheck?: {
    skill: string;
    difficultyClass: number;
    ability: string;
    success: string;
    failure: string;
    rewardItemIds?: string[];
    xpReward?: number;
  };
  completed: boolean;
  xpReward?: number;
}

export interface EncounterOption {
  id: string;
  text: string;
  repeatText?: string;
  type: 'attack' | 'skill' | 'spell' | 'action' | 'continue';
  skill?: string;
  ability?: string;
  difficultyClass?: number;
  spell?: string;
  outcome: string;
  nextEncounterId?: string;
  requiresRace?: string;
  requiresClass?: string;
  requiresBackground?: string;
  successNextEncounterId?: string;
  failureNextEncounterId?: string;
  successOutcome?: string;
  failureOutcome?: string;
  stayInEncounter?: boolean;
  firstTimeEncounterId?: string;
  grantsItemIds?: string[];
  requiresVisitedEncounterId?: string;
  isExitOption?: boolean;
  xpReward?: number;
  endsAdventure?: boolean;
}

export interface Adventure {
  id: string;
  title: string;
  description: string;
  encounters: Encounter[];
  currentEncounterIndex: number;
  visitedEncounterIds?: string[];
}

export type QuestStatus = 'available' | 'active' | 'completed';

export interface QuestObjective {
  id: string;
  text: string;
  completed: boolean;
}

export type QuestCategory = 'main' | 'side';

export interface QuestEntry {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  category: QuestCategory;
  objectives: QuestObjective[];
  rewards?: string[];
}

export interface JournalEntry {
  id: string;
  title?: string;
  message: string;
  timestamp: number;
}
