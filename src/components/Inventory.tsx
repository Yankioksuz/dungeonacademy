import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useTranslation } from 'react-i18next';
import {
  Backpack, Sword, Shield, Heart, Gem, X, Check, Scroll,
  Sparkles, Link, Unlink, Crown, Hand, Footprints, CircleDot,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerCharacter, Item, EquipmentSlot } from '@/types';
import { requiresAttunement, isAttuned, MAX_ATTUNED_ITEMS } from '@/utils/magicItemEffects';
import { isArmorProficient, isWeaponProficient } from '@/utils/characterStats';
import { getItemIconSrc, hasItemIcon } from '@/data/itemIcons';

interface InventoryProps {
  character: PlayerCharacter;
  onEquipItem?: (item: Item) => void;
  onUnequipItem?: (slot: 'weapon' | 'armor') => void;
  onEquipToSlot?: (item: Item, slot: EquipmentSlot) => void;
  onUnequipSlot?: (slot: EquipmentSlot) => void;
  onUseItem: (item: Item) => void;
  onPinItem?: (item: Item) => void;
  onAttuneItem?: (item: Item) => void;
  onUnattuneItem?: (item: Item) => void;
  onClose: () => void;
}

// Helper to get slot icon
const getSlotIcon = (slot: EquipmentSlot) => {
  switch (slot) {
    case 'mainHand': return <Sword className="h-5 w-5" />;
    case 'offHand': return <Shield className="h-5 w-5" />;
    case 'armor': return <Shield className="h-5 w-5" />;
    case 'helmet': return <Crown className="h-5 w-5" />;
    case 'gloves': return <Hand className="h-5 w-5" />;
    case 'boots': return <Footprints className="h-5 w-5" />;
    case 'amulet': return <CircleDot className="h-5 w-5" />;
    case 'ring1': return <CircleDot className="h-4 w-4" />;
    case 'ring2': return <CircleDot className="h-4 w-4" />;
    default: return <Backpack className="h-5 w-5" />;
  }
};

// Helper to get slot display name
const getSlotName = (slot: EquipmentSlot) => {
  const names: Record<EquipmentSlot, string> = {
    mainHand: 'Main Hand',
    offHand: 'Off Hand',
    armor: 'Armor',
    helmet: 'Head',
    gloves: 'Hands',
    boots: 'Feet',
    amulet: 'Neck',
    ring1: 'Ring',
    ring2: 'Ring',
  };
  return names[slot];
};

// Helper to map item type to slot (for future use)
// const getSlotForItemType = (type: Item['type']): EquipmentSlot | null => {
//   switch (type) {
//     case 'weapon': return 'mainHand';
//     case 'armor': return 'armor';
//     case 'shield': return 'offHand';
//     case 'helmet': return 'helmet';
//     case 'gloves': return 'gloves';
//     case 'boots': return 'boots';
//     case 'amulet': return 'amulet';
//     case 'ring': return 'ring1';
//     default: return null;
//   }
// };

// Equipment Slot Component - moved outside to avoid recreation on render
interface EquipmentSlotBoxProps {
  slot: EquipmentSlot;
  equipped: Item | undefined;
  isSelected: boolean;
  onSelect: (item: Item) => void;
}

const EquipmentSlotBox = ({ slot, equipped, isSelected, onSelect }: EquipmentSlotBoxProps) => {
  const iconId = equipped ? (equipped.templateId || equipped.id) : null;
  const hasIcon = iconId ? hasItemIcon(iconId) : false;
  const iconSrc = hasIcon && iconId ? getItemIconSrc(iconId) : null;

  return (
    <div
      className={cn(
        "p-2 rounded-lg border-2 border-dashed cursor-pointer transition-all",
        "flex flex-col items-center justify-center min-h-[70px]",
        equipped
          ? "border-fantasy-gold/50 bg-fantasy-gold/10 hover:bg-fantasy-gold/20"
          : "border-fantasy-purple/30 bg-fantasy-dark-surface hover:border-fantasy-purple/50",
        isSelected && "ring-2 ring-fantasy-gold"
      )}
      onClick={() => equipped && onSelect(equipped)}
    >
      {equipped && hasIcon && iconSrc ? (
        <div className="w-10 h-10 mb-1 rounded bg-black/20 overflow-hidden shadow-sm">
          <img src={iconSrc} alt={equipped.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <>
          <div className="text-muted-foreground mb-1">
            {getSlotIcon(slot)}
          </div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {getSlotName(slot)}
          </p>
        </>
      )}

      {equipped && (
        <p className="text-xs font-medium text-center truncate max-w-full mt-1 text-fantasy-gold/90">
          {equipped.name}
        </p>
      )}
    </div>
  );
};

// Category Section Component - moved outside to avoid recreation on render
interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  items: Item[];
  categoryKey: string;
  isExpanded: boolean;
  onToggleCategory: (category: string) => void;
  selectedItemId: string | null;
  onItemClick: (item: Item) => void;
  isItemEquipped: (item: Item) => boolean;
  isAttuned: (item: Item) => boolean;
  getItemIcon: (item: Item) => React.ReactNode;
}

const CategorySection = ({
  title,
  icon,
  items,
  categoryKey,
  isExpanded,
  onToggleCategory,
  selectedItemId,
  onItemClick,
  isItemEquipped,
  isAttuned,
  getItemIcon
}: CategorySectionProps) => {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-fantasy-purple/20 last:border-0">
      <button
        className="w-full flex items-center gap-2 p-3 hover:bg-fantasy-purple/10 transition-colors"
        onClick={() => onToggleCategory(categoryKey)}
      >
        {icon}
        <span className="font-semibold flex-1 text-left">{title}</span>
        <Badge variant="outline" className="text-xs">{items.length}</Badge>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="pb-2 space-y-1">
          {items.map(item => {
            const equipped = isItemEquipped(item);
            const attuned = isAttuned(item);
            const isSelected = selectedItemId === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "mx-2 px-3 py-2 rounded-md cursor-pointer transition-all",
                  "flex items-center gap-2",
                  isSelected
                    ? "bg-fantasy-purple/30 ring-1 ring-fantasy-purple"
                    : "hover:bg-fantasy-purple/10",
                  equipped && "border-l-2 border-fantasy-gold"
                )}
                onClick={() => onItemClick(item)}
              >
                {getItemIcon(item)}
                <span className="flex-1 text-sm truncate">{item.name}</span>
                {equipped && <Check className="h-3 w-3 text-fantasy-gold" />}
                {attuned && <Sparkles className="h-3 w-3 text-blue-400" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export function Inventory({
  character,
  onEquipItem,
  onUnequipItem,
  onEquipToSlot,
  onUnequipSlot,
  onUseItem,
  onAttuneItem,
  onUnattuneItem,
  onClose
}: InventoryProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['weapons', 'armor', 'potions'])
  );
  const [pendingConsumable, setPendingConsumable] = useState<Item | null>(null);

  const attunedCount = (character.attunedItems || []).length;
  const inventory = character.inventory || [];

  // Categorize items
  const weapons = inventory.filter(item => item.type === 'weapon');
  const armor = inventory.filter(item => ['armor', 'shield', 'helmet', 'gloves', 'boots'].includes(item.type));
  const accessories = inventory.filter(item => ['amulet', 'ring'].includes(item.type));
  const potions = inventory.filter(item => item.type === 'potion');
  const scrolls = inventory.filter(item => item.type === 'scroll');
  const treasure = inventory.filter(item => item.type === 'treasure');

  // Get equipped items (using legacy fields for now)
  const getEquippedItem = (slot: EquipmentSlot): Item | undefined => {
    // Check new equipment object first
    if (character.equipment?.[slot]) {
      return character.equipment[slot];
    }
    // Fallback to legacy fields
    if (slot === 'mainHand') return character.equippedWeapon;
    if (slot === 'armor') return character.equippedArmor;
    if (slot === 'offHand') return character.equippedShield;
    return undefined;
  };

  const isItemEquipped = (item: Item): boolean => {
    return item.id === character.equippedWeapon?.id ||
      item.id === character.equippedArmor?.id ||
      item.id === character.equippedShield?.id;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);

    // If consumable, also set pending
    if (item.type === 'potion' || item.type === 'scroll') {
      setPendingConsumable(item);
    } else {
      setPendingConsumable(null);
    }
  };

  const handleEquip = (item: Item, slot?: EquipmentSlot) => {
    // Determine the appropriate slot based on item type
    const targetSlot = slot || getSlotForItemType(item.type);

    if (targetSlot && onEquipToSlot) {
      onEquipToSlot(item, targetSlot);
    } else if (onEquipItem) {
      // Fallback to legacy equip
      onEquipItem(item);
    }
  };

  const handleUnequip = (slot: EquipmentSlot) => {
    if (onUnequipSlot) {
      onUnequipSlot(slot);
    } else if (onUnequipItem) {
      // Fallback to legacy unequip
      if (slot === 'mainHand') {
        onUnequipItem('weapon');
      } else if (slot === 'armor') {
        onUnequipItem('armor');
      }
    }
  };

  // Helper to get slot for item type
  const getSlotForItemType = (type: Item['type']): EquipmentSlot | null => {
    switch (type) {
      case 'weapon': return 'mainHand';
      case 'armor': return 'armor';
      case 'shield': return 'offHand';
      case 'helmet': return 'helmet';
      case 'gloves': return 'gloves';
      case 'boots': return 'boots';
      case 'amulet': return 'amulet';
      case 'ring': return 'ring1';
      default: return null;
    }
  };

  const handleUseConsumable = () => {
    if (pendingConsumable) {
      onUseItem(pendingConsumable);
      setPendingConsumable(null);
      setSelectedItem(null);
    }
  };

  // Get icon for item - uses custom image if available, otherwise fallback to Lucide icon
  const getItemIcon = (item: Item) => {
    // Check if this item has a custom icon
    // Use templateId if available (for instantiated items), otherwise fallback to id
    const iconId = item.templateId || item.id;
    if (hasItemIcon(iconId)) {
      const iconSrc = getItemIconSrc(iconId);
      return (
        <img
          src={iconSrc}
          alt={item.name}
          className="h-8 w-8 rounded object-cover"
        />
      );
    }

    // Fallback to type-based Lucide icons
    switch (item.type) {
      case 'weapon': return <Sword className="h-4 w-4" />;
      case 'armor': case 'shield': return <Shield className="h-4 w-4" />;
      case 'helmet': return <Crown className="h-4 w-4" />;
      case 'gloves': return <Hand className="h-4 w-4" />;
      case 'boots': return <Footprints className="h-4 w-4" />;
      case 'amulet': case 'ring': return <CircleDot className="h-4 w-4" />;
      case 'potion': return <Heart className="h-4 w-4 text-red-400" />;
      case 'scroll': return <Scroll className="h-4 w-4 text-amber-300" />;
      case 'treasure': return <Gem className="h-4 w-4" />;
      default: return <Backpack className="h-4 w-4" />;
    }
  };



  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl solid-panel max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="border-b border-fantasy-purple/20 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Backpack className="h-7 w-7 text-fantasy-gold" />
              <CardTitle className="text-2xl font-fantasy">
                {t('inventory.title')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-fantasy-gold border-fantasy-gold px-3 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                {attunedCount}/{MAX_ATTUNED_ITEMS}
              </Badge>
              <Badge variant="gold" className="text-lg px-4 py-1">
                💰 {character.gold}g
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-12 h-full max-h-[calc(90vh-100px)] divide-x divide-fantasy-purple/20">

            {/* Left Column - Equipment Slots */}
            <div className="col-span-3 p-4 overflow-y-auto bg-fantasy-dark-bg/50 max-h-[calc(90vh-100px)]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Equipment
              </h3>

              {/* Equipment Grid */}
              <div className="space-y-3">
                {/* Head */}
                <EquipmentSlotBox
                  slot="helmet"
                  equipped={getEquippedItem('helmet')}
                  isSelected={selectedItem?.id === getEquippedItem('helmet')?.id}
                  onSelect={setSelectedItem}
                />

                {/* Body Row */}
                <div className="grid grid-cols-2 gap-2">
                  <EquipmentSlotBox
                    slot="armor"
                    equipped={getEquippedItem('armor')}
                    isSelected={selectedItem?.id === getEquippedItem('armor')?.id}
                    onSelect={setSelectedItem}
                  />
                  <EquipmentSlotBox
                    slot="amulet"
                    equipped={getEquippedItem('amulet')}
                    isSelected={selectedItem?.id === getEquippedItem('amulet')?.id}
                    onSelect={setSelectedItem}
                  />
                </div>

                {/* Hands Row */}
                <div className="grid grid-cols-2 gap-2">
                  <EquipmentSlotBox
                    slot="gloves"
                    equipped={getEquippedItem('gloves')}
                    isSelected={selectedItem?.id === getEquippedItem('gloves')?.id}
                    onSelect={setSelectedItem}
                  />
                  <EquipmentSlotBox
                    slot="boots"
                    equipped={getEquippedItem('boots')}
                    isSelected={selectedItem?.id === getEquippedItem('boots')?.id}
                    onSelect={setSelectedItem}
                  />
                </div>

                {/* Weapons Row */}
                <div className="grid grid-cols-2 gap-2">
                  <EquipmentSlotBox
                    slot="mainHand"
                    equipped={getEquippedItem('mainHand')}
                    isSelected={selectedItem?.id === getEquippedItem('mainHand')?.id}
                    onSelect={setSelectedItem}
                  />
                  <EquipmentSlotBox
                    slot="offHand"
                    equipped={getEquippedItem('offHand')}
                    isSelected={selectedItem?.id === getEquippedItem('offHand')?.id}
                    onSelect={setSelectedItem}
                  />
                </div>

                {/* Rings Row */}
                <div className="grid grid-cols-2 gap-2">
                  <EquipmentSlotBox
                    slot="ring1"
                    equipped={getEquippedItem('ring1')}
                    isSelected={selectedItem?.id === getEquippedItem('ring1')?.id}
                    onSelect={setSelectedItem}
                  />
                  <EquipmentSlotBox
                    slot="ring2"
                    equipped={getEquippedItem('ring2')}
                    isSelected={selectedItem?.id === getEquippedItem('ring2')?.id}
                    onSelect={setSelectedItem}
                  />
                </div>
              </div>
            </div>

            {/* Center Column - Inventory List */}
            <div className="col-span-5 overflow-y-auto bg-fantasy-dark-card/50 max-h-[calc(90vh-100px)]">
              <div className="sticky top-0 bg-fantasy-dark-card border-b border-fantasy-purple/20 p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Items
                </h3>
              </div>

              <div className="divide-y divide-fantasy-purple/10">
                <CategorySection
                  title="Weapons"
                  icon={<Sword className="h-4 w-4 text-red-400" />}
                  items={weapons}
                  categoryKey="weapons"
                  isExpanded={expandedCategories.has('weapons')}
                  onToggleCategory={toggleCategory}
                  selectedItemId={selectedItem?.id || null}
                  onItemClick={handleItemClick}
                  isItemEquipped={isItemEquipped}
                  isAttuned={(item) => isAttuned(character, item)}
                  getItemIcon={getItemIcon}
                />
                <CategorySection
                  title="Armor & Equipment"
                  icon={<Shield className="h-4 w-4 text-blue-400" />}
                  items={armor}
                  categoryKey="armor"
                  isExpanded={expandedCategories.has('armor')}
                  onToggleCategory={toggleCategory}
                  selectedItemId={selectedItem?.id || null}
                  onItemClick={handleItemClick}
                  isItemEquipped={isItemEquipped}
                  isAttuned={(item) => isAttuned(character, item)}
                  getItemIcon={getItemIcon}
                />
                <CategorySection
                  title="Accessories"
                  icon={<CircleDot className="h-4 w-4 text-purple-400" />}
                  items={accessories}
                  categoryKey="accessories"
                  isExpanded={expandedCategories.has('accessories')}
                  onToggleCategory={toggleCategory}
                  selectedItemId={selectedItem?.id || null}
                  onItemClick={handleItemClick}
                  isItemEquipped={isItemEquipped}
                  isAttuned={(item) => isAttuned(character, item)}
                  getItemIcon={getItemIcon}
                />
                <CategorySection
                  title="Potions"
                  icon={<Heart className="h-4 w-4 text-red-400" />}
                  items={potions}
                  categoryKey="potions"
                  isExpanded={expandedCategories.has('potions')}
                  onToggleCategory={toggleCategory}
                  selectedItemId={selectedItem?.id || null}
                  onItemClick={handleItemClick}
                  isItemEquipped={isItemEquipped}
                  isAttuned={(item) => isAttuned(character, item)}
                  getItemIcon={getItemIcon}
                />
                <CategorySection
                  title="Scrolls"
                  icon={<Scroll className="h-4 w-4 text-amber-300" />}
                  items={scrolls}
                  categoryKey="scrolls"
                  isExpanded={expandedCategories.has('scrolls')}
                  onToggleCategory={toggleCategory}
                  selectedItemId={selectedItem?.id || null}
                  onItemClick={handleItemClick}
                  isItemEquipped={isItemEquipped}
                  isAttuned={(item) => isAttuned(character, item)}
                  getItemIcon={getItemIcon}
                />
                <CategorySection
                  title="Treasure"
                  icon={<Gem className="h-4 w-4 text-fantasy-gold" />}
                  items={treasure}
                  categoryKey="treasure"
                  isExpanded={expandedCategories.has('treasure')}
                  onToggleCategory={toggleCategory}
                  selectedItemId={selectedItem?.id || null}
                  onItemClick={handleItemClick}
                  isItemEquipped={isItemEquipped}
                  isAttuned={(item) => isAttuned(character, item)}
                  getItemIcon={getItemIcon}
                />
              </div>

              {inventory.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Backpack className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('inventory.empty')}</p>
                  <p className="text-sm mt-1">{t('inventory.emptyHint')}</p>
                </div>
              )}
            </div>

            {/* Right Column - Item Details */}
            <div className="col-span-4 p-4 overflow-y-auto bg-fantasy-dark-surface/50 max-h-[calc(90vh-100px)]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Item Details
              </h3>

              {selectedItem ? (
                <div className="space-y-4">
                  {/* Item Header */}
                  <div className="text-center pb-4 border-b border-fantasy-purple/20">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-fantasy-dark-card border border-fantasy-purple/30 flex items-center justify-center">
                      {getItemIcon(selectedItem)}
                    </div>
                    <h4 className="text-xl font-semibold text-fantasy-gold">
                      {selectedItem.name}
                    </h4>
                    <p className="text-sm text-muted-foreground capitalize">
                      {selectedItem.type}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    {selectedItem.damage && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Damage</span>
                        <span className="text-red-400 font-medium">{selectedItem.damage}</span>
                      </div>
                    )}
                    {selectedItem.armorClass !== undefined && selectedItem.armorClass > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Armor Class</span>
                        <span className="text-blue-400 font-medium">+{selectedItem.armorClass}</span>
                      </div>
                    )}
                    {(selectedItem.subtype || selectedItem.armorType) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <span className="text-cyan-400 font-medium capitalize">
                          {selectedItem.subtype || (selectedItem.armorType === 'shield' ? 'Shield' : `${selectedItem.armorType} Armor`)}
                        </span>
                      </div>
                    )}
                    {selectedItem.healing && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Healing</span>
                        <span className="text-green-400 font-medium">+{selectedItem.healing} HP</span>
                      </div>
                    )}
                    {selectedItem.value && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Value</span>
                        <span className="text-fantasy-gold font-medium">{selectedItem.value}g</span>
                      </div>
                    )}
                    {selectedItem.properties && selectedItem.properties.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs text-muted-foreground">Properties</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedItem.properties.map(prop => (
                            <Badge key={prop} variant="outline" className="text-xs">
                              {prop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="pt-2 border-t border-fantasy-purple/20">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedItem.description}
                    </p>
                  </div>

                  {/* Weapon Proficiency Warning */}
                  {selectedItem.type === 'weapon' && !isWeaponProficient(character, selectedItem) && (
                    <div className="pt-2 border-t border-red-500/30">
                      <div className="flex items-start gap-2 text-sm bg-red-500/10 rounded-md p-2">
                        <Sword className="h-4 w-4 text-red-400 mt-0.5" />
                        <div>
                          <span className="text-red-400 font-medium">Not Proficient</span>
                          <p className="text-red-300/70 text-xs mt-1">
                            You don't add your proficiency bonus to attack rolls with this weapon.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Armor Proficiency Warning */}
                  {(selectedItem.type === 'armor' || selectedItem.type === 'shield') &&
                    selectedItem.armorType &&
                    !isArmorProficient(character, selectedItem.armorType) && (
                      <div className="pt-2 border-t border-red-500/30">
                        <div className="flex items-start gap-2 text-sm bg-red-500/10 rounded-md p-2">
                          <Shield className="h-4 w-4 text-red-400 mt-0.5" />
                          <div>
                            <span className="text-red-400 font-medium">Not Proficient</span>
                            <p className="text-red-300/70 text-xs mt-1">
                              Wearing this gives disadvantage on STR/DEX checks, attacks, saves, and prevents spellcasting.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Attunement Status */}
                  {requiresAttunement(selectedItem) && (
                    <div className="pt-2 border-t border-fantasy-purple/20">
                      <div className="flex items-center gap-2 text-sm">
                        <Link className="h-4 w-4 text-blue-400" />
                        <span className="text-muted-foreground">Requires Attunement</span>
                        {isAttuned(character, selectedItem) && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 text-xs">
                            Attuned
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 space-y-2">
                    {/* Equip/Unequip - now supports all equipment types */}
                    {['weapon', 'armor', 'shield', 'helmet', 'gloves', 'boots', 'amulet', 'ring'].includes(selectedItem.type) && (
                      <>
                        {isItemEquipped(selectedItem) ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              const slot = getSlotForItemType(selectedItem.type);
                              if (slot) handleUnequip(slot);
                            }}
                          >
                            Unequip
                          </Button>
                        ) : (
                          <Button
                            variant="fantasy"
                            className="w-full"
                            onClick={() => handleEquip(selectedItem)}
                          >
                            Equip {selectedItem.type === 'ring' ? '(Ring 1)' : ''}
                          </Button>
                        )}
                      </>
                    )}

                    {/* Use Consumable */}
                    {(selectedItem.type === 'potion' || selectedItem.type === 'scroll') && (
                      <Button
                        variant="fantasy"
                        className="w-full"
                        onClick={handleUseConsumable}
                      >
                        Use {selectedItem.type === 'potion' ? 'Potion' : 'Scroll'}
                      </Button>
                    )}

                    {/* Attunement */}
                    {requiresAttunement(selectedItem) && (
                      <>
                        {isAttuned(character, selectedItem) ? (
                          <Button
                            variant="outline"
                            className="w-full text-red-400 border-red-400/50 hover:bg-red-900/20"
                            onClick={() => onUnattuneItem?.(selectedItem)}
                          >
                            <Unlink className="h-4 w-4 mr-2" />
                            End Attunement
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full text-blue-400 border-blue-400/50 hover:bg-blue-900/20"
                            onClick={() => onAttuneItem?.(selectedItem)}
                            disabled={attunedCount >= MAX_ATTUNED_ITEMS}
                          >
                            <Link className="h-4 w-4 mr-2" />
                            Attune ({attunedCount}/{MAX_ATTUNED_ITEMS})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Backpack className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select an item to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
