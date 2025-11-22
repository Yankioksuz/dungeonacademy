# Phase 2.3: Feats System 💪

**Priority:** 🟡 Medium  
**Complexity:** ⭐⭐ Moderate  
**Estimated Time:** 4-5 days  

---

## 📋 Overview

Implement D&D 5e feats as alternatives to ability score improvements at certain levels. Feats provide unique abilities and customization options for character builds.

---

## 🎯 Goals

1. Add feat selection at ASI levels (4, 8, 12, 16, 19)
2. Implement choice between feat or ability score improvement
3. Create feat database with prerequisites
4. Apply feat effects to character mechanics
5. Display feats on character sheet
6. Validate feat prerequisites

---

## 🗂️ Data Model

### Feat Type

```typescript
// src/types/index.ts

export interface Feat {
  id: string;
  name: string;
  description: string;
  source: string; // PHB, XGE, etc.
  
  // Prerequisites
  prerequisites?: {
    abilityScore?: {
      ability: string;
      minimum: number;
    };
    race?: string[];
    class?: string[];
    level?: number;
    proficiency?: string;
  };
  
  // Benefits
  benefits: {
    abilityScoreIncrease?: {
      ability: string;
      amount: number;
    }[];
    specialAbility?: string;
    proficiencies?: string[];
    other?: string[];
  };
  
  // Effects
  effects: FeatEffect[];
}

export interface FeatEffect {
  type: 'combat' | 'skill' | 'save' | 'special';
  description: string;
  mechanical?: any; // Specific implementation
}

// Add to PlayerCharacter
export interface PlayerCharacter {
  // ... existing ...
  feats: string[];
}
```

---

## 🎯 Feat Implementations

### Combat Feats

#### Great Weapon Master
```typescript
{
  id: 'great-weapon-master',
  name: 'Great Weapon Master',
  description: 'You've learned to put the weight of a weapon to your advantage.',
  benefits: {
    specialAbility: 'Before making a melee attack with a heavy weapon, you can choose to take a -5 penalty to the attack roll. If the attack hits, you add +10 to the attack's damage.'
  },
  effects: [
    {
      type: 'combat',
      description: 'Optional -5 to hit for +10 damage with heavy weapons'
    }
  ]
}
```

#### Sharpshooter
```typescript
{
  id: 'sharpshooter',
  name: 'Sharpshooter',
  description: 'You have mastered ranged weapons.',
  benefits: {
    specialAbility: 'Before making a ranged attack, you can choose to take a -5 penalty to the attack roll. If the attack hits, you add +10 to the attack's damage.'
  },
  effects: [
    {
      type: 'combat',
      description: 'Ignore half and three-quarters cover'
    },
    {
      type: 'combat',
      description: 'Optional -5 to hit for +10 damage with ranged weapons'
    }
  ]
}
```

#### Sentinel
```typescript
{
  id: 'sentinel',
  name: 'Sentinel',
  description: 'You have mastered techniques to take advantage of every drop in any enemy's guard.',
  benefits: {
    specialAbility: 'When you hit a creature with an opportunity attack, the creature's speed becomes 0 for the rest of the turn.'
  },
  effects: [
    {
      type: 'combat',
      description: 'Opportunity attacks stop enemy movement'
    }
  ]
}
```

#### Polearm Master
```typescript
{
  id: 'polearm-master',
  name: 'Polearm Master',
  description: 'You can keep your enemies at bay with reach weapons.',
  prerequisites: {
    proficiency: 'Martial Weapons'
  },
  benefits: {
    specialAbility: 'You can use a bonus action to make a melee attack with the opposite end of a polearm (1d4 damage).'
  }
}
```

---

### Magic Feats

#### War Caster
```typescript
{
  id: 'war-caster',
  name: 'War Caster',
  description: 'You have practiced casting spells in the midst of combat.',
  prerequisites: {
    proficiency: 'Spellcasting'
  },
  benefits: {
    specialAbility: 'You have advantage on Constitution saving throws to maintain concentration on spells.'
  },
  effects: [
    {
      type: 'save',
      description: 'Advantage on concentration checks'
    },
    {
      type: 'combat',
      description: 'Can perform somatic components with hands full'
    }
  ]
}
```

#### Spell Sniper
```typescript
{
  id: 'spell-sniper',
  name: 'Spell Sniper',
  description: 'You have learned techniques to enhance your attacks with certain kinds of spells.',
  prerequisites: {
    proficiency: 'Spellcasting'
  },
  benefits: {
    specialAbility: 'When you cast a spell that requires you to make an attack roll, the spell's range is doubled. Your ranged spell attacks ignore half cover and three-quarters cover.'
  },
  effects: [
    {
      type: 'combat',
      description: 'Double spell range, ignore cover'
    }
  ]
}
```

#### Elemental Adept
```typescript
{
  id: 'elemental-adept',
  name: 'Elemental Adept',
  description: 'When you gain this feat, choose one damage type: acid, cold, fire, lightning, or thunder.',
  prerequisites: {
    proficiency: 'Spellcasting'
  },
  benefits: {
    specialAbility: 'Spells you cast ignore resistance to damage of the chosen type. When you roll damage for a spell of that type, you can treat any 1 on a damage die as a 2.'
  }
}
```

---

### Utility Feats

#### Lucky
```typescript
{
  id: 'lucky',
  name: 'Lucky',
  description: 'You have inexplicable luck that seems to kick in at just the right moment.',
  benefits: {
    specialAbility: 'You have 3 luck points. Whenever you make an attack roll, ability check, or saving throw, you can spend one luck point to roll an additional d20. You regain all luck points on a long rest.'
  },
  effects: [
    {
      type: 'special',
      description: '3 luck points per long rest to reroll any d20'
    }
  ]
}
```

#### Alert
```typescript
{
  id: 'alert',
  name: 'Alert',
  description: 'Always on the lookout for danger.',
  benefits: {
    other: [
      '+5 bonus to initiative',
      'Can't be surprised while conscious',
      'Hidden creatures don't gain advantage on attacks against you'
    ]
  },
  effects: [
    {
      type: 'combat',
      description: '+5 initiative, can't be surprised'
    }
  ]
}
```

#### Mobile
```typescript
{
  id: 'mobile',
  name: 'Mobile',
  description: 'You are exceptionally speedy and agile.',
  benefits: {
    other: [
      'Your speed increases by 10 feet',
      'When you use Dash, difficult terrain doesn't cost extra movement',
      'When you make a melee attack against a creature, you don't provoke opportunity attacks from that creature'
    ]
  }
}
```

---

### Skill Feats

#### Skilled
```typescript
{
  id: 'skilled',
  name: 'Skilled',
  description: 'You have trained extensively in various skills.',
  benefits: {
    proficiencies: ['Choose 3 skills or tools']
  }
}
```

#### Observant
```typescript
{
  id: 'observant',
  name: 'Observant',
  description: 'Quick to notice details of your environment.',
  benefits: {
    abilityScoreIncrease: [
      { ability: 'intelligence', amount: 1 },
      { ability: 'wisdom', amount: 1 }
    ],
    other: [
      '+5 to passive Perception and Investigation',
      'Can read lips'
    ]
  }
}
```

#### Actor
```typescript
{
  id: 'actor',
  name: 'Actor',
  description: 'Skilled at mimicry and dramatics.',
  benefits: {
    abilityScoreIncrease: [
      { ability: 'charisma', amount: 1 }
    ],
    other: [
      'Advantage on Deception and Performance checks when trying to pass yourself off as a different person',
      'Can mimic speech of another person or sounds made by creatures'
    ]
  }
}
```

---

### Defensive Feats

#### Tough
```typescript
{
  id: 'tough',
  name: 'Tough',
  description: 'Your hit point maximum increases by an amount equal to twice your level when you gain this feat.',
  benefits: {
    specialAbility: '+2 HP per level (including past levels)'
  },
  effects: [
    {
      type: 'special',
      description: 'Increase max HP by 2 × character level'
    }
  ]
}
```

#### Resilient
```typescript
{
  id: 'resilient',
  name: 'Resilient',
  description: 'Choose one ability score. You gain proficiency in saving throws using that ability.',
  benefits: {
    abilityScoreIncrease: [
      { ability: 'chosen', amount: 1 }
    ],
    other: [
      'Gain proficiency in chosen ability's saving throws'
    ]
  }
}
```

#### Heavily Armored
```typescript
{
  id: 'heavily-armored',
  name: 'Heavily Armored',
  description: 'You have trained to master the use of heavy armor.',
  prerequisites: {
    proficiency: 'Medium Armor'
  },
  benefits: {
    abilityScoreIncrease: [
      { ability: 'strength', amount: 1 }
    ],
    proficiencies: ['Heavy Armor']
  }
}
```

---

## 🔧 Implementation Steps

### Step 1: Create Feat Database (4 hours)

**File:** `src/data/feats.ts`

Implement 20-30 core feats from PHB.

### Step 2: Create Feat Selection UI (4 hours)

**File:** `src/components/FeatSelectionModal.tsx`

Modal shown at ASI levels with choice: feat or +2 ability scores.

### Step 3: Add Feat Logic to GameContext (3 hours)

- Track selected feats
- Validate prerequisites
- Apply feat effects

### Step 4: Implement Feat Effects (6 hours)

**File:** `src/utils/featEffects.ts`

Apply feat bonuses to:
- Combat (attack rolls, damage)
- Skills (proficiencies, bonuses)
- Saves (advantage, proficiency)
- HP (Tough feat)
- Initiative (Alert feat)

### Step 5: Update Level Up Flow (2 hours)

At levels 4, 8, 12, 16, 19, show feat selection option.

### Step 6: Display Feats on Character Sheet (2 hours)

Show selected feats with descriptions.

---

## ✅ Testing Checklist

- [ ] Feat selection appears at correct levels
- [ ] Can choose between feat and ASI
- [ ] Prerequisites validated
- [ ] Feat effects apply correctly
- [ ] Great Weapon Master -5/+10 works
- [ ] Lucky points track and reset
- [ ] Alert gives +5 initiative
- [ ] Tough increases HP correctly
- [ ] Feats persist in save
- [ ] Feats display on character sheet

---

## 🎨 UI Design

### Feat Selection Modal

```
┌──────────────────────────────────────┐
│ Level 4 - Choose Improvement      [X]│
├──────────────────────────────────────┤
│                                      │
│ [Ability Score Improvement]          │
│ Increase two ability scores by 1     │
│ or one ability score by 2            │
│                                      │
│          --- OR ---                  │
│                                      │
│ [Choose a Feat]                      │
│                                      │
│ ┌──────────────────────────────────┐│
│ │ 🎯 Great Weapon Master           ││
│ │ Take -5 to hit for +10 damage    ││
│ │                                  ││
│ │ 🍀 Lucky                         ││
│ │ 3 luck points to reroll d20s     ││
│ │                                  ││
│ │ ⚡ Alert                         ││
│ │ +5 initiative, can't be surprised││
│ └──────────────────────────────────┘│
│                                      │
│ [Cancel]              [Confirm]      │
└──────────────────────────────────────┘
```

---

See implementation code in component files.
