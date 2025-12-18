import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { LevelUpModal } from './LevelUpModal';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { getAvailableMulticlassOptions, canLeaveCurrentClass, MULTICLASS_PREREQUISITES } from '@/data/multiclass';
import characterCreationContent from '@/content/characterCreation.json';
import type { Class } from '@/types';

/**
 * Test page for feature development and manual testing.
 * Access at /test
 */
export function TestPage() {
    const { character, confirmLevelUp, gainXp } = useGame();
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [selectedMulticlassId, setSelectedMulticlassId] = useState<string | null>(null);

    // Calculate multiclass options
    const allClasses = characterCreationContent.classes as Class[];
    const multiclassOptions = character
        ? allClasses
            .filter(c => c.id !== character.class.id)
            .map(c => {
                const available = getAvailableMulticlassOptions(character, allClasses);
                const meetsPrereqs = available.some(ac => ac.id === c.id);
                const prereqs = MULTICLASS_PREREQUISITES[c.id.toLowerCase()];
                let prereqReason = '';
                if (!meetsPrereqs && prereqs) {
                    const needed = Object.entries(prereqs)
                        .filter(([k, v]) => k !== 'orCondition' && typeof v === 'number')
                        .map(([k, v]) => `${k.toUpperCase()} ${v}`);
                    prereqReason = `Requires ${needed.join(prereqs.orCondition ? ' or ' : ' and ')}`;
                }
                return { class: c, meetsPrereqs, prereqReason };
            })
        : [];

    const canLeave = character ? canLeaveCurrentClass(character) : false;

    if (!character) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="scroll-parchment max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-fantasy-gold">Test Page</CardTitle>
                        <CardDescription>Create a character first to test features.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <h1 className="text-3xl font-bold text-fantasy-gold font-cinzel">Feature Testing</h1>

            {/* Character Info */}
            <Card className="scroll-parchment">
                <CardHeader>
                    <CardTitle>Current Character</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p><strong>{character.name}</strong> - {character.race.name} {character.class.name}</p>
                    <div className="flex gap-2">
                        <Badge variant="gold">Level {character.level}</Badge>
                        <Badge variant="outline">XP: {character.xp}/{character.maxXp}</Badge>
                        <Badge variant="outline">HP: {character.hitPoints}/{character.maxHitPoints}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Classes: {character.classes?.map(c => `${c.class.name} ${c.level}`).join(' / ') || `${character.class.name} ${character.level}`}
                    </div>
                </CardContent>
            </Card>

            {/* Level Up Test */}
            <Card className="scroll-parchment">
                <CardHeader>
                    <CardTitle>🔀 Multiclassing / Level Up Test</CardTitle>
                    <CardDescription>
                        Test the level up modal with multiclass options.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3 flex-wrap">
                        <Button variant="fantasy" onClick={() => setShowLevelUpModal(true)}>
                            Open Level Up Modal
                        </Button>
                        <Button variant="outline" onClick={() => gainXp(100)}>
                            +100 XP
                        </Button>
                        <Button variant="outline" onClick={() => gainXp(500)}>
                            +500 XP
                        </Button>
                        <Button variant="outline" onClick={() => gainXp(1000)}>
                            +1000 XP (Trigger Level Up)
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Note: After gaining enough XP, return to Camp to see the real level-up flow.
                    </p>
                </CardContent>
            </Card>

            {/* Future tests can be added here */}
            <Card className="scroll-parchment border-dashed">
                <CardHeader>
                    <CardTitle className="text-muted-foreground">More Tests Coming Soon</CardTitle>
                    <CardDescription>
                        Add more test sections here for other features.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Level Up Modal (for direct testing) */}
            <LevelUpModal
                isOpen={showLevelUpModal}
                level={character.level + 1}
                hpIncrease={Math.floor(parseInt(character.class.hitDie?.replace('d', '') || '8') / 2) + 1 + Math.floor((character.abilityScores.constitution - 10) / 2)}
                talents={[]}
                selectedTalentId={null}
                onSelectTalent={() => { }}
                currentClassName={character.class.name}
                multiclassOptions={multiclassOptions}
                selectedMulticlassId={selectedMulticlassId}
                onSelectMulticlass={setSelectedMulticlassId}
                canLeaveCurrentClass={canLeave}
                onConfirm={() => {
                    confirmLevelUp(selectedMulticlassId);
                    setSelectedMulticlassId(null);
                    setShowLevelUpModal(false);
                }}
            />
        </div>
    );
}
