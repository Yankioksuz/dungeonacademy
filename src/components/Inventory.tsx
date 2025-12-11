import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useTranslation } from 'react-i18next';
import { Backpack, Sword, Shield, Heart, Gem, X, Check, Scroll, Pin, Sparkles, Link, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCharacter, Item } from '@/types';
import { requiresAttunement, isAttuned, MAX_ATTUNED_ITEMS } from '@/utils/magicItemEffects';

interface InventoryProps {
  character: PlayerCharacter;
  onEquipItem?: (item: Item) => void;
  onUnequipItem?: (slot: 'weapon' | 'armor') => void;
  onUseItem: (item: Item) => void;
  onPinItem?: (item: Item) => void;
  onAttuneItem?: (item: Item) => void;
  onUnattuneItem?: (item: Item) => void;
  onClose: () => void;
}

export function Inventory({ character, onEquipItem, onUnequipItem, onUseItem, onPinItem, onAttuneItem, onUnattuneItem, onClose }: InventoryProps) {
  const { t } = useTranslation();
  const [pendingConsumable, setPendingConsumable] = useState<Item | null>(null);

  const attunedCount = (character.attunedItems || []).length;

  const inventory = character.inventory || [];
  const weapons = inventory.filter(item => item.type === 'weapon');
  const armor = inventory.filter(item => item.type === 'armor');
  const potions = inventory.filter(item => item.type === 'potion');
  const scrolls = inventory.filter(item => item.type === 'scroll');
  const treasure = inventory.filter(item => item.type === 'treasure');

  const getItemIcon = (type: Item['type']) => {
    switch (type) {
      case 'weapon': return <Sword className="h-4 w-4" />;
      case 'armor': return <Shield className="h-4 w-4" />;
      case 'potion': return <Heart className="h-4 w-4 text-red-400" />;
      case 'scroll': return <Scroll className="h-4 w-4 text-amber-300" />;
      case 'treasure': return <Gem className="h-4 w-4" />;
      default: return <Backpack className="h-4 w-4" />;
    }
  };

  const handleItemClick = (item: Item) => {
    if (item.type === 'weapon') {
      if (!onEquipItem || character.equippedWeapon?.id === item.id) return;
      onEquipItem(item);
      return;
    }

    if (item.type === 'armor') {
      if (!onEquipItem || character.equippedArmor?.id === item.id) return;
      onEquipItem(item);
      return;
    }

    if (item.type === 'potion' || item.type === 'scroll') {
      setPendingConsumable(item);
      return;
    }

    setPendingConsumable(null);
  };

  const handleClose = () => {
    setPendingConsumable(null);
    onClose();
  };

  const renderItemCard = (item: Item) => {
    const isEquipped = item.id === character.equippedWeapon?.id || item.id === character.equippedArmor?.id;
    const isSelected = pendingConsumable?.id === item.id;

    // Attunement logic
    const needsAttunement = requiresAttunement(item);
    const isItemAttuned = isAttuned(character, item);

    return (
      <Card
        key={item.id}
        className={cn(
          "cursor-pointer transition-all hover:border-fantasy-purple relative group",
          isSelected && "ring-2 ring-fantasy-gold",
          isEquipped && "border-fantasy-gold bg-fantasy-gold/10",
          isItemAttuned && "border-blue-400 bg-blue-400/10" // Visual distinction for attuned items
        )}
        onClick={() => handleItemClick(item)}
      >
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getItemIcon(item.type)}
              <h4 className="font-semibold text-sm">{item.name}</h4>
              {isItemAttuned && (
                <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
              )}
            </div>

            <div className="flex gap-1">
              {isEquipped && (
                <Badge variant="gold" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  {t('inventory.equipped')}
                </Badge>
              )}

              {needsAttunement && !isItemAttuned && (
                <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
                  <Link className="h-3 w-3 mr-1" />
                  Attune
                </Badge>
              )}

              {needsAttunement && isItemAttuned && (
                <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
                  <Link className="h-3 w-3 mr-1" />
                  Attuned
                </Badge>
              )}

              {/* Action Buttons */}
              <div className="flex gap-1">
                {needsAttunement && !isItemAttuned && onAttuneItem && (character.attunedItems?.length || 0) < MAX_ATTUNED_ITEMS && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/50"
                    title="Attune to item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttuneItem(item);
                    }}
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                )}

                {needsAttunement && isItemAttuned && onUnattuneItem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/50"
                    title="End Attunement"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnattuneItem(item);
                    }}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                )}

                {onPinItem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6", item.pinned && "text-fantasy-gold")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinItem(item);
                    }}
                  >
                    <Pin className={cn("h-4 w-4", item.pinned && "fill-current")} />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
          <div className="flex items-center justify-between text-xs">
            {item.damage && <span className="text-red-400">⚔️ {item.damage}</span>}
            {item.armorClass && <span className="text-blue-400">🛡️ AC {item.armorClass}</span>}
            {item.healing && <span className="text-green-400">❤️ +{item.healing} HP</span>}
            {item.value && <span className="text-fantasy-gold">💰 {item.value}g</span>}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl solid-panel max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Backpack className="h-6 w-6 text-fantasy-gold" />
              <CardTitle className="text-2xl">{t('inventory.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-fantasy-gold border-fantasy-gold">
                <Sparkles className="h-3 w-3 mr-1" />
                {attunedCount}/{MAX_ATTUNED_ITEMS}
              </Badge>
              <Badge variant="gold" className="text-lg px-3 py-1">
                💰 {character.gold}g
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Equipment Slots */}
          <div className="space-y-3">
            <h3 className="font-semibold text-fantasy-gold">{t('inventory.equipped')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weapon Slot */}
              <div className="p-4 border border-fantasy-purple/30 rounded-md bg-fantasy-dark-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Sword className="h-4 w-4" />
                    {t('inventory.weapon')}
                  </span>
                  {character.equippedWeapon && onUnequipItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnequipItem('weapon')}
                    >
                      {t('inventory.unequip')}
                    </Button>
                  )}
                </div>
                {character.equippedWeapon ? (
                  <div>
                    <p className="font-semibold">{character.equippedWeapon.name}</p>
                    <p className="text-xs text-muted-foreground">{character.equippedWeapon.description}</p>
                    <p className="text-xs text-red-400 mt-1">⚔️ {character.equippedWeapon.damage}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('inventory.noWeaponEquipped')}</p>
                )}
              </div>

              {/* Armor Slot */}
              <div className="p-4 border border-fantasy-purple/30 rounded-md bg-fantasy-dark-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('inventory.armor')}
                  </span>
                  {character.equippedArmor && onUnequipItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnequipItem('armor')}
                    >
                      {t('inventory.unequip')}
                    </Button>
                  )}
                </div>
                {character.equippedArmor ? (
                  <div>
                    <p className="font-semibold">{character.equippedArmor.name}</p>
                    <p className="text-xs text-muted-foreground">{character.equippedArmor.description}</p>
                    <p className="text-xs text-blue-400 mt-1">🛡️ AC {character.equippedArmor.armorClass}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('inventory.noArmorEquipped')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Weapons */}
          {weapons.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">⚔️ {t('inventory.weapons')} ({weapons.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weapons.map(renderItemCard)}
              </div>
            </div>
          )}

          {/* Armor */}
          {armor.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">🛡️ {t('inventory.armor')} ({armor.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {armor.map(renderItemCard)}
              </div>
            </div>
          )}

          {/* Potions */}
          {potions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">🧪 {t('inventory.potions')} ({potions.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {potions.map(renderItemCard)}
              </div>
            </div>
          )}

          {/* Scrolls */}
          {scrolls.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">📜 {t('inventory.scrolls', 'Scrolls')} ({scrolls.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scrolls.map(renderItemCard)}
              </div>
            </div>
          )}

          {/* Treasure */}
          {treasure.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">💎 {t('inventory.treasure')} ({treasure.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {treasure.map(renderItemCard)}
              </div>
            </div>
          )}

          {inventory.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Backpack className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>{t('inventory.empty')}</p>
              <p className="text-sm mt-2">{t('inventory.emptyHint')}</p>
            </div>
          )}

          {/* Consumable confirmation */}
          {pendingConsumable && (pendingConsumable.type === 'potion' || pendingConsumable.type === 'scroll') && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-fantasy-purple/20">
              <div>
                <p className="font-semibold">{pendingConsumable.name}</p>
                <p className="text-sm text-muted-foreground">
                  {pendingConsumable.type === 'potion'
                    ? t('inventory.usePotionPrompt', 'Use this potion now? This will consume it.')
                    : t('inventory.useScrollPrompt', 'Use this scroll now? This will consume it.')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPendingConsumable(null)}>
                  {pendingConsumable.type === 'potion'
                    ? t('inventory.keepPotion', 'Keep Potion')
                    : t('inventory.keepScroll', 'Keep Scroll')}
                </Button>
                <Button
                  variant="fantasy"
                  onClick={() => {
                    onUseItem(pendingConsumable);
                    setPendingConsumable(null);
                  }}
                >
                  {t('inventory.usePotion')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
