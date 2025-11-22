import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { calculateShortRestHealing, calculateLongRestRecovery } from '@/utils/restMechanics';
import { calculateAbilityModifier } from '@/utils/characterStats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Moon, Sun, X } from 'lucide-react';

interface RestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RestModal({ isOpen, onClose }: RestModalProps) {
    const { character, updateCharacter, addJournalEntry } = useGame();
    const [activeTab, setActiveTab] = useState<string>('short');
    const [healingRoll, setHealingRoll] = useState<string | null>(null);

    if (!isOpen || !character) return null;

    const defaultHitDice = {
        current: character.hitDice?.current ?? character.level,
        max: character.hitDice?.max ?? character.level,
        die: character.hitDice?.die ?? character.class.hitDie ?? 'd8'
    };
    const conMod = calculateAbilityModifier(character.abilityScores.constitution);

    const handleShortRest = () => {
        if (defaultHitDice.current <= 0) return;
        if (character.hitPoints >= character.maxHitPoints) return;

        const healing = calculateShortRestHealing(defaultHitDice.die, conMod);
        const newHp = Math.min(character.maxHitPoints, character.hitPoints + healing);

        setHealingRoll(`Rolled ${healing - conMod} + ${conMod} (CON) = ${healing} HP`);

        updateCharacter((prev) => ({
            ...prev,
            hitPoints: newHp,
            hitDice: {
                current: Math.max(0, (prev.hitDice?.current ?? defaultHitDice.current) - 1),
                max: prev.hitDice?.max ?? defaultHitDice.max,
                die: prev.hitDice?.die ?? defaultHitDice.die
            }
        }));

        addJournalEntry(`Took a short rest. Spent 1 Hit Die and recovered ${healing} HP.`);
    };

    const handleLongRest = () => {
        const recovered = calculateLongRestRecovery(character);
        updateCharacter(recovered);
        addJournalEntry('Took a long rest. HP, Hit Dice, and Spell Slots restored.');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-lg w-full relative text-white">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-4 -right-4 z-10 bg-fantasy-dark-card/80 text-white hover:text-fantasy-gold rounded-full border border-fantasy-gold/40"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>

                <Card variant="plain" className="bg-fantasy-dark-card border border-fantasy-purple/40 shadow-2xl overflow-hidden text-foreground rounded-3xl">
                    <CardHeader className="bg-gradient-to-r from-black/70 via-fantasy-purple/30 to-black/70 border-b border-fantasy-purple/40 pb-6">
                        <CardTitle className="text-2xl flex items-center gap-3 justify-center text-fantasy-gold">
                            <Moon className="h-6 w-6 text-fantasy-gold" />
                            Rest & Recovery
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-center">
                            Take a moment to bind your wounds and clear your mind.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-5">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 rounded-2xl border border-fantasy-purple/30 bg-black/40">
                                <TabsTrigger value="short" className="rounded-2xl text-sm uppercase tracking-[0.3em] data-[state=active]:bg-fantasy-gold data-[state=active]:text-black">
                                    <Sun className="h-4 w-4 mr-2" /> Short Rest
                                </TabsTrigger>
                                <TabsTrigger value="long" className="rounded-2xl text-sm uppercase tracking-[0.3em] data-[state=active]:bg-fantasy-gold data-[state=active]:text-black">
                                    <Moon className="h-4 w-4 mr-2" /> Long Rest
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="short" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                <div className="bg-black/40 p-4 rounded-2xl border border-fantasy-purple/40 space-y-4">
                                    <div className="flex justify-between items-center text-white">
                                        <span className="font-bold flex items-center gap-2">
                                            <Heart className="h-4 w-4 text-red-400" /> Current HP
                                        </span>
                                        <span className="font-mono font-bold text-lg">
                                            {character.hitPoints} <span className="text-muted-foreground text-sm">/ {character.maxHitPoints}</span>
                                        </span>
                                    </div>
                                    <Progress value={(character.hitPoints / character.maxHitPoints) * 100} className="h-3 bg-stone-200 [&>div]:bg-red-600" />
                                </div>

                                <div className="flex items-center justify-between bg-black/60 p-4 rounded-2xl border border-fantasy-purple/40">
                                    <div className="space-y-1">
                                        <div className="font-bold text-xs uppercase tracking-[0.3em] text-muted-foreground">Hit Dice Available</div>
                                        <div className="text-2xl font-bold text-white">
                                            {defaultHitDice.current}
                                            {' '}
                                            <span className="text-sm text-muted-foreground">
                                                / {defaultHitDice.max} ({defaultHitDice.die})
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleShortRest}
                                        disabled={defaultHitDice.current <= 0 || character.hitPoints >= character.maxHitPoints}
                                        className="bg-fantasy-gold text-black hover:bg-fantasy-gold/90 disabled:bg-fantasy-gold/40"
                                    >
                                        Spend Hit Die
                                    </Button>
                                </div>

                                {healingRoll && (
                                    <div className="text-center p-2 bg-fantasy-purple/30 text-fantasy-gold rounded border border-fantasy-gold/40 text-sm font-medium animate-in zoom-in duration-200">
                                        {healingRoll}
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground text-center italic">
                                    A short rest takes 1 hour. You can spend Hit Dice to regain hit points.
                                </p>
                            </TabsContent>

                            <TabsContent value="long" className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                                <div className="space-y-4 text-sm text-muted-foreground">
                                    <div className="flex items-start gap-3 bg-black/40 p-3 rounded-2xl border border-fantasy-purple/40">
                                        <Badge variant="fantasy" className="mt-1">Restore</Badge>
                                        <p>Regain all lost Hit Points and Spell Slots.</p>
                                    </div>
                                    <div className="flex items-start gap-3 bg-black/40 p-3 rounded-2xl border border-fantasy-purple/40">
                                        <Badge variant="fantasy" className="mt-1">Recover</Badge>
                                        <p>Regain up to half your total Hit Dice.</p>
                                    </div>
                                    <div className="flex items-start gap-3 bg-black/40 p-3 rounded-2xl border border-fantasy-purple/40">
                                        <Badge variant="fantasy" className="mt-1">Refresh</Badge>
                                        <p>Reset daily abilities and class features.</p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleLongRest}
                                    className="w-full py-6 text-lg bg-fantasy-gold text-black hover:bg-fantasy-gold/90"
                                >
                                    <Moon className="mr-2 h-5 w-5" />
                                    Rest for 8 Hours
                                </Button>

                                <p className="text-xs text-muted-foreground text-center italic">
                                    You can only take one Long Rest per 24-hour period.
                                </p>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
