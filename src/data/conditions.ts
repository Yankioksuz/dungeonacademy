import type { ConditionType } from '@/types';
import {
    EyeOff,
    Heart,
    EarOff,
    Ghost,
    Hand,
    Activity,
    Skull,
    ShieldAlert,
    Anchor,
    Zap,
    Moon,
    AlertTriangle,
    Feather,
    Wind
} from 'lucide-react';

export interface ConditionDefinition {
    id: ConditionType;
    name: string;
    description: string;
    effects: string[]; // Human readable effects
    icon: any; // Lucide icon component
    color: string; // Tailwind color class for badge
}

export const CONDITIONS: Record<ConditionType, ConditionDefinition> = {
    blinded: {
        id: 'blinded',
        name: 'Blinded',
        description: "You can't see.",
        effects: [
            "Auto-fail sight based checks",
            "Attack rolls against you have Advantage",
            "Your attack rolls have Disadvantage"
        ],
        icon: EyeOff,
        color: "bg-gray-800"
    },
    charmed: {
        id: 'charmed',
        name: 'Charmed',
        description: "You are charmed by another creature.",
        effects: [
            "Can't attack the charmer",
            "Charmer has Advantage on social checks vs you"
        ],
        icon: Heart,
        color: "bg-pink-600"
    },
    deafened: {
        id: 'deafened',
        name: 'Deafened',
        description: "You can't hear.",
        effects: [
            "Auto-fail hearing based checks"
        ],
        icon: EarOff,
        color: "bg-gray-500"
    },
    frightened: {
        id: 'frightened',
        name: 'Frightened',
        description: "You are afraid of the source.",
        effects: [
            "Disadvantage on checks/attacks while source is in sight",
            "Can't move closer to source"
        ],
        icon: Ghost,
        color: "bg-purple-700"
    },
    grappled: {
        id: 'grappled',
        name: 'Grappled',
        description: "You are held by another creature.",
        effects: [
            "Speed becomes 0",
            "Ends if grappler is incapacitated"
        ],
        icon: Hand,
        color: "bg-orange-700"
    },
    incapacitated: {
        id: 'incapacitated',
        name: 'Incapacitated',
        description: "You can't take actions or reactions.",
        effects: [
            "No actions or reactions"
        ],
        icon: Activity,
        color: "bg-red-800"
    },
    invisible: {
        id: 'invisible',
        name: 'Invisible',
        description: "You can't be seen.",
        effects: [
            "Attack rolls against you have Disadvantage",
            "Your attack rolls have Advantage",
            "Heavily obscured for hiding"
        ],
        icon: Ghost,
        color: "bg-blue-300/50"
    },
    paralyzed: {
        id: 'paralyzed',
        name: 'Paralyzed',
        description: "You are paralyzed.",
        effects: [
            "Incapacitated",
            "Can't move or speak",
            "Auto-fail STR/DEX saves",
            "Attack rolls against you have Advantage",
            "Attacks from 5ft are Critical Hits"
        ],
        icon: Activity,
        color: "bg-yellow-600"
    },
    petrified: {
        id: 'petrified',
        name: 'Petrified',
        description: "You are turned to stone.",
        effects: [
            "Incapacitated",
            "Can't move or speak",
            "Attack rolls against you have Advantage",
            "Auto-fail STR/DEX saves",
            "Resistance to all damage",
            "Immune to poison/disease"
        ],
        icon: Anchor, // Replacing Stone with Anchor for stability concept
        color: "bg-stone-500"
    },
    poisoned: {
        id: 'poisoned',
        name: 'Poisoned',
        description: "You are afflicted by poison.",
        effects: [
            "Disadvantage on attack rolls",
            "Disadvantage on ability checks"
        ],
        icon: Skull,
        color: "bg-green-600"
    },
    prone: {
        id: 'prone',
        name: 'Prone',
        description: "You are lying on the ground.",
        effects: [
            "Crawling costs extra movement",
            "Disadvantage on melee attacks",
            "Attacks against you from 5ft have Advantage",
            "Attacks against you from >5ft have Disadvantage"
        ],
        icon: Activity, // Using generic activity for prone/falling
        color: "bg-amber-700"
    },
    restrained: {
        id: 'restrained',
        name: 'Restrained',
        description: "You are bound.",
        effects: [
            "Speed 0",
            "Attack rolls against you have Advantage",
            "Your attack rolls have Disadvantage",
            "Disadvantage on DEX saves"
        ],
        icon: Anchor,
        color: "bg-orange-800"
    },
    stunned: {
        id: 'stunned',
        name: 'Stunned',
        description: "You are stunned.",
        effects: [
            "Incapacitated",
            "Can't move",
            "Speak only falteringly",
            "Auto-fail STR/DEX saves",
            "Attack rolls against you have Advantage"
        ],
        icon: Zap,
        color: "bg-yellow-500"
    },
    unconscious: {
        id: 'unconscious',
        name: 'Unconscious',
        description: "You are unconscious.",
        effects: [
            "Incapacitated",
            "Can't move or speak",
            "Drop what you're holding",
            "Auto-fail STR/DEX saves",
            "Attack rolls against you have Advantage",
            "Attacks from 5ft are Critical Hits"
        ],
        icon: Moon,
        color: "bg-black"
    },
    // Custom/Extra conditions
    hexed: {
        id: 'hexed',
        name: 'Hexed',
        description: "You are cursed by a warlock.",
        effects: [
            "Take extra necrotic damage from cursers attacks",
            "Disadvantage on checks with one ability"
        ],
        icon: Skull,
        color: "bg-purple-900"
    },
    turned: {
        id: 'turned',
        name: 'Turned',
        description: "You are turned by divine power.",
        effects: [
            "Must spend turns fleeing",
            "Can't take reactions",
            "Only Action is Dash or Dodge"
        ],
        icon: AlertTriangle,
        color: "bg-yellow-200 text-yellow-900"
    },
    pacified: {
        id: 'pacified',
        name: 'Pacified',
        description: "You have lost the will to fight.",
        effects: ["Cannot attack"],
        icon: Heart,
        color: "bg-pink-300"
    },
    hidden: {
        id: 'hidden',
        name: 'Hidden',
        description: "You are unseen and unheard.",
        effects: [
            "Unseen attacker",
            "Attacks give position away"
        ],
        icon: Ghost,
        color: "bg-slate-700"
    },
    reckless: {
        id: 'reckless',
        name: 'Reckless',
        description: "You threw caution to the wind.",
        effects: [
            "Advantage on STR attacks",
            "Attacks against you have Advantage"
        ],
        icon: Zap,
        color: "bg-red-600"
    },
    haste: {
        id: 'haste',
        name: 'Haste',
        description: "You move with incredible speed.",
        effects: [
            "Speed doubled",
            "+2 AC",
            "Advantage on DEX saves",
            "Additional Action (Attack/Dash/Disengage/Hide/Use Object)"
        ],
        icon: Wind,
        color: "bg-cyan-500"
    },
    flying: {
        id: 'flying',
        name: 'Flying',
        description: "You are airborne.",
        effects: [
            "Clear of ground hazards",
            "Fall damage if speed becomes 0"
        ],
        icon: Feather,
        color: "bg-sky-400"
    },
    "displacement-broken": {
        id: 'displacement-broken',
        name: 'Displacement Inactive',
        description: "Your defensive illusion is disrupted.",
        effects: [
            "No Disadvantage on attacks against you"
        ],
        icon: ShieldAlert,
        color: "bg-gray-600"
    },
    "armor-not-proficient": {
        id: "armor-not-proficient",
        name: "Not Proficient (Armor)",
        description: "Armor hinders your movement.",
        effects: [
            "Disadvantage on STR/DEX saves",
            "Disadvantage on STR/DEX checks (skills)",
            "Can't cast spells"
        ],
        icon: ShieldAlert,
        color: "bg-red-700"
    },
    // Exhaustion Levels (Official 5e)
    "exhaustion-1": {
        id: "exhaustion-1",
        name: "Exhaustion (Level 1)",
        description: "You are slightly fatigued.",
        effects: [
            "Disadvantage on ability checks"
        ],
        icon: Activity,
        color: "bg-amber-600"
    },
    "exhaustion-2": {
        id: "exhaustion-2",
        name: "Exhaustion (Level 2)",
        description: "You are moderately fatigued.",
        effects: [
            "Disadvantage on ability checks",
            "Speed halved"
        ],
        icon: Activity,
        color: "bg-amber-700"
    },
    "exhaustion-3": {
        id: "exhaustion-3",
        name: "Exhaustion (Level 3)",
        description: "You are severely fatigued.",
        effects: [
            "Disadvantage on ability checks",
            "Speed halved",
            "Disadvantage on attack rolls and saving throws"
        ],
        icon: Activity,
        color: "bg-orange-700"
    },
    "exhaustion-4": {
        id: "exhaustion-4",
        name: "Exhaustion (Level 4)",
        description: "You are critically fatigued.",
        effects: [
            "Disadvantage on ability checks",
            "Speed halved",
            "Disadvantage on attack rolls and saving throws",
            "Hit point maximum halved"
        ],
        icon: Activity,
        color: "bg-orange-800"
    },
    "exhaustion-5": {
        id: "exhaustion-5",
        name: "Exhaustion (Level 5)",
        description: "You can barely move.",
        effects: [
            "Disadvantage on ability checks",
            "Speed reduced to 0",
            "Disadvantage on attack rolls and saving throws",
            "Hit point maximum halved"
        ],
        icon: Activity,
        color: "bg-red-700"
    },
    "exhaustion-6": {
        id: "exhaustion-6",
        name: "Exhaustion (Level 6)",
        description: "Death.",
        effects: [
            "You die"
        ],
        icon: Skull,
        color: "bg-black"
    }
};

export function getConditionDefinition(type: ConditionType): ConditionDefinition {
    return CONDITIONS[type] || {
        id: type,
        name: type,
        description: "Unknown condition",
        effects: [],
        icon: AlertTriangle,
        color: "bg-gray-500"
    };
}
