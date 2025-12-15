import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Backpack, X, Flame, FlaskConical, Scroll, Pin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Item } from '@/types';
import { getItemIconSrc, hasItemIcon } from '@/data/itemIcons';

interface CombatInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventory: Item[];
    torchOilAvailable: boolean;
    onUseTorchOil: () => void;
    onUsePotion: (item: Item) => void;
    onUseScroll: (item: Item) => void;
}

export function CombatInventoryModal({
    isOpen,
    onClose,
    inventory,
    torchOilAvailable,
    onUseTorchOil,
    onUsePotion,
    onUseScroll,
}: CombatInventoryModalProps) {
    if (!isOpen) return null;

    const pinnedItems = inventory.filter(i => i.pinned);
    const potions = inventory.filter(i => i.type === 'potion' && !i.pinned);
    const scrolls = inventory.filter(i => i.type === 'scroll' && !i.pinned);
    const hasNoUsableItems = !torchOilAvailable && pinnedItems.length === 0 && potions.length === 0 && scrolls.length === 0;

    const getIcon = (item: Item) => {
        const itemId = item.templateId || item.id;
        if (hasItemIcon(itemId)) {
            return (
                <img
                    src={getItemIconSrc(itemId)}
                    alt={item.name}
                    className="h-6 w-6 object-contain"
                />
            );
        }
        if (item.type === 'potion') return <FlaskConical className="h-5 w-5 text-red-400" />;
        if (item.type === 'scroll') return <Scroll className="h-5 w-5 text-yellow-600" />;
        return <Sparkles className="h-5 w-5 text-fantasy-gold" />;
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-md w-full relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-4 -right-4 z-10 bg-fantasy-dark-card/80 text-white hover:text-fantasy-gold rounded-full border border-fantasy-gold/40"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>

                <Card variant="plain" className="bg-fantasy-dark-card border border-fantasy-purple/40 shadow-2xl overflow-hidden text-foreground rounded-3xl">
                    <CardHeader className="bg-gradient-to-r from-black/70 via-fantasy-purple/30 to-black/70 border-b border-fantasy-purple/40 pb-4">
                        <CardTitle className="text-xl flex items-center gap-3 justify-center text-fantasy-gold">
                            <Backpack className="h-5 w-5 text-fantasy-gold" />
                            Quick Items
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-center text-sm">
                            Use potions, scrolls, and consumables during combat
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4">
                        <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-4">
                                {/* Torch Oil */}
                                {torchOilAvailable && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Special Items</p>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start bg-orange-950/20 border-orange-500/30 hover:bg-orange-950/40"
                                            onClick={() => {
                                                onUseTorchOil();
                                                onClose();
                                            }}
                                        >
                                            <Flame className="mr-3 h-5 w-5 text-orange-500" />
                                            <span className="flex-1 text-left">Use Torch Oil</span>
                                            <Badge variant="secondary" className="ml-2 text-xs">+1d6 Fire</Badge>
                                        </Button>
                                    </div>
                                )}

                                {/* Pinned Items */}
                                {pinnedItems.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                                            <Pin className="h-3 w-3 text-fantasy-gold" /> Pinned Items
                                        </p>
                                        <div className="grid gap-2">
                                            {pinnedItems.map(item => {
                                                const isPotion = item.type === 'potion';
                                                const isScroll = item.type === 'scroll';
                                                const isUsable = isPotion || isScroll;

                                                return (
                                                    <Button
                                                        key={`pinned-${item.id}`}
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start border-fantasy-gold/50 bg-fantasy-gold/5 hover:bg-fantasy-gold/10",
                                                            !isUsable && "opacity-50 cursor-not-allowed"
                                                        )}
                                                        disabled={!isUsable}
                                                        onClick={() => {
                                                            if (isPotion) onUsePotion(item);
                                                            if (isScroll) onUseScroll(item);
                                                            onClose();
                                                        }}
                                                    >
                                                        <div className="mr-3">{getIcon(item)}</div>
                                                        <span className={cn("flex-1 text-left", !isUsable && "text-muted-foreground")}>{item.name}</span>
                                                        {!isUsable && <span className="text-[10px] italic opacity-70">(Cannot use)</span>}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Potions */}
                                {potions.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                                            <FlaskConical className="h-3 w-3 text-red-400" /> Potions
                                        </p>
                                        <div className="grid gap-2">
                                            {potions.map(item => (
                                                <Button
                                                    key={item.id}
                                                    variant="outline"
                                                    className="w-full justify-start bg-red-950/10 border-red-500/30 hover:bg-red-950/30"
                                                    onClick={() => {
                                                        onUsePotion(item);
                                                        onClose();
                                                    }}
                                                >
                                                    <div className="mr-3">{getIcon(item)}</div>
                                                    <span className="flex-1 text-left">{item.name}</span>
                                                    {item.healing && (
                                                        <Badge variant="secondary" className="ml-2 text-xs bg-red-900/50 text-red-200">
                                                            {item.healing}
                                                        </Badge>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Scrolls */}
                                {scrolls.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                                            <Scroll className="h-3 w-3 text-yellow-600" /> Scrolls
                                        </p>
                                        <div className="grid gap-2">
                                            {scrolls.map(item => (
                                                <Button
                                                    key={item.id}
                                                    variant="outline"
                                                    className="w-full justify-start bg-yellow-950/10 border-yellow-500/30 hover:bg-yellow-950/30"
                                                    onClick={() => {
                                                        onUseScroll(item);
                                                        onClose();
                                                    }}
                                                >
                                                    <div className="mr-3">{getIcon(item)}</div>
                                                    <span className="flex-1 text-left">{item.name}</span>
                                                    {item.description && (
                                                        <Badge variant="secondary" className="ml-2 text-xs bg-yellow-900/50 text-yellow-200 max-w-24 truncate">
                                                            {item.description.substring(0, 20)}...
                                                        </Badge>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* No Items Message */}
                                {hasNoUsableItems && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Backpack className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No usable items found</p>
                                        <p className="text-xs opacity-70 mt-1">Find potions and scrolls during your adventure</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
