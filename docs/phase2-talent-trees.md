# Phase 2.2: Talent Trees 🌳

**Priority:** 🟠 High  
**Complexity:** ⭐⭐⭐ Complex  
**Estimated Time:** 6-8 days  

---

## 📋 Overview

Expand the existing talent system with visual talent trees, prerequisites, branching paths, and class-specific specializations. This provides meaningful character progression and build diversity.

---

## 🎯 Goals

1. Create visual talent tree interface
2. Implement talent prerequisites and dependencies
3. Design class-specific and universal talent trees
4. Add talent point system (gain points on level up)
5. Implement respec functionality
6. Show talent effects on character stats

---

## 🗂️ Data Model

### Talent Type

```typescript
// src/types/index.ts

export type TalentCategory = 
  | 'combat' | 'magic' | 'skills' | 'defense' | 'utility';

export interface Talent {
  id: string;
  name: string;
  description: string;
  category: TalentCategory;
  tier: 1 | 2 | 3 | 4 | 5;
  
  // Prerequisites
  requiredLevel?: number;
  requiredClass?: string[];
  requiredTalents?: string[];
  requiredAbilityScore?: {
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
    minimum: number;
  };
  
  // Effects
  effects: TalentEffect[];
  
  // Visual position in tree
  position: { x: number; y: number };
  connectedTo?: string[];
}

export interface TalentEffect {
  type: 'stat_bonus' | 'damage_bonus' | 'skill_bonus' | 'special_ability' | 'passive';
  value?: number;
  target?: string;
  description: string;
}

// Add to PlayerCharacter
export interface PlayerCharacter {
  // ... existing ...
  talents: string[];
  talentPoints: number;
}
```

---

## 🌳 Talent Tree Designs

### Universal Talents (Available to All)

**Tier 1:**
- **Tough** - +2 HP per level
- **Alert** - +5 initiative, can't be surprised
- **Lucky** - Reroll 1 die per long rest

**Tier 2:**
- **Resilient** - +1 to chosen ability score, proficiency in that save
- **Skilled** - Gain proficiency in 3 skills
- **Mobile** - +10 movement speed

**Tier 3:**
- **Inspiring Leader** - Grant temp HP to party before combat
- **Observant** - +5 passive Perception and Investigation
- **Athlete** - Improved climbing, jumping, standing from prone

---

### Fighter Talent Tree

**Tier 1:**
- **Weapon Specialization** - +1 damage with chosen weapon type
- **Shield Master** - +1 AC with shield, bonus shove action
- **Dueling** - +2 damage when wielding one-handed weapon

**Tier 2:**
- **Great Weapon Master** - Take -5 to hit for +10 damage
- **Improved Critical** - Critical hit on 19-20
- **Defensive Fighting** - +1 AC while wearing armor

**Tier 3:**
- **Extra Attack** - Attack twice when taking Attack action
- **Action Surge** - Take additional action once per short rest
- **Indomitable** - Reroll failed save once per long rest

**Tier 4:**
- **Champion** - Critical on 18-20
- **Battle Master** - Learn combat maneuvers
- **Eldritch Knight** - Learn basic spells

---

### Wizard Talent Tree

**Tier 1:**
- **Spell Focus** - +1 spell save DC
- **Arcane Recovery** - Recover spell slots on short rest
- **Ritual Caster** - Cast ritual spells without slots

**Tier 2:**
- **Empowered Evocation** - Add INT to evocation spell damage
- **Sculpt Spells** - Allies auto-succeed saves vs your spells
- **Potent Cantrip** - Cantrips deal half damage on save

**Tier 3:**
- **War Caster** - Advantage on concentration, cast spells as reactions
- **Spell Sniper** - Double spell range, ignore half cover
- **Elemental Adept** - Ignore resistance to chosen element

**Tier 4:**
- **Archmage** - +2 spell slots of each level
- **Master of Evocation** - Maximize evocation spell damage
- **Spell Mastery** - Cast one spell at will

---

### Rogue Talent Tree

**Tier 1:**
- **Sneak Attack +1d6** - Additional sneak attack damage
- **Cunning Action** - Bonus action Dash, Disengage, Hide
- **Expertise** - Double proficiency on 2 skills

**Tier 2:**
- **Evasion** - Take no damage on successful DEX save
- **Uncanny Dodge** - Halve damage from one attack
- **Fast Hands** - Use items as bonus action

**Tier 3:**
- **Assassinate** - Advantage vs creatures that haven't acted, auto-crit on surprised
- **Reliable Talent** - Minimum 10 on skill checks with proficiency
- **Elusive** - No attack has advantage against you

**Tier 4:**
- **Stroke of Luck** - Turn miss into hit once per short rest
- **Master Thief** - Can't be tracked, advantage on stealth
- **Sneak Attack +3d6** - Massive sneak attack damage

---

### Cleric Talent Tree

**Tier 1:**
- **Divine Strike** - +1d8 radiant damage on weapon attacks
- **Channel Divinity** - Turn undead or other divine effects
- **Blessed Healer** - Heal self when healing others

**Tier 2:**
- **Preserve Life** - Heal multiple allies with Channel Divinity
- **Radiance of Dawn** - AoE radiant damage
- **Warding Flare** - Impose disadvantage on attack against you

**Tier 3:**
- **Divine Intervention** - Call upon deity for aid
- **Improved Healing** - Maximize healing spell dice
- **Spiritual Weapon** - Summon floating weapon

**Tier 4:**
- **Avatar of Healing** - Double all healing done
- **Holy Aura** - Party gains resistance to all damage
- **Divine Smite** - Add massive radiant damage to attacks

---

## 🔧 Implementation Steps

### Step 1: Create Talent Definitions (8 hours)

**File:** `src/data/talents.ts`

Define all talents with effects, prerequisites, and positions.

### Step 2: Create TalentTree Component (8 hours)

**File:** `src/components/TalentTree.tsx`

Visual tree with nodes, connections, tooltips, and selection.

### Step 3: Add Talent Point System (3 hours)

**File:** `src/contexts/GameContext.tsx`

- Gain talent point every level
- Track spent/available points
- Validate talent selection

### Step 4: Implement Talent Effects (6 hours)

**File:** `src/utils/talentEffects.ts`

Apply talent effects to character stats, combat, skills.

### Step 5: Create Respec System (3 hours)

Allow players to reset talents for gold cost.

### Step 6: Add Talent UI to Camp (2 hours)

Add "Talents" tab showing available points and tree access.

### Step 7: Integrate with Combat/Skills (4 hours)

Ensure talent effects apply in all relevant systems.

---

## 🎨 UI Design

### Talent Tree Layout

```
        [Tier 4]
           │
      ┌────┴────┐
   [Node]    [Node]
      │         │
   [Tier 3]  [Tier 3]
      │         │
   ┌──┴──┐   ┌─┴──┐
[T2] [T2] [T2] [T2]
   │   │   │   │
   └─┬─┴───┴─┬─┘
  [Tier 1] [Tier 1]
```

### Talent Node States
- **Locked** - Gray, prerequisites not met
- **Available** - Gold, can be selected
- **Selected** - Green, already taken
- **Path** - Blue line connecting nodes

---

## ✅ Testing Checklist

- [ ] Talent trees display correctly
- [ ] Prerequisites enforced
- [ ] Talent points track accurately
- [ ] Effects apply to character
- [ ] Respec works and costs gold
- [ ] Talents persist in save
- [ ] Mobile responsive
- [ ] Tooltips show full info
- [ ] Visual connections correct
- [ ] Class restrictions work

---

## 🎨 Design Notes

- Use tree/branch imagery
- Color code by category
- Animated selection
- Particle effects on unlock
- Preview mode (see future talents)
- Recommended builds for new players

---

See implementation code in component files.
