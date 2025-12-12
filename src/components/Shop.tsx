import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
    ShoppingBag, Coins, X, Sword, Shield, Heart, Scroll, Gem,
    ChevronDown, ChevronRight, ArrowRightLeft, Crown, Hand, Footprints, CircleDot
} from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import type { Item } from '@/types';
import itemsData from '@/content/items.json';
import { cn } from '@/lib/utils';
import { isArmorProficient, isWeaponProficient } from '@/utils/characterStats';

const createShopItemInstance = (item: Item): Item => {
    const uniqueSuffix =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return {
        ...item,
        id: `${item.id}-${uniqueSuffix}`,
        templateId: item.id,
    };
};

interface ShopProps {
    onClose: () => void;
}

// Helper to get item icon
const getItemIcon = (type: Item['type']) => {
    switch (type) {
        case 'weapon': return <Sword className="h-4 w-4" />;
        case 'armor': case 'shield': return <Shield className="h-4 w-4" />;
        case 'potion': return <Heart className="h-4 w-4 text-red-400" />;
        case 'scroll': return <Scroll className="h-4 w-4 text-amber-300" />;
        case 'treasure': return <Gem className="h-4 w-4" />;
        default: return <ShoppingBag className="h-4 w-4" />;
    }
};

export function Shop({ onClose }: ShopProps) {
    const { character, updateCharacter, addItem } = useGame();
    const [selectedShopItem, setSelectedShopItem] = useState<Item | null>(null);
    const [selectedSellItem, setSelectedSellItem] = useState<Item | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['potions', 'weapons', 'armor'])
    );

    if (!character) return null;
    const currentGold = character.gold ?? 0;

    // Shop Inventory categorized
    const shopPotions = (itemsData.potions as Item[]) || [];
    const shopWeapons = ((itemsData.weapons as Item[]) || []).filter(w => w.value && w.value <= 100);
    const shopArmor = ((itemsData.armor as Item[]) || []).filter(a => a.value && a.value <= 100);
    const shopHelmets = ((itemsData.helmets as Item[]) || []).filter(h => h.value && h.value <= 100);
    const shopGloves = ((itemsData.gloves as Item[]) || []).filter(g => g.value && g.value <= 100);
    const shopBoots = ((itemsData.boots as Item[]) || []).filter(b => b.value && b.value <= 100);
    const shopAmulets = ((itemsData.amulets as Item[]) || []).filter(a => a.value && a.value <= 200);
    const shopRings = ((itemsData.rings as Item[]) || []).filter(r => r.value && r.value <= 100);
    const shopShields = ((itemsData.shields as Item[]) || []).filter(s => s.value && s.value <= 100);

    // Player inventory for selling
    const playerInventory = character.inventory || [];

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

    const handleBuy = (itemTemplate: Item) => {
        if (currentGold < (itemTemplate.value || 0)) {
            showNotification("Not enough gold!");
            return;
        }

        const newItem = createShopItemInstance(itemTemplate);
        updateCharacter(prev => ({
            ...prev,
            gold: (prev.gold ?? 0) - (itemTemplate.value || 0)
        }));
        addItem(newItem);
        showNotification(`Bought ${itemTemplate.name}!`);
    };

    const handleSell = (item: Item) => {
        const sellValue = Math.floor((item.value || 0) / 2);

        updateCharacter(prev => ({
            ...prev,
            gold: (prev.gold ?? 0) + sellValue,
            inventory: prev.inventory?.filter(i => i.id !== item.id)
        }));

        // If equipped, unequip it
        if (character.equippedWeapon?.id === item.id) {
            updateCharacter(prev => ({ ...prev, equippedWeapon: undefined }));
        }
        if (character.equippedArmor?.id === item.id) {
            updateCharacter(prev => ({ ...prev, equippedArmor: undefined }));
        }

        showNotification(`Sold ${item.name} for ${sellValue}g!`);
        setSelectedSellItem(null);
    };

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 2000);
    };

    // Category Section for shop items
    const ShopCategory = ({
        title,
        icon,
        items,
        categoryKey
    }: {
        title: string;
        icon: React.ReactNode;
        items: Item[];
        categoryKey: string;
    }) => {
        const isExpanded = expandedCategories.has(categoryKey);

        if (items.length === 0) return null;

        return (
            <div className="border-b border-fantasy-purple/20 last:border-0">
                <button
                    className="w-full flex items-center gap-2 p-3 hover:bg-fantasy-purple/10 transition-colors"
                    onClick={() => toggleCategory(categoryKey)}
                >
                    {icon}
                    <span className="font-semibold flex-1 text-left">{title}</span>
                    <Badge variant="outline" className="text-xs">{items.length}</Badge>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {isExpanded && (
                    <div className="pb-2 space-y-1">
                        {items.map(item => {
                            const isSelected = selectedShopItem?.id === item.id;
                            const canAfford = currentGold >= (item.value || 0);

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "mx-2 px-3 py-2 rounded-md cursor-pointer transition-all",
                                        "flex items-center gap-2",
                                        isSelected
                                            ? "bg-fantasy-gold/20 ring-1 ring-fantasy-gold"
                                            : "hover:bg-fantasy-purple/10",
                                        !canAfford && "opacity-50"
                                    )}
                                    onClick={() => setSelectedShopItem(item)}
                                >
                                    {getItemIcon(item.type)}
                                    <span className="flex-1 text-sm truncate">{item.name}</span>
                                    <span className={cn(
                                        "text-sm font-medium",
                                        canAfford ? "text-fantasy-gold" : "text-red-400"
                                    )}>
                                        {item.value}g
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 fade-in">
            <Card className="w-full max-w-6xl solid-panel max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <CardHeader className="border-b border-fantasy-purple/20 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-fantasy-gold/20 rounded-full">
                                <ShoppingBag className="h-6 w-6 text-fantasy-gold" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-fantasy">Village Merchant</CardTitle>
                                <p className="text-sm text-muted-foreground italic">
                                    "Got some rare things on sale, stranger!"
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="gold" className="text-lg px-4 py-2 font-medium">
                                <Coins className="h-4 w-4 mr-2" />
                                {currentGold}g
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* Notification */}
                {notification && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-fantasy-gold text-black px-6 py-2 rounded-full font-bold animate-bounce z-50 shadow-lg">
                        {notification}
                    </div>
                )}

                {/* Main Content - 3 Column Layout */}
                <div className="flex-1 overflow-hidden">
                    <div className="grid grid-cols-12 h-full max-h-[calc(90vh-120px)] divide-x divide-fantasy-purple/20">

                        {/* Left Column - Your Inventory to Sell */}
                        <div className="col-span-4 overflow-y-auto bg-fantasy-dark-bg/50 max-h-[calc(90vh-120px)]">
                            <div className="sticky top-0 bg-fantasy-dark-card border-b border-fantasy-purple/20 p-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Coins className="h-4 w-4" />
                                    Your Items
                                </h3>
                            </div>

                            {playerInventory.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Your inventory is empty</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {playerInventory.map(item => {
                                        const isSelected = selectedSellItem?.id === item.id;
                                        const sellValue = Math.floor((item.value || 0) / 2);
                                        const isEquipped = item.id === character.equippedWeapon?.id ||
                                            item.id === character.equippedArmor?.id;

                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "px-3 py-2 rounded-md cursor-pointer transition-all",
                                                    "flex items-center gap-2",
                                                    isSelected
                                                        ? "bg-red-400/20 ring-1 ring-red-400"
                                                        : "hover:bg-fantasy-purple/10",
                                                    isEquipped && "border-l-2 border-fantasy-gold"
                                                )}
                                                onClick={() => {
                                                    setSelectedSellItem(item);
                                                    setSelectedShopItem(null);
                                                }}
                                            >
                                                {getItemIcon(item.type)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm truncate">{item.name}</p>
                                                    {isEquipped && (
                                                        <p className="text-[10px] text-fantasy-gold">Equipped</p>
                                                    )}
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {sellValue}g
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Center Column - Item Details */}
                        <div className="col-span-4 p-4 overflow-y-auto bg-fantasy-dark-card/50 max-h-[calc(90vh-120px)]">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                <ArrowRightLeft className="h-4 w-4" />
                                Trade
                            </h3>

                            {selectedShopItem ? (
                                <div className="space-y-4">
                                    {/* Buy Section */}
                                    <div className="p-4 rounded-lg border border-fantasy-gold/30 bg-fantasy-gold/5">
                                        <div className="text-center pb-4 border-b border-fantasy-gold/20">
                                            <div className="w-14 h-14 mx-auto mb-3 rounded-lg bg-fantasy-dark-card border border-fantasy-gold/30 flex items-center justify-center">
                                                {getItemIcon(selectedShopItem.type)}
                                            </div>
                                            <h4 className="text-lg font-semibold text-fantasy-gold">
                                                {selectedShopItem.name}
                                            </h4>
                                            <p className="text-sm text-muted-foreground capitalize">
                                                {selectedShopItem.type}
                                            </p>
                                        </div>

                                        <div className="space-y-2 py-3">
                                            {selectedShopItem.damage && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Damage</span>
                                                    <span className="text-red-400 font-medium">{selectedShopItem.damage}</span>
                                                </div>
                                            )}
                                            {selectedShopItem.armorClass !== undefined && selectedShopItem.armorClass > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Armor Class</span>
                                                    <span className="text-blue-400 font-medium">+{selectedShopItem.armorClass}</span>
                                                </div>
                                            )}
                                            {(selectedShopItem.subtype || selectedShopItem.armorType) && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Type</span>
                                                    <span className="text-cyan-400 font-medium capitalize">
                                                        {selectedShopItem.subtype || (selectedShopItem.armorType === 'shield' ? 'Shield' : `${selectedShopItem.armorType} Armor`)}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedShopItem.healing && selectedShopItem.healing > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Healing</span>
                                                    <span className="text-green-400 font-medium">+{selectedShopItem.healing} HP</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Weapon Proficiency Warning */}
                                        {selectedShopItem.type === 'weapon' && !isWeaponProficient(character, selectedShopItem) && (
                                            <div className="pt-2 border-t border-red-500/30">
                                                <div className="flex items-start gap-2 text-sm bg-red-500/10 rounded-md p-2">
                                                    <Sword className="h-4 w-4 text-red-400 mt-0.5" />
                                                    <div>
                                                        <span className="text-red-400 font-medium">Not Proficient</span>
                                                        <p className="text-red-300/70 text-xs mt-1">
                                                            You won't add your proficiency bonus to attacks.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Armor Proficiency Warning */}
                                        {(selectedShopItem.type === 'armor' || selectedShopItem.type === 'shield') &&
                                            selectedShopItem.armorType &&
                                            !isArmorProficient(character, selectedShopItem.armorType) && (
                                                <div className="pt-2 border-t border-red-500/30">
                                                    <div className="flex items-start gap-2 text-sm bg-red-500/10 rounded-md p-2">
                                                        <Shield className="h-4 w-4 text-red-400 mt-0.5" />
                                                        <div>
                                                            <span className="text-red-400 font-medium">Not Proficient</span>
                                                            <p className="text-red-300/70 text-xs mt-1">
                                                                Disadvantage on STR/DEX checks, attacks, saves, and can't cast spells.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        <p className="text-sm text-muted-foreground py-2 border-t border-fantasy-gold/20">
                                            {selectedShopItem.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-3 border-t border-fantasy-gold/20">
                                            <span className="text-lg font-bold text-fantasy-gold">
                                                {selectedShopItem.value}g
                                            </span>
                                            <Button
                                                variant="fantasy"
                                                onClick={() => handleBuy(selectedShopItem)}
                                                disabled={currentGold < (selectedShopItem.value || 0)}
                                            >
                                                Buy Item
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : selectedSellItem ? (
                                <div className="space-y-4">
                                    {/* Sell Section */}
                                    <div className="p-4 rounded-lg border border-red-400/30 bg-red-400/5">
                                        <div className="text-center pb-4 border-b border-red-400/20">
                                            <div className="w-14 h-14 mx-auto mb-3 rounded-lg bg-fantasy-dark-card border border-red-400/30 flex items-center justify-center">
                                                {getItemIcon(selectedSellItem.type)}
                                            </div>
                                            <h4 className="text-lg font-semibold text-red-400">
                                                {selectedSellItem.name}
                                            </h4>
                                            <p className="text-sm text-muted-foreground capitalize">
                                                {selectedSellItem.type}
                                            </p>
                                        </div>

                                        <div className="space-y-2 py-3">
                                            {selectedSellItem.damage && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Damage</span>
                                                    <span className="text-red-400 font-medium">{selectedSellItem.damage}</span>
                                                </div>
                                            )}
                                            {selectedSellItem.armorClass && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Armor Class</span>
                                                    <span className="text-blue-400 font-medium">+{selectedSellItem.armorClass}</span>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm text-muted-foreground py-2 border-t border-red-400/20">
                                            {selectedSellItem.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-3 border-t border-red-400/20">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Sell Value (50%)</p>
                                                <span className="text-lg font-bold text-fantasy-gold">
                                                    {Math.floor((selectedSellItem.value || 0) / 2)}g
                                                </span>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleSell(selectedSellItem)}
                                            >
                                                Sell Item
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Select an item to buy or sell</p>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Shop Items For Sale */}
                        <div className="col-span-4 overflow-y-auto bg-fantasy-dark-surface/50 max-h-[calc(90vh-120px)]">
                            <div className="sticky top-0 bg-fantasy-dark-card border-b border-fantasy-purple/20 p-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4" />
                                    For Sale
                                </h3>
                            </div>

                            <div className="divide-y divide-fantasy-purple/10">
                                <ShopCategory
                                    title="Potions"
                                    icon={<Heart className="h-4 w-4 text-red-400" />}
                                    items={shopPotions}
                                    categoryKey="potions"
                                />
                                <ShopCategory
                                    title="Weapons"
                                    icon={<Sword className="h-4 w-4 text-orange-400" />}
                                    items={shopWeapons}
                                    categoryKey="weapons"
                                />
                                <ShopCategory
                                    title="Armor"
                                    icon={<Shield className="h-4 w-4 text-blue-400" />}
                                    items={shopArmor}
                                    categoryKey="armor"
                                />
                                <ShopCategory
                                    title="Helmets"
                                    icon={<Crown className="h-4 w-4 text-amber-400" />}
                                    items={shopHelmets}
                                    categoryKey="helmets"
                                />
                                <ShopCategory
                                    title="Gloves"
                                    icon={<Hand className="h-4 w-4 text-gray-400" />}
                                    items={shopGloves}
                                    categoryKey="gloves"
                                />
                                <ShopCategory
                                    title="Boots"
                                    icon={<Footprints className="h-4 w-4 text-amber-600" />}
                                    items={shopBoots}
                                    categoryKey="boots"
                                />
                                <ShopCategory
                                    title="Amulets"
                                    icon={<CircleDot className="h-4 w-4 text-purple-400" />}
                                    items={shopAmulets}
                                    categoryKey="amulets"
                                />
                                <ShopCategory
                                    title="Rings"
                                    icon={<CircleDot className="h-4 w-4 text-yellow-400" />}
                                    items={shopRings}
                                    categoryKey="rings"
                                />
                                <ShopCategory
                                    title="Shields"
                                    icon={<Shield className="h-4 w-4 text-slate-400" />}
                                    items={shopShields}
                                    categoryKey="shields"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
