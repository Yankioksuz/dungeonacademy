# Phase 1.3: Conditions & Status Effects 🌟

**Priority:** 🔴 Critical  
**Complexity:** ⭐⭐⭐ Complex  
**Estimated Time:** 5-7 days  

---

## 📋 Overview

Implement the full D&D 5e condition system with visual indicators and automatic mechanical effects during combat and skill checks.

---

## 🎯 Core Conditions

### Tier 1 - Simple Conditions
1. **Poisoned** - Disadvantage on attack rolls and ability checks
2. **Frightened** - Disadvantage on checks, can't move closer to source
3. **Charmed** - Can't attack charmer, charmer has advantage on social checks
4. **Prone** - Disadvantage on attacks, attacks against have advantage

### Tier 2 - Moderate Conditions
5. **Grappled** - Speed becomes 0
6. **Restrained** - Speed 0, disadvantage on DEX saves, attacks against have advantage
7. **Blinded** - Can't see, auto-fail sight checks, attacks have disadvantage
8. **Deafened** - Can't hear, auto-fail hearing checks
9. **Invisible** - Attacks have advantage, can't be seen

### Tier 3 - Severe Conditions
10. **Incapacitated** - Can't take actions or reactions
11. **Stunned** - Incapacitated, auto-fail STR/DEX saves
12. **Paralyzed** - Incapacitated, auto-fail STR/DEX saves, attacks have advantage
13. **Unconscious** - Incapacitated, prone, auto-fail STR/DEX saves, critical hits
14. **Petrified** - Incapacitated, resistant to all damage

---

## 🗂️ Data Model

### Condition Type

```typescript
// src/types/index.ts

export type ConditionType = 
  | 'poisoned' | 'frightened' | 'charmed' | 'prone'
  | 'grappled' | 'restrained' | 'blinded' | 'deafened' | 'invisible'
  | 'incapacitated' | 'stunned' | 'paralyzed' | 'unconscious' | 'petrified';

export interface Condition {
  id: string;
  type: ConditionType;
  name: string;
  description: string;
  duration: {
    type: 'rounds' | 'minutes' | 'hours' | 'until_rest' | 'permanent';
    remaining?: number;
  };
  source?: string; // What caused it
  saveType?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
  saveDC?: number;
  saveAtEndOfTurn?: boolean;
}

// Add to PlayerCharacter and CombatEnemy
export interface PlayerCharacter {
  // ... existing ...
  conditions?: Condition[];
}

export interface CombatEnemy {
  // ... existing ...
  conditions?: Condition[];
}
```

---

## 🔧 Implementation Steps

### Step 1: Create Condition Definitions (2 hours)

**File:** `src/data/conditions.ts`

Create condition database with all effects and descriptions.

### Step 2: Add Condition Logic (4 hours)

**File:** `src/utils/conditionEffects.ts`

Functions:
- `hasCondition(entity, conditionType): boolean`
- `applyCondition(entity, condition): Entity`
- `removeCondition(entity, conditionId): Entity`
- `getAttackModifier(entity): 'advantage' | 'disadvantage' | 'normal'`
- `canTakeAction(entity): boolean`
- `getACModifier(entity): number`
- `processSavingThrow(entity, saveType, dc): boolean`

### Step 3: Update Combat System (6 hours)

**File:** `src/components/CombatEncounter.tsx`

- Check conditions before actions
- Apply advantage/disadvantage from conditions
- Process end-of-turn saves
- Decrement condition durations
- Auto-fail saves when appropriate
- Apply critical hits against paralyzed/unconscious

### Step 4: Create Condition UI Components (4 hours)

**Components:**
- `ConditionBadge.tsx` - Small icon showing condition
- `ConditionTooltip.tsx` - Hover details
- `ConditionPanel.tsx` - List of active conditions
- `ApplyConditionModal.tsx` - For DM/testing

### Step 5: Add Condition Icons (2 hours)

Create or source icons for each condition type.

### Step 6: Integrate with Spells/Abilities (4 hours)

Update spells and abilities to apply conditions:
- Hold Person → Paralyzed
- Entangle → Restrained
- Poison Spray → Poisoned
- Fear → Frightened

### Step 7: Add Visual Indicators (2 hours)

- Overlay on character/enemy portraits
- Color coding (red = bad, blue = neutral, green = good)
- Animation effects

---

## ✅ Testing Checklist

### Condition Application
- [ ] Conditions apply correctly
- [ ] Multiple conditions can stack
- [ ] Conditions show in UI
- [ ] Tooltips explain effects

### Mechanical Effects
- [ ] Poisoned gives disadvantage on attacks/checks
- [ ] Paralyzed auto-fails STR/DEX saves
- [ ] Stunned prevents actions
- [ ] Prone affects attack rolls
- [ ] Restrained affects AC and saves

### Duration Tracking
- [ ] Round-based durations decrement
- [ ] End-of-turn saves work
- [ ] Conditions remove when duration expires
- [ ] "Until rest" conditions persist

### Combat Integration
- [ ] Advantage/disadvantage applied
- [ ] Auto-fail saves work
- [ ] Critical hits on paralyzed enemies
- [ ] Can't act when incapacitated

---

## 🎨 Visual Design

### Condition Colors
- **Red:** Poisoned, Frightened, Stunned
- **Purple:** Charmed, Paralyzed
- **Gray:** Petrified, Unconscious
- **Yellow:** Blinded, Deafened
- **Blue:** Invisible, Prone

### Badge Placement
- Small icons below character portrait
- Tooltip on hover
- Click to see full description

---

## 📚 D&D 5e Rules Reference

See PHB Appendix A (p. 290-292) for full condition descriptions.

---

## 🔮 Future Enhancements

1. Exhaustion levels (1-6)
2. Custom conditions
3. Condition immunities by race/class
4. Lesser restoration spell removes conditions
5. Concentration checks when damaged

---

See implementation code in component files.
