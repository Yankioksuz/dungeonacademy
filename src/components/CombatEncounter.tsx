import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { Sword, Shield, Heart, Skull, Backpack, X, Flame, Wand, Activity, HeartPulse, Dice6 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiceRoller } from './DiceRoller';
import { Inventory } from './Inventory';
import type { PlayerCharacter, CombatEnemy, CombatLogEntry, SpellContent, CombatLogEntryType } from '@/types';
import { useGame } from '@/contexts/GameContext';
import { createLogEntry, formatRollBreakdown } from '@/utils/combatLogger';
import { CombatLogPanel } from './CombatLogPanel';
import spellsData from '@/content/spells.json';

interface StatusEffect {
  id: string;
  name: string;
  duration: number;
  type: 'buff' | 'debuff';
  data?: Record<string, number | string>;
}

type CombatEnemyState = CombatEnemy & {
  statusEffects: StatusEffect[];
};

interface CombatEncounterProps {
  character: PlayerCharacter;
  enemies: Array<{
    name: string;
    armorClass: number;
    hitPoints: number;
    attackBonus: number;
    damage: string;
  }>;
  onVictory: () => void;
  onDefeat: () => void;
  playerAdvantage?: boolean;
}

export function CombatEncounter({ character, enemies: initialEnemies, onVictory, onDefeat, playerAdvantage }: CombatEncounterProps) {
  const { t } = useTranslation();
  const { updateCharacter, useItem: consumeItem } = useGame();

  // Combat state - ensure HP is a valid number
  const [playerHp, setPlayerHp] = useState(() => {
    const hp = character.hitPoints || character.maxHitPoints || 10;
    return Math.max(1, hp);
  });

  const [enemies, setEnemies] = useState<CombatEnemyState[]>(() =>
    initialEnemies.map((enemy, index) => ({
      id: `enemy-${index}`,
      name: enemy.name,
      currentHp: enemy.hitPoints,
      maxHp: enemy.hitPoints,
      armorClass: enemy.armorClass,
      attackBonus: enemy.attackBonus,
      damage: enemy.damage,
      initiative: Math.floor(Math.random() * 20) + 1,
      isDefeated: false,
      statusEffects: [],
    }))
  );

  const [turnOrder, setTurnOrder] = useState<Array<{ id: string; name: string; initiative: number }>>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showSpellMenu, setShowSpellMenu] = useState(false);
  const [playerStatusEffects, setPlayerStatusEffects] = useState<StatusEffect[]>([]);
  const [playerDefeated, setPlayerDefeated] = useState(false);
  const [victoryAchieved, setVictoryAchieved] = useState(false);
  const [deathSaves, setDeathSaves] = useState({ successes: 0, failures: 0 });
  const [isStable, setIsStable] = useState(false);

  const findTorchOilItem = () =>
    (character.inventory || []).find(
      (item) =>
        (item.templateId || item.id)?.startsWith('torch-oil')
    );

  const getPlayerDefenseBonus = () => {
    const defenseEffect = playerStatusEffects.find(effect => effect.id === 'defense-bonus');
    return defenseEffect ? Number(defenseEffect.data?.bonus ?? 0) : 0;
  };

  const applyEnemyOngoingEffects = useCallback((enemy: CombatEnemyState) => {
    let updatedEnemy: CombatEnemyState = { ...enemy };
    const remainingEffects: StatusEffect[] = [];
    const messages: Array<{ message: string; type: CombatLogEntry['type'] }> = [];

    enemy.statusEffects.forEach((effect) => {
      let effectDamage = 0;
      if (effect.id.startsWith('burning-oil')) {
        effectDamage = Number(effect.data?.damage ?? 0);
        if (effectDamage > 0) {
          updatedEnemy.currentHp = Math.max(0, updatedEnemy.currentHp - effectDamage);
          messages.push({
            message: `${enemy.name} suffers ${effectDamage} fire damage from burning oil!`,
            type: 'damage'
          });
        }
      }

      if (updatedEnemy.currentHp > 0) {
        const nextDuration = effect.duration - 1;
        if (nextDuration > 0) {
          remainingEffects.push({ ...effect, duration: nextDuration });
        }
      }
    });

    updatedEnemy = {
      ...updatedEnemy,
      isDefeated: updatedEnemy.currentHp <= 0,
      statusEffects: updatedEnemy.currentHp <= 0 ? [] : remainingEffects,
    };

    if (updatedEnemy.isDefeated && enemy.currentHp > updatedEnemy.currentHp) {
      messages.push({
        message: `${enemy.name} is defeated by lingering effects!`,
        type: 'defeat'
      });
    }

    return { updatedEnemy, messages };
  }, []);

  const addLog = useCallback((message: string, type: CombatLogEntryType, details?: string, source?: string, target?: string) => {
    const entry = createLogEntry(type, message, details, source, target);
    setCombatLog(prev => [...prev, entry]);
  }, []);

  const rollDice = (sides: number = 20) => {
    return Math.floor(Math.random() * sides) + 1;
  };

  const nextTurn = () => {
    setTimeout(() => {
      setCurrentTurnIndex(prev => (prev + 1) % turnOrder.length);
    }, 500);
  };

  const performEnemyTurn = (enemyId: string) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.isDefeated) {
      nextTurn();
      return;
    }

    const { updatedEnemy, messages } = applyEnemyOngoingEffects(enemy);
    if (messages.length > 0) {
      messages.forEach((entry) => addLog(entry.message, entry.type));
    }

    if (updatedEnemy.currentHp !== enemy.currentHp || updatedEnemy.statusEffects !== enemy.statusEffects) {
      setEnemies(prev => prev.map(e => e.id === enemyId ? updatedEnemy : e));
    }

    if (updatedEnemy.isDefeated) {
      nextTurn();
      return;
    }

    const actingEnemy = updatedEnemy;

    // Prevent multiple enemy turns
    const timeout = setTimeout(() => {
      const attackRoll = rollDice(20);
      const totalAttack = attackRoll + actingEnemy.attackBonus;

      // Player AC Calculation
      const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2);
      let baseAC = 10 + dexMod; // Default unarmored

      if (character.equippedArmor) {
        const armorAC = character.equippedArmor.armorClass || 10;
        // Heavy armor (like Chain Mail) doesn't benefit from Dex
        // Light armor (like Leather) does
        // Simplified check: if AC >= 16 (Chain Mail), treat as heavy
        if (armorAC >= 16 || character.equippedArmor.id === 'chain') {
          baseAC = armorAC;
        } else {
          baseAC = armorAC + dexMod;
        }
      }

      const playerAC = baseAC + getPlayerDefenseBonus();

      if (totalAttack >= playerAC) {
        // Hit!
        if (playerHp <= 0) {
          // Attack on unconscious player causes failed death save
          addLog(`${actingEnemy.name} attacks your unconscious body!`, 'damage');
          setDeathSaves(prev => {
            const newFailures = prev.failures + 2; // Critical hit (melee range) = 2 failures
            if (newFailures >= 3) {
              addLog(`${character.name} has succumbed to their wounds.`, 'defeat');
            }
            return { ...prev, failures: newFailures };
          });
        } else {
          const damageRoll = rollDice(6) + 2; // Simplified damage
          addLog(`${actingEnemy.name} ${t('combat.hits')} ${character.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage');

          setPlayerHp(prev => {
            const newHp = Math.max(0, prev - damageRoll);
            updateCharacter((current) => {
              if (!current) return current;
              return { ...current, hitPoints: newHp };
            });
            if (newHp === 0) {
              addLog(`${character.name} falls unconscious!`, 'miss');
            }
            return newHp;
          });
        }
      } else {
        // Miss
        addLog(`${actingEnemy.name} ${t('combat.attacks')} ${character.name} ${t('combat.butMisses')}`, 'miss');
      }

      setPlayerStatusEffects(prev => prev.filter(effect => effect.id !== 'defense-bonus'));
      nextTurn();
    }, 1500);

    return () => clearTimeout(timeout);
  };

  const handlePlayerAttack = () => {
    if (!selectedEnemy || isRolling) return;

    setIsRolling(true);
    const attackRoll = rollDice(20);
    setDiceResult(attackRoll);

    const timeout = setTimeout(() => {
      const enemy = enemies.find(e => e.id === selectedEnemy);
      if (!enemy) {
        setIsRolling(false);
        setDiceResult(null);
        return;
      }

      const attackAbility = character.class.primaryAbility.includes('Dexterity') ? 'dexterity' : 'strength';
      const abilityMod = Math.floor((character.abilityScores[attackAbility] - 10) / 2);
      const proficiencyBonus = 2;
      const totalAttack = attackRoll + abilityMod + proficiencyBonus;
      const attackDetails = formatRollBreakdown(attackRoll, [
        { label: 'Ability', value: abilityMod },
        { label: 'Prof', value: proficiencyBonus }
      ]);

      if (totalAttack >= enemy.armorClass) {
        // Hit!
        // Calculate damage based on weapon
        let damageRoll = abilityMod;

        if (character.equippedWeapon?.damage) {
          const [count, sides] = (character.equippedWeapon.damage.split('+')[0] || '1d8').split('d').map(Number);
          const weaponBonus = parseInt(character.equippedWeapon.damage.split('+')[1] || '0');

          for (let i = 0; i < (count || 1); i++) {
            damageRoll += rollDice(sides || 8);
          }
          damageRoll += weaponBonus;
        } else {
          // Unarmed strike (1 + STR mod, but we'll be generous with 1d4)
          damageRoll += rollDice(4);
        }
        addLog(`${character.name} ${t('combat.hits')} ${enemy.name} ${t('combat.for')} ${damageRoll} ${t('combat.damage')}!`, 'damage', attackDetails);

        setEnemies(prev => prev.map(e => {
          if (e.id === selectedEnemy) {
            const newHp = Math.max(0, e.currentHp - damageRoll);
            return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
          }
          return e;
        }));
      } else {
        // Miss
        addLog(`${character.name} ${t('combat.attacks')} ${enemy.name} ${t('combat.butMisses')}`, 'miss', attackDetails);
      }

      setIsRolling(false);
      setDiceResult(null);
      nextTurn();
    }, 2000);

    return () => clearTimeout(timeout);
  };

  const handleDefend = () => {
    const defenseBonus = 2;
    setPlayerStatusEffects((prev) => [
      ...prev.filter(effect => effect.id !== 'defense-bonus'),
      {
        id: 'defense-bonus',
        name: t('combat.defensiveStance', 'Defensive Stance'),
        duration: 1,
        type: 'buff',
        data: { bonus: defenseBonus, expiresOn: 'next-turn' },
      },
    ]);
    addLog(`${character.name} ${t('combat.takesDefensiveStance')} (+${defenseBonus} AC)`, 'info');
    nextTurn();
  };

  const handleUseTorchOil = () => {
    if (!selectedEnemy) return;
    const oilItem = findTorchOilItem();
    if (!oilItem) return;

    const enemy = enemies.find(e => e.id === selectedEnemy);
    if (!enemy || enemy.isDefeated) return;

    const burningEffect: StatusEffect = {
      id: `burning-oil-${Date.now()}`,
      name: t('combat.burningOil', 'Burning Oil'),
      duration: 3,
      type: 'debuff',
      data: { damage: 4 },
    };

    setEnemies(prev => prev.map(e => e.id === selectedEnemy
      ? { ...e, statusEffects: [...e.statusEffects, burningEffect] }
      : e
    ));

    updateCharacter((prev) => ({
      ...prev,
      inventory: (prev.inventory || []).filter(item => item.id !== oilItem.id),
    }));

    addLog(`${character.name} splashes burning oil on ${enemy.name}, scorching them over time!`, 'info');

    setShowInventory(false);
    nextTurn();
  };

  const handleCastSpell = (spellId: string) => {
    const spell = spellsData.find(s => s.id === spellId) as SpellContent | undefined;
    if (!spell) return;

    // Check slots
    const level = spell.level;
    const slots = character.spellSlots?.[level];
    if (!slots || slots.current <= 0) {
      addLog(`${character.name} has no level ${level} spell slots remaining!`, 'miss');
      return;
    }

    // Deduct slot
    updateCharacter(prev => ({
      ...prev,
      spellSlots: {
        ...prev.spellSlots,
        [level]: {
          ...prev.spellSlots![level],
          current: prev.spellSlots![level].current - 1
        }
      }
    }));

    // Process Spell Effect
    if (spell.damage) {
      // Attack Spell
      if (!selectedEnemy) return;

      // Simple damage roll parsing (e.g. "8d6" -> roll 8 times d6)
      const [count, sides] = (spell.damage.split('+')[0] || '1d6').split('d').map(Number);
      const modifier = parseInt(spell.damage.split('+')[1] || '0');

      let damageTotal = modifier;
      for (let i = 0; i < count; i++) {
        damageTotal += rollDice(sides);
      }

      let finalDamage = damageTotal;
      let saveMessage = '';

      // Handle Saving Throw
      if (spell.saveType) {
        const spellAbility = character.class.primaryAbility.toLowerCase() as keyof typeof character.abilityScores;
        const spellDC = 8 + 2 + Math.floor((character.abilityScores[spellAbility] - 10) / 2); // 8 + Prof(2) + Mod

        const enemy = enemies.find(e => e.id === selectedEnemy);
        if (enemy) {
          const saveRoll = rollDice(20);
          const saveTotal = saveRoll + (enemy.savingThrowBonus || 0); // Default +0 save bonus

          if (saveTotal >= spellDC) {
            finalDamage = Math.floor(damageTotal / 2);
            saveMessage = ` (Saved! Rolled ${saveTotal} vs DC ${spellDC})`;
          } else {
            saveMessage = ` (Failed Save! Rolled ${saveTotal} vs DC ${spellDC})`;
          }
        }
      }

      // Apply damage
      setEnemies(prev => prev.map(e => {
        if (e.id === selectedEnemy) {
          const newHp = Math.max(0, e.currentHp - finalDamage);
          return { ...e, currentHp: newHp, isDefeated: newHp === 0 };
        }
        return e;
      }));

      addLog(`${character.name} casts ${spell.name} on ${selectedEnemyData?.name} for ${finalDamage} ${spell.damageType} damage!${saveMessage}`, 'damage');
    } else if (spell.healing) {
      // Healing Spell
      const [count, sides] = (spell.healing.split('+')[0] || '1d4').split('d').map(Number);
      const modifier = parseInt(spell.healing.split('+')[1] || '0');

      let healTotal = modifier;
      // Add spellcasting ability modifier if needed (simplified here)
      const spellAbility = character.class.primaryAbility.toLowerCase() as keyof typeof character.abilityScores;
      healTotal += Math.floor((character.abilityScores[spellAbility] - 10) / 2);

      for (let i = 0; i < count; i++) {
        healTotal += rollDice(sides);
      }

      setPlayerHp(prev => {
        const newHp = Math.min(character.maxHitPoints, prev + healTotal);
        return newHp;
      });

      updateCharacter(prev => ({ ...prev, hitPoints: Math.min(character.maxHitPoints, prev.hitPoints + healTotal) }));
      addLog(`${character.name} casts ${spell.name} and heals for ${healTotal} HP!`, 'heal');
    } else if (spell.id === 'shield') {
      // Special case for Shield
      const defenseBonus = 5;
      setPlayerStatusEffects((prev) => [
        ...prev.filter(effect => effect.id !== 'shield-spell'),
        {
          id: 'shield-spell',
          name: 'Shield',
          duration: 1,
          type: 'buff',
          data: { bonus: defenseBonus, expiresOn: 'next-turn' },
        },
      ]);
      addLog(`${character.name} casts Shield! (+5 AC)`, 'info');
    }

    setShowSpellMenu(false);
    nextTurn();
  };

  const handleDeathSave = () => {
    setIsRolling(true);
    const roll = rollDice(20);
    setDiceResult(roll);

    setTimeout(() => {
      setIsRolling(false);
      setDiceResult(null);

      if (roll === 20) {
        // Critical Success: Regain 1 HP
        setPlayerHp(1);
        setDeathSaves({ successes: 0, failures: 0 });
        setIsStable(false);
        addLog(`${character.name} rallies with a critical success! Regains 1 HP!`, 'heal');
        updateCharacter(prev => ({ ...prev, hitPoints: 1 }));
      } else if (roll === 1) {
        // Critical Failure: 2 Failures
        setDeathSaves(prev => ({ ...prev, failures: prev.failures + 2 }));
        addLog(`${character.name} suffers a critical failure on death save! (2 failures)`, 'damage');
      } else if (roll >= 10) {
        // Success
        setDeathSaves(prev => ({ ...prev, successes: prev.successes + 1 }));
        addLog(`${character.name} succeeds on a death save.`, 'info');
      } else {
        // Failure
        setDeathSaves(prev => ({ ...prev, failures: prev.failures + 1 }));
        addLog(`${character.name} fails a death save.`, 'miss');
      }

      nextTurn();
    }, 1500);
  };

  // Initialize combat
  useEffect(() => {
    let playerInitiative = Math.floor(Math.random() * 20) + 1 + Math.floor((character.abilityScores.dexterity - 10) / 2);

    if (playerAdvantage) {
      playerInitiative += 20; // Ensure player goes first
    }

    const order = [
      { id: 'player', name: character.name, initiative: playerInitiative },
      ...enemies.map(e => ({ id: e.id, name: e.name, initiative: e.initiative }))
    ].sort((a, b) => b.initiative - a.initiative);

    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setTurnOrder(order);
      addLog(t('combat.combatBegins'), 'info');

      // Auto-select first enemy
      if (enemies.length > 0) {
        setSelectedEnemy(enemies[0].id);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle turn changes
  useEffect(() => {
    if (turnOrder.length === 0) return;

    const currentEntity = turnOrder[currentTurnIndex];
    if (currentEntity && currentEntity.id !== 'player') {
      // It's an enemy's turn
      const timer = setTimeout(() => {
        performEnemyTurn(currentEntity.id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, turnOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for combat end
  useEffect(() => {
    const allEnemiesDefeated = enemies.every(e => e.isDefeated);
    if (allEnemiesDefeated && enemies.length > 0 && !victoryAchieved) {
      setVictoryAchieved(true);
      addLog(t('combat.victory'), 'defeat');
      setTimeout(() => onVictory(), 1500);
    }

    if (playerHp <= 0 && deathSaves.failures >= 3 && !playerDefeated) {
      setPlayerDefeated(true);
      addLog(t('combat.defeat'), 'defeat');
      setTimeout(() => onDefeat(), 1200);
    }
  }, [enemies, playerHp, deathSaves, playerDefeated, victoryAchieved, addLog, onVictory, onDefeat, t]);

  const currentTurn = turnOrder[currentTurnIndex];
  const isPlayerTurn = currentTurn?.id === 'player';

  useEffect(() => {
    if (isPlayerTurn) {
      setPlayerStatusEffects(prev =>
        prev.filter(effect => effect.id !== 'defense-bonus' || effect.data?.expiresOn !== 'next-turn')
      );
    }
  }, [isPlayerTurn]);

  const torchOilAvailable = Boolean(findTorchOilItem());
  const selectedEnemyData = selectedEnemy ? enemies.find(e => e.id === selectedEnemy) : null;

  return (
    <div className="space-y-6">
      {/* Player Status */}
      <Card className="scroll-parchment">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-fantasy-purple" />
              <div>
                <h3 className="font-bold text-lg">{character.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {character.race.name} {character.class.name}
                </p>
              </div>
            </div>
            {isPlayerTurn && (
              <Badge variant="gold" className="animate-pulse">{t('combat.yourTurn')}</Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-red-500" />
                {t('combat.hp')}:
              </span>
              <span className="font-bold">{playerHp} / {character.maxHitPoints}</span>
            </div>
            <Progress
              value={(playerHp / character.maxHitPoints) * 100}
              className="h-3"
            />
            {playerStatusEffects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {playerStatusEffects.map(effect => (
                  <Badge key={effect.id} variant="fantasy" className="text-xs">
                    {effect.name}
                  </Badge>
                ))}
              </div>
            )}
            {playerHp <= 0 && (
              <div className="mt-3 p-2 bg-black/20 rounded-md border border-fantasy-purple/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-fantasy-gold" />
                    Death Saves
                  </span>
                  {isStable && <Badge variant="gold">Stable</Badge>}
                </div>
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span>Successes:</span>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-3 h-3 rounded-full border border-green-500",
                            i < deathSaves.successes && "bg-green-500"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Failures:</span>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-3 h-3 rounded-full border border-red-500",
                            i < deathSaves.failures && "bg-red-500"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enemies */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Skull className="h-5 w-5 text-red-500" />
          {t('combat.enemies')}
        </h3>
        {enemies.map(enemy => (
          <Card
            key={enemy.id}
            className={cn(
              "cursor-pointer transition-all",
              selectedEnemy === enemy.id && "ring-2 ring-fantasy-gold",
              enemy.isDefeated && "opacity-50",
              turnOrder[currentTurnIndex]?.id === enemy.id && "border-fantasy-purple border-2"
            )}
            onClick={() => !enemy.isDefeated && setSelectedEnemy(enemy.id)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold">{enemy.name}</h4>
                  <p className="text-xs text-muted-foreground">{t('combat.armorClass')}: {enemy.armorClass}</p>
                </div>
                {enemy.isDefeated && (
                  <Badge variant="destructive">{t('combat.defeated')}</Badge>
                )}
                {turnOrder[currentTurnIndex]?.id === enemy.id && !enemy.isDefeated && (
                  <Badge variant="fantasy">{t('combat.acting')}</Badge>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('combat.hp')}:</span>
                  <span className="font-bold">{enemy.currentHp} / {enemy.maxHp}</span>
                </div>
                <Progress
                  value={(enemy.currentHp / enemy.maxHp) * 100}
                  className="h-2"
                />
                {enemy.statusEffects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {enemy.statusEffects.map(effect => (
                      <Badge key={effect.id} variant="destructive" className="text-xs">
                        {effect.name} ({effect.duration})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dice Roller */}
      {
        isRolling && diceResult !== null && (
          <div className="flex justify-center">
            <DiceRoller
              isRolling={isRolling}
              result={diceResult}
              sides={20}
            />
          </div>
        )
      }

      {/* Combat Actions */}
      {
        isPlayerTurn && !isRolling && playerHp > 0 && (
          <Card className="border-fantasy-gold">
            <CardHeader>
              <CardTitle className="text-lg">{t('combat.yourActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="fantasy"
                className="w-full"
                onClick={handlePlayerAttack}
                disabled={!selectedEnemy || enemies.every(e => e.isDefeated)}
              >
                <Sword className="h-4 w-4 mr-2" />
                {t('combat.attack')} {selectedEnemy && enemies.find(e => e.id === selectedEnemy)?.name}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowInventory(true)}
              >
                <Backpack className="h-4 w-4 mr-2" />
                {t('adventure.inventory', 'Inventory')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleUseTorchOil}
                disabled={!torchOilAvailable || !selectedEnemyData || selectedEnemyData.isDefeated}
              >
                <Flame className="h-4 w-4 mr-2 text-orange-400" />
                {t('combat.useTorchOil', 'Use Torch Oil')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSpellMenu(true)}
                disabled={!character.knownSpells?.length || !character.spellSlots?.[1]?.current}
              >
                <Wand className="h-4 w-4 mr-2 text-purple-400" />
                {t('combat.castSpell', 'Cast Spell')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDefend}
              >
                <Shield className="h-4 w-4 mr-2" />
                {t('combat.defend')}
              </Button>
            </CardContent>
          </Card>
        )
      }

      {/* Death Save Actions */}
      {
        isPlayerTurn && !isRolling && playerHp <= 0 && !isStable && (
          <Card className="border-red-500 animate-pulse">
            <CardHeader>
              <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                <HeartPulse className="h-5 w-5" />
                Unconscious!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                You are dying. You must make a death saving throw to survive.
                <br />
                <span className="text-xs opacity-70">3 Successes to stabilize. 3 Failures to die.</span>
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDeathSave}
              >
                <Dice6 className="h-4 w-4 mr-2" />
                Roll Death Save
              </Button>
            </CardContent>
          </Card>
        )
      }

      {/* Stable Actions */}
      {
        isPlayerTurn && !isRolling && playerHp <= 0 && isStable && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="text-lg text-green-500">Stable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You are unconscious but stable. You must wait for healing or 1d4 hours to regain consciousness.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={nextTurn}
              >
                Pass Turn
              </Button>
            </CardContent>
          </Card>
        )
      }

      {
        showInventory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-2xl">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-12 right-0 text-white hover:text-fantasy-gold"
                onClick={() => setShowInventory(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Inventory
                character={character}
                onClose={() => setShowInventory(false)}
                onUseItem={(item) => {
                  if (item.type === 'potion' && typeof item.healing === 'number') {
                    const healAmount = item.healing;
                    let actualHeal = 0;
                    setPlayerHp(prev => {
                      const newHp = Math.min(character.maxHitPoints, prev + healAmount);
                      actualHeal = Math.max(0, newHp - prev);
                      return newHp;
                    });
                    consumeItem(item);
                    addLog(`${character.name} uses ${item.name} and recovers ${actualHeal} HP!`, 'heal');
                    nextTurn();
                    setShowInventory(false);
                  }
                }}
              />
            </div>
          </div>
        )
      }

      {
        showSpellMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-md">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-12 right-0 text-white hover:text-fantasy-gold"
                onClick={() => setShowSpellMenu(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Card className="border-fantasy-purple bg-fantasy-dark-card">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Spellbook</span>
                    <Badge variant="outline">
                      Slots Lvl 1: {character.spellSlots?.[1]?.current}/{character.spellSlots?.[1]?.max}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 max-h-[60vh] overflow-y-auto">
                  {character.knownSpells?.map(spellId => {
                    const spell = spellsData.find(s => s.id === spellId);
                    if (!spell) return null;
                    return (
                      <Button
                        key={spellId}
                        variant="ghost"
                        className="w-full justify-between h-auto py-3 hover:bg-fantasy-purple/20"
                        onClick={() => handleCastSpell(spellId)}
                        disabled={!character.spellSlots?.[spell.level]?.current}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="font-bold">{spell.name}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2">{spell.description}</span>
                        </div>
                        <Badge variant="secondary" className="ml-2 shrink-0">Lvl {spell.level}</Badge>
                      </Button>
                    );
                  })}
                  {(!character.knownSpells || character.knownSpells.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">You don't know any spells.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      }

      {/* Combat Log */}
      <CombatLogPanel logs={combatLog} className="max-h-60" />
    </div >
  );
}
