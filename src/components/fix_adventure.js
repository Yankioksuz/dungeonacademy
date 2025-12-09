
const fs = require('fs');
const FILE_PATH = "c:\\Users\\yanki.oksuz\\Documents\\projects\\dungeonacademy\\src\\components\\Adventure.tsx";

const CLEAN_HEADER = `import { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { useTranslation } from 'react-i18next';
import { Sword, BookOpen, Dice6, DoorOpen, CheckCircle2, Backpack, X, Tent, ShoppingBag, Brain, Wand2, Shield, Sparkles } from 'lucide-react';
import type { Item, TalentOption, Encounter, SkillName, SpellContent, Subclass } from '@/types';
import { cn } from '@/lib/utils';
import { CombatEncounter } from './CombatEncounter';
import { Inventory } from './Inventory';
import { DiceRollModal } from './DiceRollModal';
import { LevelUpModal } from './LevelUpModal';
import itemsData from '@/content/items.json';
import spellsData from '@/content/spells.json';
import talentsContent from '@/content/talents.json';
import { QuestTracker } from './QuestTracker';
import { JournalPanel } from './JournalPanel';
import { Shop } from './Shop';
import { SUBCLASSES } from '@/data/subclasses';
import {
  canRitualCast,
  getAvailableSlotLevels,
  getScaledCantripDamage,
  getSpellcastingAbility,
  getUpcastDamageOrEffect,
  isPreparedCaster,
  shouldCheckScrollUse,
  getProficiencyBonus,
} from '@/lib/spells';

const SUBCLASS_LEVELS: Record<string, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 2
};

// Force update check
`;

const HOOKS_INJECTION = `
    const [availableSubclasses, setAvailableSubclasses] = useState<Subclass[]>([]);
    const [selectedSubclassId, setSelectedSubclassId] = useState<string | null>(null);
`;

const USE_EFFECT_REPLACEMENT = `    // Watch for level up to show modal
    const prevLevelRef = useRef(character?.level || 1);
    useEffect(() => {
      if (character && character.level > prevLevelRef.current) {
        setShowLevelUp(true);
        setLevelUpData({
          level: character.level,
          hpIncrease: 10 // Simplified
        });
        
        // Generate talents logic...
        const newTalents = allTalents.filter(t => !character.talents?.includes(t.id)).slice(0, 3);
        setAvailableTalents(newTalents);
        
        // Subclass Logic
        const classId = character.class.id;
        const unlockLevel = SUBCLASS_LEVELS[classId];
        if (character.level === unlockLevel && !character.subclass) {
           setAvailableSubclasses(SUBCLASSES[classId] || []);
        } else {
           setAvailableSubclasses([]);
        }
      }
      prevLevelRef.current = character?.level || 1;
    }, [character?.level, allTalents, character]);`;

const HANDLE_CONFIRM_LOGIC = `    const handleLevelUpConfirm = () => {
       if (availableSubclasses.length > 0 && selectedSubclassId) {
         const subclass = availableSubclasses.find(s => s.id === selectedSubclassId);
         if (subclass) {
           updateCharacter(prev => {
              if (!prev) return prev;
              const featuresToAdd = subclass.featuresByLevel[prev.level] || [];
              return {
                ...prev,
                subclass: subclass, 
              };
           });
           addJournalEntry(\`You have adopted the \${subclass.name}!\`, 'Subclass Selected');
         }
       }
  
       handleTalentConfirm(); // Existing logic
       setShowLevelUp(false);
       setAvailableSubclasses([]); // Cleanup
       setSelectedSubclassId(null);
    };`;

try {
    const content = fs.readFileSync(FILE_PATH, 'utf8');
    const lines = content.split('\\n');

    // Find itemCollections indented
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const itemCollections =')) {
            startIndex = i;
            break;
        }
    }

    if (startIndex === -1) {
        console.error("Could not find start index");
        process.exit(1);
    }

    const validLines = lines.slice(startIndex);
    const dedentedLines = validLines.map(line => {
        if (line.startsWith('  ')) return line.substring(2);
        return line;
    });

    let bodyText = dedentedLines.join('\\n');

    // Inject Hooks
    bodyText = bodyText.replace("export function Adventure() {", "export function Adventure() {" + HOOKS_INJECTION);

    // Replace useEffect
    const oldEffectStart = "// Watch for level up to show modal";
    const startPos = bodyText.indexOf(oldEffectStart);
    if (startPos !== -1) {
        const endMarker = "}, [character?.level, allTalents, character]);";
        const endPos = bodyText.indexOf(endMarker, startPos);
        if (endPos !== -1) {
            const actualEnd = endPos + endMarker.length;
            bodyText = bodyText.substring(0, startPos) + USE_EFFECT_REPLACEMENT + bodyText.substring(actualEnd);
        }
    }

    // Inject Handler
    if (bodyText.includes("const handleTalentConfirm")) {
        bodyText = bodyText.replace("const handleTalentConfirm", HANDLE_CONFIRM_LOGIC + "\\n\\n    const handleTalentConfirm");
    }

    // Update Modal Props
    if (bodyText.includes("onConfirm={handleTalentConfirm}")) {
        bodyText = bodyText.replace("onConfirm={handleTalentConfirm}",
            "onConfirm={handleLevelUpConfirm}\\n          subclasses={availableSubclasses}\\n          onSelectSubclass={setSelectedSubclassId}");
    }

    const fullContent = CLEAN_HEADER + "\\n" + bodyText;
    fs.writeFileSync(FILE_PATH, fullContent, 'utf8');
    console.log("Fixed Adventure.tsx");

} catch (e) {
    console.error(e);
}
