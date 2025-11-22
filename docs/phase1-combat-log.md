# Phase 1.4: Combat Log 📋

**Priority:** 🟠 High  
**Complexity:** ⭐ Simple  
**Estimated Time:** 2-3 days  

---

## 📋 Overview

Create an enhanced scrollable combat history with color-coding, detailed roll breakdowns, and export functionality to improve combat clarity and player understanding.

---

## 🎯 Goals

1. Display all combat actions in chronological order
2. Color-code messages by type (damage, healing, spells, etc.)
3. Show expandable roll details
4. Auto-scroll to latest entries
5. Export log as text file
6. Persist log across combat sessions

---

## 🗂️ Data Model

### Combat Log Entry

```typescript
// src/types/index.ts

export type CombatLogEntryType = 
  | 'attack' | 'damage' | 'healing' | 'spell' 
  | 'condition' | 'death' | 'initiative' | 'general';

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  turn: number;
  type: CombatLogEntryType;
  message: string;
  details?: {
    roll?: number;
    modifier?: number;
    total?: number;
    target?: number;
    breakdown?: string;
  };
  actor?: string;
  target?: string;
}

// Add to Adventure or CombatEncounter state
combatLog: CombatLogEntry[];
```

---

## 🎨 UI Design

### Layout
```
┌─────────────────────────────────┐
│ Combat Log              [Export]│
├─────────────────────────────────┤
│                                 │
│ Turn 1                          │
│ • Goblin rolls initiative: 14   │
│ • Hero rolls initiative: 18     │
│                                 │
│ Turn 2 - Hero's Turn            │
│ ⚔️ Hero attacks Goblin          │
│   Roll: 15 + 5 = 20 vs AC 15   │
│   ✓ Hit! Damage: 1d8+3 = 8     │
│                                 │
│ Turn 3 - Goblin's Turn          │
│ ⚔️ Goblin attacks Hero          │
│   Roll: 8 + 4 = 12 vs AC 16    │
│   ✗ Miss!                       │
│                                 │
│ [Auto-scroll] [Clear Log]       │
└─────────────────────────────────┘
```

### Color Scheme
- 🔴 **Red:** Damage taken, failures
- 🟢 **Green:** Healing, successes
- 🔵 **Blue:** Spells cast
- 🟡 **Yellow:** Status effects, conditions
- ⚪ **White:** General actions, movement
- 🟣 **Purple:** Death saves, critical events

---

## 🔧 Implementation Steps

### Step 1: Create CombatLogPanel Component (3 hours)

**File:** `src/components/CombatLogPanel.tsx`

Features:
- Scrollable area with auto-scroll
- Color-coded entries
- Expandable details
- Turn separators
- Export button

### Step 2: Add Logging Functions (2 hours)

**File:** `src/utils/combatLogger.ts`

```typescript
export function logAttack(
  attacker: string,
  target: string,
  roll: number,
  modifier: number,
  targetAC: number,
  hit: boolean
): CombatLogEntry;

export function logDamage(
  target: string,
  damage: number,
  damageType?: string
): CombatLogEntry;

export function logHealing(
  target: string,
  healing: number
): CombatLogEntry;

export function logSpell(
  caster: string,
  spellName: string,
  targets?: string[]
): CombatLogEntry;

export function logCondition(
  target: string,
  condition: string,
  applied: boolean
): CombatLogEntry;
```

### Step 3: Integrate with CombatEncounter (3 hours)

**File:** `src/components/CombatEncounter.tsx`

- Add combatLog state
- Call logging functions for all actions
- Pass log to CombatLogPanel
- Increment turn counter

### Step 4: Add Export Functionality (1 hour)

**File:** `src/utils/exportCombatLog.ts`

```typescript
export function exportCombatLog(
  log: CombatLogEntry[],
  adventureName: string
): void {
  // Generate text file
  // Trigger download
}
```

### Step 5: Style and Polish (1 hour)

- Add icons for entry types
- Smooth scroll animations
- Responsive design
- Dark theme compatibility

---

## ✅ Testing Checklist

### Functionality
- [ ] All combat actions logged
- [ ] Entries appear in correct order
- [ ] Turn numbers increment
- [ ] Auto-scroll works
- [ ] Manual scroll doesn't break auto-scroll
- [ ] Export creates valid text file
- [ ] Clear log works

### Visual
- [ ] Color coding correct
- [ ] Icons display properly
- [ ] Expandable details work
- [ ] Mobile responsive
- [ ] Readable font size
- [ ] Proper spacing

### Integration
- [ ] Works with all attack types
- [ ] Works with spell casting
- [ ] Works with healing
- [ ] Works with conditions
- [ ] Works with death saves
- [ ] Persists during combat

---

## 📝 Example Log Output

```
=== Combat Log: Goblin Ambush ===
Date: 2025-11-21 16:00

TURN 1 - INITIATIVE
• Hero rolled 18 (d20: 15 + DEX: 3)
• Goblin rolled 14 (d20: 12 + DEX: 2)

TURN 2 - HERO'S TURN
⚔️ Hero attacks Goblin with Longsword
   Attack Roll: 20 (d20: 15 + STR: 3 + Prof: 2) vs AC 15
   ✓ HIT! Damage: 8 (1d8: 5 + STR: 3)
   Goblin HP: 7 → -1

💀 Goblin is defeated!

COMBAT ENDED
Victory! 50 XP gained.
```

---

## 🔮 Future Enhancements

1. **Filters** - Show only damage, only spells, etc.
2. **Search** - Find specific actions or actors
3. **Statistics** - Total damage dealt, accuracy %, etc.
4. **Replay** - Visualize combat from log
5. **Share** - Share log with others
6. **Timestamps** - Real-world time for each entry

---

## 🎨 Design Notes

- Use monospace font for numbers
- Add subtle background for each entry
- Highlight critical hits/fumbles
- Use icons from lucide-react
- Keep it compact but readable
- Consider collapsible turns for long combats

---

See implementation code in component files.
