import type { PlayerCharacter, SkillName } from '@/types';
import { getSkillModifier, SKILL_ABILITY_MAP } from '@/utils/skillUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';

interface SkillListProps {
    character: PlayerCharacter;
}

export function SkillList({ character }: SkillListProps) {
    const skills = Object.keys(SKILL_ABILITY_MAP).sort() as SkillName[];

    return (
        <div className="rounded-2xl border border-fantasy-purple/40 bg-black/30 p-0 shadow-inner">
            <div className="flex items-center gap-2 border-b border-fantasy-purple/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                <Brain className="h-4 w-4 text-fantasy-gold" />
                Skills
            </div>
            <ScrollArea className="h-[460px] px-5 py-3">
                <div className="space-y-1">
                    {skills.map((skill) => {
                        const mod = getSkillModifier(character, skill);
                        const skillData = character.skills[skill];
                        const isProficient = skillData?.proficient;
                        const isExpertise = skillData?.expertise;
                        const ability = SKILL_ABILITY_MAP[skill];

                        return (
                            <div
                                key={skill}
                                className={`flex items-center justify-between rounded-xl border border-transparent px-2 py-1 text-sm ${isProficient
                                    ? 'bg-fantasy-purple/10 border-fantasy-purple/40 text-white'
                                    : 'text-muted-foreground'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] uppercase tracking-[0.3em] text-fantasy-gold/70 w-8">
                                        {ability.substring(0, 3)}
                                    </span>
                                    <span className="capitalize flex items-center gap-2">
                                        {skill.replace(/-/g, ' ')}
                                        {isExpertise && (
                                            <Badge variant="gold" className="h-4 px-1 text-[9px]">EXP</Badge>
                                        )}
                                    </span>
                                </div>
                                <span className={`font-mono text-base font-semibold ${isProficient ? 'text-fantasy-gold' : 'text-muted-foreground'}`}>
                                    {mod >= 0 ? `+${mod}` : mod}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
