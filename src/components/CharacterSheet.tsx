import { useState } from 'react';
import type { PlayerCharacter } from '@/types';
import {
    calculateAbilityModifier,
    calculateArmorClass,
    calculateInitiative,
    calculatePassiveScore,
    calculateProficiencyBonus,
    calculateSpeed,
    getSavingThrowModifier,
} from '@/utils/characterStats';
import { SkillList } from './SkillList';
import { ConditionList } from './ConditionList';
import { portraits } from '@/data/portraits';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Shield,
    Zap,
    Heart,
    Swords,
    Eye,
    Footprints,
    Backpack,
    Scroll,
    Dna
} from 'lucide-react';
import spellsData from '@/content/spells.json';
import feats from '@/content/feats.json';

interface CharacterSheetProps {
    character: PlayerCharacter;
}

export function CharacterSheet({ character }: CharacterSheetProps) {
    const [activeTab, setActiveTab] = useState("equipment");
    const proficiencyBonus = calculateProficiencyBonus(character.level);
    const armorClass = calculateArmorClass(character);
    const initiative = calculateInitiative(character);
    const passivePerception = calculatePassiveScore(character, 'Perception');
    const characterPortrait = character.portraitId
        ? portraits.find((portrait) => portrait.id === character.portraitId)
        : undefined;

    // Calculate XP progress
    const xpProgress = (character.xp / character.maxXp) * 100;
    const slotEntries = character.spellSlots
        ? Object.entries(character.spellSlots).sort(([a], [b]) => Number(a) - Number(b))
        : [];
    const getSpellById = (id: string) => spellsData.find((s) => s.id === id);
    const preparedSpells = (character.preparedSpells || [])
        .map(getSpellById)
        .filter((spell): spell is typeof spellsData[number] => Boolean(spell));
    const knownSpellsDetailed = (character.knownSpells || [])
        .map(getSpellById)
        .filter((spell): spell is typeof spellsData[number] => Boolean(spell));

    const abilities: (keyof PlayerCharacter['abilityScores'])[] = [
        'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'
    ];

    return (
        <div className="scroll-parchment rounded-3xl border border-fantasy-gold/40 p-6 shadow-fantasy text-foreground space-y-6">
            {/* Hero header */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative mx-auto sm:mx-0">
                        <div className="h-32 w-32 overflow-hidden rounded-2xl border-2 border-fantasy-gold/50 bg-black/40 shadow-lg shadow-black/60">
                            {characterPortrait ? (
                                <img
                                    src={characterPortrait.src}
                                    alt={characterPortrait.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-fantasy-gold/70">
                                    {character.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <Badge variant="gold" className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs uppercase shadow-gold whitespace-nowrap tracking-[0.3em] font-semibold">
                            Level {character.level}
                        </Badge>
                    </div>
                    <div className="flex-1 space-y-3 text-center sm:text-left">
                        <div>
                            <h1 className="text-3xl font-fantasy text-white tracking-wider">{character.name}</h1>
                            <p className="text-sm uppercase tracking-[0.3em] text-fantasy-gold/70">{character.background.name}</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 text-xs sm:justify-start">
                            {[character.race.name, character.class.name].map((label) => (
                                <span
                                    key={label}
                                    className="rounded-full border border-fantasy-gold/30 bg-black/40 px-3 py-1 text-fantasy-gold tracking-wide"
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                <span>Experience</span>
                                <span>{character.xp} / {character.maxXp} XP</span>
                            </div>
                            <Progress value={xpProgress} className="h-2 bg-black/40" />
                        </div>
                    </div>
                </div>
                <div className="grid w-full grid-cols-3 gap-3 lg:max-w-xs">
                    {[
                        { icon: Shield, label: 'Armor Class', value: armorClass },
                        { icon: Zap, label: 'Initiative', value: initiative >= 0 ? `+${initiative}` : initiative },
                        { icon: Footprints, label: 'Speed', value: `${calculateSpeed(character)} ft` }
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex flex-col items-center rounded-2xl border border-fantasy-purple/30 bg-black/30 px-3 py-3 text-center shadow-inner">
                            <Icon className="mb-1 h-4 w-4 text-fantasy-gold" />
                            <span className="text-xl font-semibold text-white">{value}</span>
                            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Ability scores */}
                <div className="space-y-4 md:col-span-4">
                    <div className="space-y-3">
                        {abilities.map((ability) => {
                            const score = character.abilityScores[ability];
                            const mod = calculateAbilityModifier(score);
                            const saveMod = getSavingThrowModifier(character, ability);

                            return (
                                <div
                                    key={ability}
                                    className="flex items-center gap-3 rounded-2xl border border-fantasy-purple/30 bg-black/30 p-3 shadow-inner"
                                >
                                    <div className="flex w-16 flex-col items-center justify-center rounded-xl border border-fantasy-gold/30 bg-black/40 p-2">
                                        <span className="text-2xl font-bold text-white">
                                            {mod >= 0 ? `+${mod}` : mod}
                                        </span>
                                        <span className="text-[11px] font-semibold text-fantasy-gold/70">{score}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                                            {ability}
                                        </div>
                                        <div className="text-xs text-fantasy-gold">
                                            Save {saveMod >= 0 ? `+${saveMod}` : saveMod}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-fantasy-gold/40 bg-black/40 px-4 py-3 text-white shadow-inner">
                        <div className="flex items-center gap-3">
                            <Eye className="h-5 w-5 text-fantasy-gold" />
                            <span className="text-xs font-semibold uppercase tracking-[0.3em]">Passive Perception</span>
                        </div>
                        <span className="text-2xl font-bold text-fantasy-gold">{passivePerception}</span>
                    </div>
                </div>

                {/* Vitality + skills */}
                <div className="space-y-4 md:col-span-4">
                    <div className="rounded-2xl border border-fantasy-purple/40 bg-gradient-to-br from-black/50 via-fantasy-dark-card/40 to-black/20 p-5 shadow-inner">
                        <div className="mb-2 flex items-center justify-between text-sm uppercase tracking-[0.3em] text-muted-foreground">
                            <span className="flex items-center gap-2 font-semibold">
                                <Heart className="h-4 w-4 text-fantasy-gold" /> Hit Points
                            </span>
                            <span className="text-fantasy-gold">Hit Dice {character.level}{character.class.hitDie}</span>
                        </div>
                        <div className="flex items-baseline justify-between text-white">
                            <span className="text-4xl font-bold">{character.hitPoints}</span>
                            <span className="text-sm text-muted-foreground">/ {character.maxHitPoints} Max</span>
                        </div>
                        <Progress value={(character.hitPoints / character.maxHitPoints) * 100} className="mt-3 h-3 bg-black/60" />
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Proficiency +{proficiencyBonus}</span>
                            <span>Spell Slots: {character.spellSlots ? Object.values(character.spellSlots).reduce((acc, slot) => acc + slot.current, 0) : 0}</span>
                        </div>
                    </div>
                    <ConditionList character={character} />
                    <SkillList character={character} />
                </div>

                {/* Equipment + features */}
                <div className="md:col-span-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex w-full flex-wrap h-auto gap-2 rounded-2xl border border-fantasy-purple/40 bg-black/40 p-2">
                            <TabsTrigger value="equipment" className="flex-1 justify-center rounded-xl px-3 py-2 text-xs uppercase tracking-[0.15em] text-center">
                                <Backpack className="mr-2 h-4 w-4" /> Equipment
                            </TabsTrigger>
                            <TabsTrigger value="features" className="flex-1 justify-center rounded-xl px-3 py-2 text-xs uppercase tracking-[0.15em] text-center">
                                <Dna className="mr-2 h-4 w-4" /> Features
                            </TabsTrigger>
                            <TabsTrigger value="spells" className="flex-1 justify-center rounded-xl px-3 py-2 text-xs uppercase tracking-[0.15em] text-center">
                                <Scroll className="mr-2 h-4 w-4" /> Spells
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="equipment" className="mt-4 space-y-4">
                            <div className="rounded-2xl border border-fantasy-purple/30 bg-black/30 p-4">
                                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                    <Swords className="h-4 w-4 text-fantasy-gold" /> Weapons
                                </div>
                                {character.equippedWeapon ? (
                                    <div className="flex items-center justify-between text-sm text-white">
                                        <span className="font-semibold">{character.equippedWeapon.name}</span>
                                        <Badge variant="fantasy">{character.equippedWeapon.damage}</Badge>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">Unarmed</span>
                                )}
                            </div>

                            <div className="rounded-2xl border border-fantasy-purple/30 bg-black/30 p-4">
                                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                    <Shield className="h-4 w-4 text-fantasy-gold" /> Armor
                                </div>
                                {character.equippedArmor ? (
                                    <div className="flex items-center justify-between text-sm text-white">
                                        <span className="font-semibold">{character.equippedArmor.name}</span>
                                        <Badge variant="fantasy">AC {character.equippedArmor.armorClass}</Badge>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">No armor equipped</span>
                                )}
                            </div>

                            <div className="rounded-2xl border border-fantasy-purple/30 bg-black/30">
                                <div className="flex items-center gap-2 border-b border-fantasy-purple/30 px-5 py-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                    <Backpack className="h-4 w-4 text-fantasy-gold" /> Inventory
                                </div>
                                <div className="px-5 py-4">
                                    <ScrollArea className="h-[280px] pr-4">
                                        <div className="space-y-2">
                                            {character.inventory && character.inventory.length > 0 ? (
                                                character.inventory.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between gap-4 border-b border-white/5 pb-1 text-sm text-white last:border-0"
                                                    >
                                                        <span>{item.name}</span>
                                                        <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/80 whitespace-nowrap">
                                                            {item.type}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-6 text-center text-sm text-muted-foreground">Empty backpack</div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-sm text-white">
                                        <span className="font-semibold text-fantasy-gold">Gold</span>
                                        <span className="font-mono text-lg font-bold">{character.gold} gp</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="features" className="mt-4">
                            <div className="rounded-2xl border border-fantasy-purple/40 bg-black/30 p-5">
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-5 text-sm leading-relaxed text-white/90">
                                        <div>
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-fantasy-gold">
                                                Racial Traits — {character.race.name}
                                            </h3>
                                            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                                                {character.race.traits.map((trait, idx) => (
                                                    <li key={idx}>{trait}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-fantasy-gold">
                                                Class Features — {character.class.name}
                                            </h3>
                                            {character.featureUses && (
                                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-fantasy-gold/80">
                                                    {'actionSurge' in character.featureUses && (
                                                        <Badge variant="outline">Action Surge: {character.featureUses.actionSurge ? 'Ready' : 'Used'}</Badge>
                                                    )}
                                                    {'secondWind' in character.featureUses && (
                                                        <Badge variant="outline">Second Wind: {character.featureUses.secondWind ? 'Ready' : 'Used'}</Badge>
                                                    )}
                                                    {'bardicInspiration' in character.featureUses && (
                                                        <Badge variant="outline">Bardic Insp: {character.featureUses.bardicInspiration}</Badge>
                                                    )}
                                                    {'rage' in character.featureUses && (
                                                        <Badge variant="outline">Rage: {character.featureUses.rage}</Badge>
                                                    )}
                                                    {'kiPoints' in character.featureUses && (
                                                        <Badge variant="outline">Ki: {character.featureUses.kiPoints}</Badge>
                                                    )}
                                                    {'wildShape' in character.featureUses && (
                                                        <Badge variant="outline">Wild Shape: {character.featureUses.wildShape}</Badge>
                                                    )}
                                                    {'channelDivinity' in character.featureUses && (
                                                        <Badge variant="outline">Channel Divinity: {character.featureUses.channelDivinity}</Badge>
                                                    )}
                                                    {'layOnHands' in character.featureUses && (
                                                        <Badge variant="outline">Lay on Hands: {character.featureUses.layOnHands}</Badge>
                                                    )}
                                                    {'sorceryPoints' in character.featureUses && (
                                                        <Badge variant="outline">Sorcery Points: {character.featureUses.sorceryPoints}</Badge>
                                                    )}
                                                </div>
                                            )}
                                            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                                                {character.class.features.map((feature, idx) => (
                                                    <li key={idx}>{feature}</li>
                                                ))}
                                                {character.fightingStyle && (
                                                    <li>Fighting Style: {character.fightingStyle}</li>
                                                )}
                                                {character.pactBoon && (
                                                    <li>Pact Boon: {character.pactBoon}</li>
                                                )}
                                                {character.sorcerousOrigin && (
                                                    <li>Sorcerous Origin: {character.sorcerousOrigin}</li>
                                                )}
                                            </ul>
                                        </div>

                                        {character.feats && character.feats.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-fantasy-gold">
                                                    Feats
                                                </h3>
                                                <div className="mt-2 space-y-3">
                                                    {character.feats.map(featId => {
                                                        const feat = feats.find(f => f.id === featId);
                                                        if (!feat) return null;
                                                        return (
                                                            <div key={featId} className="rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-semibold text-fantasy-gold">{feat.name}</span>
                                                                    <Badge variant="outline" className="text-[10px]">Feat</Badge>
                                                                </div>
                                                                <p className="mt-1 text-xs text-muted-foreground">{feat.description}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </ScrollArea>
                            </div>
                        </TabsContent>

                        <TabsContent value="spells" className="mt-4 space-y-4">
                            <div className="rounded-2xl border border-fantasy-purple/40 bg-black/30 p-5">
                                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                    <span className="font-semibold text-fantasy-gold flex items-center gap-2">
                                        <Scroll className="h-4 w-4 text-fantasy-gold" /> Spell Slots
                                    </span>
                                    {slotEntries.length > 0 ? (
                                        slotEntries.map(([lvl, pool]) => (
                                            <Badge key={lvl} variant="outline" className="text-[11px]">
                                                L{lvl}: {pool.current}/{pool.max}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground">No slots available</span>
                                    )}
                                    {character.concentratingOn && (
                                        <Badge variant="fantasy" className="text-[11px] flex items-center gap-2">
                                            <Dna className="h-3 w-3" /> Concentrating: {character.concentratingOn.spellName}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-fantasy-purple/30 bg-black/30 p-5 space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-fantasy-gold">
                                    Prepared Spells
                                </h3>
                                {preparedSpells.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {preparedSpells.map((spell) => (
                                            <div key={spell.id} className="rounded-xl border border-fantasy-purple/30 bg-fantasy-purple/10 px-3 py-2 text-sm text-white">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold">{spell.name}</span>
                                                    <Badge variant="secondary">Lvl {spell.level}</Badge>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                                    {spell.concentration && <Badge variant="outline" className="text-[10px]">Concentration</Badge>}
                                                    {spell.ritual && <Badge variant="outline" className="text-[10px]">Ritual</Badge>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No spells prepared.</p>
                                )}
                            </div>
                            <div className="rounded-2xl border border-fantasy-purple/30 bg-black/30 p-5 space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-fantasy-gold">
                                    Known Spells
                                </h3>
                                {knownSpellsDetailed.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {knownSpellsDetailed.map((spell) => (
                                            <div key={spell.id} className="rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold">{spell.name}</span>
                                                    <Badge variant="secondary">Lvl {spell.level}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{spell.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No known spells.</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div >
            </div >
        </div >
    );
}
