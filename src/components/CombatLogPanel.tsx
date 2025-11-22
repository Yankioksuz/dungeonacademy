import { useRef, useEffect } from 'react';
import type { CombatLogEntry } from '@/types';
import { downloadCombatLog } from '@/utils/exportCombatLog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    Sword,
    Shield,
    Heart,
    Skull,
    Zap,
    Info,
    Download,
    Sparkles,
    Activity,
    Clock
} from 'lucide-react';

interface CombatLogPanelProps {
    logs: CombatLogEntry[];
    className?: string;
}

export function CombatLogPanel({ logs, className }: CombatLogPanelProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when logs change
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleExport = () => {
        downloadCombatLog(logs, `combat-log-${new Date().toISOString().split('T')[0]}.txt`);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'attack': return <Sword className="h-4 w-4 text-red-400" />;
            case 'damage': return <Activity className="h-4 w-4 text-orange-500" />;
            case 'heal': return <Heart className="h-4 w-4 text-green-500" />;
            case 'miss': return <Shield className="h-4 w-4 text-stone-400" />;
            case 'defeat': return <Skull className="h-4 w-4 text-stone-500" />;
            case 'spell': return <Zap className="h-4 w-4 text-blue-400" />;
            case 'xp': return <Sparkles className="h-4 w-4 text-yellow-400" />;
            case 'levelup': return <Sparkles className="h-4 w-4 text-purple-400" />;
            case 'initiative': return <Clock className="h-4 w-4 text-stone-400" />;
            default: return <Info className="h-4 w-4 text-stone-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'attack': return 'bg-red-950/20 border-red-900/30';
            case 'damage': return 'bg-orange-950/20 border-orange-900/30';
            case 'heal': return 'bg-green-950/20 border-green-900/30';
            case 'miss': return 'bg-stone-900/40 border-stone-800';
            case 'defeat': return 'bg-stone-950/60 border-stone-800';
            case 'spell': return 'bg-blue-950/20 border-blue-900/30';
            case 'xp': return 'bg-yellow-950/20 border-yellow-900/30';
            case 'levelup': return 'bg-purple-950/20 border-purple-900/30';
            default: return 'bg-stone-900/20 border-stone-800/50';
        }
    };

    return (
        <Card className={cn("solid-panel flex h-full flex-col border-fantasy-purple/40", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base text-fantasy-gold flex items-center gap-2 tracking-[0.3em] uppercase">
                    <Activity className="h-4 w-4 text-fantasy-gold" />
                    Combat Log
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                    onClick={handleExport}
                    title="Export Log"
                >
                    <Download className="h-3 w-3" />
                </Button>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="flex-1 max-h-64 pr-2">
                    <div className="space-y-2 text-sm">
                        {logs.length === 0 && (
                            <div className="text-center text-muted-foreground text-xs italic py-4">
                                Combat started...
                            </div>
                        )}

                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className={`rounded-xl border px-3 py-2 text-sm ${getBgColor(log.type)} animate-in fade-in slide-in-from-left-1 duration-200`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 shrink-0 opacity-80">
                                        {getIcon(log.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="text-white font-semibold leading-tight">{log.message}</span>
                                            <span className="text-[10px] text-stone-500 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                        {log.details && (
                                            <div className="text-[11px] font-mono text-stone-300 bg-black/30 rounded px-2 py-1 inline-block">
                                                {log.details}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
