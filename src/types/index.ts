export const TYPES_VERSION = '2.0.0'; // Updated for D&D 5e mechanics

// ============================================================================
// D&D 5e Core Mechanics Types
// ============================================================================

// Skill System
export type SkillName =
  | 'acrobatics' | 'animal-handling' | 'arcana' | 'athletics'
  | 'deception' | 'history' | 'insight' | 'intimidation'
  | 'investigation' | 'medicine' | 'nature' | 'perception'
  | 'performance' | 'persuasion' | 'religion' | 'sleight-of-hand'
  | 'stealth' | 'survival';

export interface SkillProficiency {
  proficient: boolean;
  expertise: boolean; // Double proficiency bonus
}

export type Skills = Record<SkillName, SkillProficiency>;

// Ability names for type safety
export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

// Condition System
export type ConditionType =
  | 'blinded' | 'charmed' | 'deafened' | 'frightened'
  | 'grappled' | 'incapacitated' | 'invisible' | 'paralyzed'
  | 'petrified' | 'poisoned' | 'prone' | 'restrained'
  | 'stunned' | 'unconscious' | 'hexed' | 'turned';

export interface Condition {
  type: ConditionType;
  name: string;
  description: string;
  duration?: number; // rounds, -1 for indefinite
  source?: string; // spell or ability that caused it
}

// Death Saving Throws
export interface DeathSaves {
  successes: number; // 0-3
  failures: number; // 0-3
}

// Roll Modifiers
export type RollModifier = 'advantage' | 'disadvantage' | 'normal';

// Saving Throw Proficiencies
export type SavingThrowProficiencies = Record<AbilityName, boolean>;

// ============================================================================
// Quiz and Content Types
// ============================================================================


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
  savingThrows: string[]; // Will be converted to savingThrowProficiencies
  savingThrowProficiencies?: AbilityName[]; // NEW: Type-safe saving throws
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

  // NEW: Enhanced spell properties
  areaOfEffect?: {
    type: 'sphere' | 'cone' | 'cube' | 'cylinder' | 'line';
    size: number; // in feet
  };
  attackType?: 'melee' | 'ranged' | 'none';
  targets?: string; // e.g., "1 creature", "up to 3 creatures"
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
  temporaryHitPoints: number; // NEW: Temporary HP
  hitDice: {
    current: number;
    max: number;
    die: string; // e.g., "d10"
  };
  level: number;
  xp: number;
  maxXp: number;
  gold: number;

  // NEW: D&D 5e Mechanics
  proficiencyBonus: number; // Calculated from level: +2 (1-4), +3 (5-8), +4 (9-12), etc.
  skills: Skills; // UPDATED: Changed from string[] to Skills object
  savingThrowProficiencies: SavingThrowProficiencies; // NEW: Saving throw proficiencies from class
  conditions: Condition[]; // NEW: Active conditions
  deathSaves: DeathSaves; // NEW: Death saving throws (when at 0 HP)

  // NEW: Racial & Class Details
  languages: string[];
  weaponProficiencies: string[];
  armorProficiencies: string[];
  senses: string[]; // e.g. "Darkvision (60 ft)"
  draconicAncestry?: {
    type: string; // e.g. "Red", "Blue"
    damageType: string; // e.g. "Fire", "Lightning"
    breathCone: boolean; // true for cone, false for line
  };
  fightingStyle?: string; // Fighter choice
  pactBoon?: string; // Warlock Pact
  sorcerousOrigin?: string; // Sorcerer origin

  // Passive Scores (calculated)
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;

  // Existing fields
  spells?: SpellContent[];
  inventory?: Item[];
  equippedWeapon?: Item;
  equippedArmor?: Item;
  talents?: string[];
  bonusSkills?: string[]; // e.g. human extra skill
  expertiseSkills?: string[]; // e.g. rogue expertise picks
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
  featureUses?: FeatureUses;
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
  properties?: string[];
  attackBonus?: number;
}

export interface CombatEnemy {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  temporaryHp: number; // NEW: Temporary HP for enemies
  armorClass: number;
  attackBonus: number;
  damage: string;
  damageType?: string;
  creatureType?: string;
  effectType?: 'fear' | 'charm' | 'poison' | 'magic';
  saveDC?: number;
  breathDC?: number;
  breathDamage?: string;
  breathType?: string;
  traits?: string[]; // e.g., pack-tactics, nimble-escape, sunlight-sensitivity, brute, undead-fortitude
  size?: string;
  alignment?: string;
  speed?: {
    walk?: number;
    fly?: number;
    swim?: number;
    burrow?: number;
    climb?: number;
  };
  abilityScores?: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  senses?: string[];
  languages?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  damageVulnerabilities?: string[];
  conditionImmunities?: string[];
  challenge?: string;
  initiative: number;
  isDefeated: boolean;
  xpReward?: number;
  savingThrowBonus?: number;
  conditions: Condition[]; // NEW: Active conditions on enemy
  actions?: Array<{
    name: string;
    type?: 'melee' | 'ranged' | 'save' | 'special';
    toHit?: number;
    reach?: number;
    range?: string;
    targets?: string;
    damage?: string;
    damageType?: string;
    save?: { ability: string; dc: number; onSave: string; onFail: string };
    description?: string;
  }>;
  legendaryActions?: Array<{
    name: string;
    cost?: number;
    description: string;
  }>;
  statBlockSource?: string;
  statBlockHeading?: string;
}

export interface FeatureUses {
  actionSurge: boolean;
  secondWind: boolean;
  bardicInspiration: number;
  rage: number;
  channelDivinity: number;
  layOnHands: number;
  kiPoints: number;
  wildShape: number;
  sorceryPoints: number;
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
