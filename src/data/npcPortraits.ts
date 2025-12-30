// NPC Portrait Data
// Maps NPC IDs to their portrait images

import thoraPortrait from '@/assets/npcs/thora.png';
import pipPortrait from '@/assets/npcs/pip.png';
import maraPortrait from '@/assets/npcs/mara.png';
import eldredPortrait from '@/assets/npcs/eldred.png';
import kaelaPortrait from '@/assets/npcs/kaela.png';
import vaelPortrait from '@/assets/npcs/vael.png';
import ryellPortrait from '@/assets/npcs/ryell.png';
// Sanctum of the Flayed God NPCs
import dukeArisPortrait from '@/assets/npcs/duke-aris.png';
import elaraPortrait from '@/assets/npcs/elara.png';
import krovPortrait from '@/assets/npcs/krov.png';
import malPortrait from '@/assets/npcs/mal.png';
import vexPortrait from '@/assets/npcs/vex.png';
import librarianPortrait from '@/assets/npcs/librarian.png';
import matriarchPortrait from '@/assets/npcs/matriarch.png';
import wardenPortrait from '@/assets/npcs/warden.png';
// Sanctum Enemies/Monsters
import boneSwarmPortrait from '@/assets/npcs/bone-swarm.png';
import gateGuardianPortrait from '@/assets/npcs/gate-guardian.png';
import painEaterPortrait from '@/assets/npcs/pain-eater.png';
import hellHoundPortrait from '@/assets/npcs/hell-hound.png';
import eliteGuardPortrait from '@/assets/npcs/elite-guard.png';
import gargoylePortrait from '@/assets/npcs/gargoyle.png';
import sanguinePontiffPortrait from '@/assets/npcs/sanguine-pontiff.png';

export interface NPCPortrait {
    id: string;
    name: string;
    src: string;
    campaign?: string;
}

export const npcPortraits: NPCPortrait[] = [
    // Tutorial Campaign NPCs
    {
        id: 'thora',
        name: 'Thora the Guard',
        src: thoraPortrait,
        campaign: 'tutorial'
    },
    {
        id: 'pip',
        name: 'Pip the Merchant',
        src: pipPortrait,
        campaign: 'tutorial'
    },
    {
        id: 'mara',
        name: 'Mara',
        src: maraPortrait,
        campaign: 'tutorial'
    },
    {
        id: 'eldred',
        name: 'Eldred the Farmer',
        src: eldredPortrait,
        campaign: 'tutorial'
    },
    // Shadows of the Azure Spire & Frozen Depths NPCs
    {
        id: 'kaela',
        name: 'Spymaster Kaela',
        src: kaelaPortrait,
        campaign: 'shadows'
    },
    {
        id: 'vael',
        name: 'Councilor Vael',
        src: vaelPortrait,
        campaign: 'shadows'
    },
    {
        id: 'ryell',
        name: 'Archon Ryell',
        src: ryellPortrait,
        campaign: 'shadows'
    },
    // Sanctum of the Flayed God NPCs
    {
        id: 'aris',
        name: 'Duke Aris',
        src: dukeArisPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'elara',
        name: 'Sister Elara',
        src: elaraPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'krov',
        name: 'Baron Krov',
        src: krovPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'mal',
        name: 'Brother Mal',
        src: malPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'vex',
        name: 'High Priest Vex',
        src: vexPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'librarian',
        name: 'The Librarian',
        src: librarianPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'matriarch',
        name: 'Harpy Matriarch',
        src: matriarchPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'warden',
        name: 'Flesh Warden',
        src: wardenPortrait,
        campaign: 'sanctum'
    },
    // Sanctum Enemies/Monsters
    {
        id: 'bone',
        name: 'Bone Swarm',
        src: boneSwarmPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'guardian',
        name: 'Gate Guardian',
        src: gateGuardianPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'pain',
        name: 'Pain Eater',
        src: painEaterPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'hound',
        name: 'Hell Hound',
        src: hellHoundPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'elite',
        name: 'Elite Guard',
        src: eliteGuardPortrait,
        campaign: 'sanctum'
    },
    {
        id: 'gargoyle',
        name: 'Stone Gargoyle',
        src: gargoylePortrait,
        campaign: 'sanctum'
    },
    {
        id: 'pontiff',
        name: 'Sanguine Pontiff',
        src: sanguinePontiffPortrait,
        campaign: 'sanctum'
    }
];

export function getNPCPortrait(npcId: string): NPCPortrait | undefined {
    return npcPortraits.find(npc => npc.id === npcId);
}

export function getNPCPortraitSrc(npcId: string): string | undefined {
    return getNPCPortrait(npcId)?.src;
}
