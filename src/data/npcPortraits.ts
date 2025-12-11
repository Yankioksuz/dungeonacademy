// NPC Portrait Data
// Maps NPC IDs to their portrait images

import thoraPortrait from '@/assets/npcs/thora.png';
import pipPortrait from '@/assets/npcs/pip.png';
import maraPortrait from '@/assets/npcs/mara.png';
import eldredPortrait from '@/assets/npcs/eldred.png';
import kaelaPortrait from '@/assets/npcs/kaela.png';
import vaelPortrait from '@/assets/npcs/vael.png';
import ryellPortrait from '@/assets/npcs/ryell.png';

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
    }
];

export function getNPCPortrait(npcId: string): NPCPortrait | undefined {
    return npcPortraits.find(npc => npc.id === npcId);
}

export function getNPCPortraitSrc(npcId: string): string | undefined {
    return getNPCPortrait(npcId)?.src;
}
