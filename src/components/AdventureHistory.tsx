import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Trophy, Skull, Flag, Trash2 } from 'lucide-react';

export function AdventureHistory() {
    const { character, deleteHistoryEntry } = useGame();
    const history = character?.adventureHistory || [];
    const [deletingId, setDeletingId] = useState<string | null>(null);

    if (history.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                <p>No adventures recorded in the archives yet.</p>
                <p className="text-sm mt-2">Complete quests to write your legend!</p>
            </div>
        );
    }

    const handleDelete = (entryId: string) => {
        deleteHistoryEntry(entryId);
        setDeletingId(null);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {history.map((entry) => (
                <Card key={entry.id} className="bg-black/40 border-fantasy-purple/30 hover:border-fantasy-gold/50 transition-colors">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <CardTitle className="text-lg text-fantasy-gold">{entry.adventureTitle}</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{new Date(entry.completedAt).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>Level {entry.levelAtCompletion}</span>
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={
                                    entry.outcome === 'success' ? 'gold' :
                                        entry.outcome === 'failure' ? 'destructive' : 'outline'
                                } className="capitalize">
                                    {entry.outcome === 'success' && <Trophy className="w-3 h-3 mr-1" />}
                                    {entry.outcome === 'failure' && <Skull className="w-3 h-3 mr-1" />}
                                    {entry.outcome === 'abandoned' && <Flag className="w-3 h-3 mr-1" />}
                                    {entry.outcome}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                                    onClick={() => setDeletingId(entry.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-300 italic border-l-2 border-white/10 pl-3 py-1">
                            "{entry.summary}"
                        </p>
                    </CardContent>
                </Card>
            ))}

            {deletingId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="max-w-md w-full bg-fantasy-dark-card border border-red-500/40 rounded-lg p-6 space-y-4">
                        <h3 className="text-xl font-bold text-red-400">Delete History Entry?</h3>
                        <p className="text-sm text-muted-foreground">
                            This will permanently remove this adventure from your history. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setDeletingId(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleDelete(deletingId)}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
