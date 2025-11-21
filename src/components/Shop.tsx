import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ShoppingBag, Coins, X } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import type { Item } from '@/types';
import itemsData from '@/content/items.json';

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

export function Shop({ onClose }: ShopProps) {
    const { character, updateCharacter, addItem } = useGame();
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [notification, setNotification] = useState<string | null>(null);

    if (!character) return null;
    const currentGold = character.gold ?? 0;

    // Shop Inventory (Simplified: Infinite stock of basic items)
    const shopInventory: Item[] = [
        ...itemsData.potions,
        ...itemsData.weapons.filter(w => w.value && w.value <= 50), // Only basic weapons
        ...itemsData.armor.filter(a => a.value && a.value <= 50),   // Only basic armor
    ] as Item[];

    const handleBuy = (itemTemplate: Item) => {
        if (currentGold < (itemTemplate.value || 0)) {
            showNotification("Not enough gold!");
            return;
        }

        // Create new item instance
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
    };

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 fade-in">
            <Card className="w-full max-w-4xl h-[80vh] flex flex-col border-fantasy-gold bg-fantasy-dark-card">
                <CardHeader className="border-b border-fantasy-purple/30 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-fantasy-gold/20 rounded-full">
                                <ShoppingBag className="h-6 w-6 text-fantasy-gold" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Village Merchant</CardTitle>
                                <CardDescription>
                                    "Got some rare things on sale, stranger!"
                                </CardDescription>
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

                <CardContent className="flex-1 overflow-hidden pt-6">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buy' | 'sell')} className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="buy">Buy Items</TabsTrigger>
                            <TabsTrigger value="sell">Sell Loot</TabsTrigger>
                        </TabsList>

                        {notification && (
                            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-fantasy-gold text-black px-4 py-2 rounded-full font-bold animate-bounce z-50 shadow-lg">
                                {notification}
                            </div>
                        )}

                        <TabsContent value="buy" className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {shopInventory.map((item) => (
                                        <Card key={item.id} className="flex flex-col justify-between hover:border-fantasy-gold transition-colors">
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-base">{item.name}</CardTitle>
                                                    <Badge variant="outline" className="text-fantasy-gold border-fantasy-gold">
                                                        {item.value}g
                                                    </Badge>
                                                </div>
                                                <CardDescription className="text-xs line-clamp-2">
                                                    {item.description}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="fantasy"
                                                        onClick={() => handleBuy(item)}
                                                        disabled={character.gold < (item.value || 0)}
                                                    >
                                                        Buy
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="sell" className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full pr-4">
                                {(!character.inventory || character.inventory.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <ShoppingBag className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Your inventory is empty.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {character.inventory.map((item) => (
                                            <Card key={item.id} className="flex flex-col justify-between hover:border-red-400 transition-colors">
                                                <CardHeader className="pb-2">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-base">{item.name}</CardTitle>
                                                        <Badge variant="secondary">
                                                            Sell: {Math.floor((item.value || 0) / 2)}g
                                                        </Badge>
                                                    </div>
                                                    <CardDescription className="text-xs line-clamp-2">
                                                        {item.description}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="pt-0">
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleSell(item)}
                                                        >
                                                            Sell
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
