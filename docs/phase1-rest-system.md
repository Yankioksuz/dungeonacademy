# Phase 1.1: Rest System Implementation 🏕️

**Priority:** 🔴 Critical  
**Complexity:** ⭐⭐ Moderate  
**Estimated Time:** 3-4 days  

---

## 📋 Overview

Implement D&D 5e short rest and long rest mechanics to manage character resources (HP, spell slots, hit dice) throughout adventures.

---

## 🎯 Goals

1. Allow players to take short rests to spend hit dice and recover HP
2. Allow players to take long rests to fully restore resources
3. Implement rest restrictions (time-based, combat restrictions)
4. Add UI for rest selection and hit dice spending
5. Track in-game time for rest limitations

---

## 🗂️ Data Model Changes

### PlayerCharacter Type Updates

```typescript
// Add to src/types/index.ts

export interface PlayerCharacter {
  // ... existing properties ...
  
  hitDice: {
    current: number;
    max: number;
    size: number;
  };
  
  lastLongRest?: number;
  inGameTime?: number;
  temporaryHitPoints?: number;
}
```

---

## 🔧 Implementation Steps

### Step 1: Update Type Definitions (30 min)
- Add `hitDice`, `lastLongRest`, `inGameTime` to PlayerCharacter type

### Step 2: Update GameContext (2 hours)
- Add `takeShortRest(hitDiceToSpend: number)` function
- Add `takeLongRest()` function
- Add `canTakeLongRest()` function
- Add `advanceTime(minutes: number)` function

### Step 3: Initialize Hit Dice in Character Creation (30 min)
- Set initial hit dice based on class and level
- Initialize time tracking

### Step 4: Create RestModal Component (4 hours)
- Tab interface for Short/Long rest
- Hit dice spending UI
- Show expected recovery
- Validation and restrictions

### Step 5: Add Rest Button to Camp (1 hour)
- Add rest button to Camp component
- Wire up modal

### Step 6: Add Rest Option to Adventure (1 hour)
- Add rest option during safe encounters

### Step 7: Update Level Up Logic (30 min)
- Increase max hit dice on level up

### Step 8: Update Save System (30 min)
- Ensure rest data persists

---

## ✅ Testing Checklist

### Short Rest
- [ ] Can spend hit dice when available
- [ ] HP recovery calculation correct
- [ ] Cannot rest during combat
- [ ] Warlock spell slots restore

### Long Rest
- [ ] All HP restored
- [ ] All spell slots restored
- [ ] Hit dice restored (half max)
- [ ] Cannot rest twice in 24 hours

---

## 📚 D&D 5e Rules Reference

**Short Rest:** 1 hour, spend hit dice to recover HP  
**Long Rest:** 8 hours, restore all HP/spell slots, regain half hit dice  
**Hit Dice:** Equal to level, size by class, roll + CON mod for healing

---

See full implementation code in project files.
