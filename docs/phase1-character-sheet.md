# Phase 1.2: Character Sheet View 📜

**Priority:** 🔴 Critical  
**Complexity:** ⭐⭐ Moderate  
**Estimated Time:** 4-5 days  

---

## 📋 Overview

Create a comprehensive character sheet displaying all character statistics, abilities, features, and equipment in a traditional D&D character sheet format.

---

## 🎯 Goals

1. Display all character information in organized sections
2. Show calculated stats (AC, initiative, passive scores)
3. List all skills with proficiency indicators
4. Display class features and racial traits
5. Show equipment and inventory summary
6. Make it printable and mobile-friendly

---

## 🎨 UI Layout

### Main Sections

1. **Header** - Portrait, name, race, class, level, XP
2. **Ability Scores** - All six abilities with modifiers and saves
3. **Skills** - All 18 skills with proficiencies
4. **Combat Stats** - AC, initiative, speed, HP, hit dice
5. **Features & Traits** - Racial traits, class features
6. **Equipment** - Weapons, armor, inventory
7. **Spellcasting** - Spell slots, known spells (for casters)

---

## 🔧 Implementation Steps

### Step 1: Create CharacterSheet Component (6 hours)

**File:** `src/components/CharacterSheet.tsx`

**Structure:**
- Use tabs or scrollable sections
- Responsive grid layout
- Print-friendly CSS
- Tooltips for D&D terms

### Step 2: Add Stat Calculation Utilities (2 hours)

**File:** `src/utils/characterStats.ts`

Functions needed:
- `calculateAbilityModifier(score: number): number`
- `calculateArmorClass(character: PlayerCharacter): number`
- `calculateInitiative(character: PlayerCharacter): number`
- `calculatePassivePerception(character: PlayerCharacter): number`
- `calculateProficiencyBonus(level: number): number`
- `getSkillModifier(character: PlayerCharacter, skill: string): number`

### Step 3: Add to Camp Navigation (1 hour)

Add "Character Sheet" tab to Camp component or create modal accessible from navigation.

### Step 4: Style and Polish (2 hours)

- Add parchment texture background
- Fantasy-themed borders
- Proper spacing and typography
- Mobile responsive design

---

## 📊 Stat Calculations

### Proficiency Bonus
```
Level 1-4: +2
Level 5-8: +3
Level 9-12: +4
Level 13-16: +5
Level 17-20: +6
```

### Armor Class
```
Base AC = 10 + DEX modifier
With Armor = Armor base AC + DEX modifier (up to armor max)
With Shield = +2
```

### Initiative
```
Initiative = DEX modifier
```

### Passive Scores
```
Passive Perception = 10 + Perception modifier
Passive Investigation = 10 + Investigation modifier
Passive Insight = 10 + Insight modifier
```

---

## ✅ Testing Checklist

- [ ] All ability scores display correctly
- [ ] Modifiers calculated properly
- [ ] Proficiency bonus correct for level
- [ ] Skills show proficiency indicators
- [ ] AC calculation includes armor/DEX
- [ ] Saving throws show proficiencies
- [ ] Features and traits display
- [ ] Equipment shows equipped items
- [ ] Spell section for casters
- [ ] Mobile responsive
- [ ] Print layout works

---

## 🎨 Design Notes

- Use parchment/paper texture
- Gold accents for headers
- Clear visual hierarchy
- Tooltips for new players
- Icons for quick recognition
- Print button for PDF export

---

See implementation code in component files.
