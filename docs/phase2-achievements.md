# Phase 2.1: Achievement System 🏆

**Priority:** 🟠 High  
**Complexity:** ⭐⭐ Moderate  
**Estimated Time:** 4-5 days  

---

## 📋 Overview

Implement a comprehensive achievement tracking system that rewards players for combat prowess, exploration, story completion, and character progression. Achievements increase replayability and provide long-term goals.

---

## 🎯 Goals

1. Track player accomplishments across all adventures
2. Award achievements for combat, exploration, story, and meta activities
3. Provide visual notifications when achievements are unlocked
4. Display achievement progress and completion
5. Grant rewards for achievements (gold, items, portraits, titles)
6. Create achievement panel in Camp

---

## 🗂️ Data Model

### Achievement Type

```typescript
// src/types/index.ts

export type AchievementCategory = 
  | 'combat' | 'exploration' | 'story' | 'character' | 'meta';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  
  // Progress tracking
  requirement: number;
  current: number;
  
  // Rewards
  rewards?: {
    gold?: number;
    xp?: number;
    item?: string;
    portrait?: string;
    title?: string;
  };
  
  // Metadata
  hidden?: boolean;
  unlocked: boolean;
  unlockedAt?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// Add to PlayerCharacter
export interface PlayerCharacter {
  // ... existing ...
  achievements?: Achievement[];
  title?: string;
}
```

---

## 🏅 Achievement Definitions

### Combat Achievements (15)

```typescript
const combatAchievements: Achievement[] = [
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Defeat your first enemy',
    category: 'combat',
    requirement: 1,
    rarity: 'common',
    rewards: { gold: 10 }
  },
  {
    id: 'flawless-victory',
    name: 'Flawless Victory',
    description: 'Win a combat without taking damage',
    category: 'combat',
    requirement: 1,
    rarity: 'uncommon',
    rewards: { gold: 50 }
  },
  {
    id: 'critical-master',
    name: 'Critical Master',
    description: 'Land 10 critical hits',
    category: 'combat',
    requirement: 10,
    rarity: 'rare',
    rewards: { gold: 100, title: 'the Precise' }
  },
  {
    id: 'spell-slinger',
    name: 'Spell Slinger',
    description: 'Cast 50 spells in combat',
    category: 'combat',
    requirement: 50,
    rarity: 'rare',
    rewards: { gold: 100, title: 'the Arcane' }
  },
  {
    id: 'giant-slayer',
    name: 'Giant Slayer',
    description: 'Defeat an enemy 5+ levels higher than you',
    category: 'combat',
    requirement: 1,
    rarity: 'epic',
    rewards: { gold: 200, title: 'the Fearless' }
  }
];
```

### Exploration Achievements (10)

```typescript
const explorationAchievements: Achievement[] = [
  {
    id: 'curious-mind',
    name: 'Curious Mind',
    description: 'Complete 5 skill checks',
    category: 'exploration',
    requirement: 5,
    rarity: 'common'
  },
  {
    id: 'master-investigator',
    name: 'Master Investigator',
    description: 'Succeed on 10 Investigation checks',
    category: 'exploration',
    requirement: 10,
    rarity: 'uncommon',
    rewards: { title: 'the Detective' }
  },
  {
    id: 'silver-tongue',
    name: 'Silver Tongue',
    description: 'Succeed on 10 Persuasion checks',
    category: 'exploration',
    requirement: 10,
    rarity: 'uncommon',
    rewards: { title: 'the Diplomat' }
  },
  {
    id: 'shadow-walker',
    name: 'Shadow Walker',
    description: 'Succeed on 10 Stealth checks',
    category: 'exploration',
    requirement: 10,
    rarity: 'uncommon',
    rewards: { title: 'the Silent' }
  }
];
```

### Story Achievements (8)

```typescript
const storyAchievements: Achievement[] = [
  {
    id: 'tutorial-complete',
    name: 'First Steps',
    description: 'Complete the tutorial adventure',
    category: 'story',
    requirement: 1,
    rarity: 'common',
    rewards: { xp: 100 }
  },
  {
    id: 'spire-infiltrator',
    name: 'Spire Infiltrator',
    description: 'Complete Shadows of the Azure Spire',
    category: 'story',
    requirement: 1,
    rarity: 'uncommon',
    rewards: { gold: 100, xp: 200 }
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Complete all available adventures',
    category: 'story',
    requirement: 1,
    rarity: 'legendary',
    rewards: { gold: 500, title: 'the Legendary Hero' }
  },
  {
    id: 'pacifist',
    name: 'Pacifist',
    description: 'Complete an adventure without combat',
    category: 'story',
    requirement: 1,
    rarity: 'epic',
    rewards: { gold: 200, title: 'the Peaceful' }
  }
];
```

### Character Achievements (10)

```typescript
const characterAchievements: Achievement[] = [
  {
    id: 'level-5-hero',
    name: 'Seasoned Adventurer',
    description: 'Reach level 5',
    category: 'character',
    requirement: 5,
    rarity: 'common',
    rewards: { gold: 50 }
  },
  {
    id: 'level-10-champion',
    name: 'Champion',
    description: 'Reach level 10',
    category: 'character',
    requirement: 10,
    rarity: 'rare',
    rewards: { gold: 200, title: 'the Champion' }
  },
  {
    id: 'wealthy',
    name: 'Wealthy',
    description: 'Accumulate 1000 gold',
    category: 'character',
    requirement: 1000,
    rarity: 'uncommon',
    rewards: { title: 'the Wealthy' }
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Own 50 items',
    category: 'character',
    requirement: 50,
    rarity: 'uncommon'
  }
];
```

### Meta Achievements (7)

```typescript
const metaAchievements: Achievement[] = [
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Complete all quizzes with 100%',
    category: 'meta',
    requirement: 1,
    rarity: 'epic',
    rewards: { title: 'the Scholar' }
  },
  {
    id: 'polymath',
    name: 'Polymath',
    description: 'Create a character of each class',
    category: 'meta',
    requirement: 5,
    rarity: 'rare',
    rewards: { gold: 100 }
  },
  {
    id: 'diverse',
    name: 'Diverse',
    description: 'Create a character of each race',
    category: 'meta',
    requirement: 5,
    rarity: 'rare',
    rewards: { gold: 100 }
  }
];
```

---

## 🔧 Implementation Steps

### Step 1: Create Achievement Definitions (2 hours)

**File:** `src/data/achievements.ts`

Export all achievement definitions organized by category.

### Step 2: Add Achievement Tracking to GameContext (3 hours)

**File:** `src/contexts/GameContext.tsx`

```typescript
interface GameContextType {
  // ... existing ...
  checkAchievements: () => void;
  unlockAchievement: (achievementId: string) => void;
  updateAchievementProgress: (achievementId: string, increment: number) => void;
}
```

### Step 3: Create Achievement Notification Component (3 hours)

**File:** `src/components/AchievementNotification.tsx`

Toast-style notification that appears when achievement unlocked.

### Step 4: Create Achievements Panel (4 hours)

**File:** `src/components/AchievementsPanel.tsx`

Display all achievements with progress bars, filters by category, search.

### Step 5: Integrate Achievement Checks (4 hours)

Add achievement checking throughout the app:
- Combat victories
- Skill checks
- Adventure completion
- Level ups
- Item acquisition

### Step 6: Add Reward Distribution (2 hours)

When achievement unlocked, grant rewards (gold, XP, items, titles).

### Step 7: Add to Camp UI (1 hour)

Add "Achievements" tab to Camp component.

---

## 🎨 UI Components

### Achievement Card

```
┌────────────────────────────────┐
│ 🏆 Critical Master        RARE │
│                                │
│ Land 10 critical hits          │
│                                │
│ Progress: ████████░░ 8/10      │
│                                │
│ Rewards: 100 gold, Title       │
└────────────────────────────────┘
```

### Achievement Notification

```
┌────────────────────────────────┐
│ 🎉 Achievement Unlocked!       │
│                                │
│ 🏆 First Blood                 │
│ Defeat your first enemy        │
│                                │
│ +10 gold                       │
└────────────────────────────────┘
```

---

## ✅ Testing Checklist

- [ ] Achievements initialize correctly
- [ ] Progress tracks accurately
- [ ] Notifications appear on unlock
- [ ] Rewards granted properly
- [ ] Achievements persist in save
- [ ] Panel displays all achievements
- [ ] Filters work correctly
- [ ] Progress bars accurate
- [ ] Hidden achievements stay hidden
- [ ] Titles apply to character

---

## 🎨 Design Notes

- Use rarity colors (gray, green, blue, purple, orange)
- Animated unlock notification
- Sound effect on unlock (optional)
- Progress bars with smooth animations
- Category icons
- Sort by: locked/unlocked, category, rarity

---

See implementation code in component files.
