/**
 * Maps background equipment names (from characterCreation.json) to item IDs (in items.json)
 * This allows background equipment to reference actual usable items in the game system.
 */

import itemsData from '@/content/items.json';
import type { Item } from '@/types';

// Background equipment name -> item ID mapping
const EQUIPMENT_NAME_TO_ID: Record<string, string> = {
    // Clothing
    'common clothes': 'common-clothes',
    'fine clothes': 'fine-clothes',
    "traveler's clothes": 'travelers-clothes',
    'dark common clothes with hood': 'dark-clothes-hood',
    'vestments': 'vestments',
    'costume': 'costume',

    // Tools
    "artisan's tools": 'artisans-tools',
    'disguise kit': 'disguise-kit',
    'herbalism kit': 'herbalism-kit',
    "thieves' tools": 'thieves-tools',
    'crowbar': 'crowbar',
    'shovel': 'shovel',
    'hunting trap': 'hunting-trap',
    'musical instrument': 'musical-instrument',

    // Accessories
    'signet ring': 'signet-ring',
    'holy symbol': 'holy-symbol',
    'lucky charm': 'lucky-charm',
    'insignia of rank': 'insignia-of-rank',

    // Misc Items
    '50 feet of silk rope': 'silk-rope-50ft',
    'iron pot': 'iron-pot',
    'prayer book': 'prayer-book',
    '5 sticks of incense': 'incense-5',
    'bottle of black ink': 'ink-bottle',
    'quill': 'quill',
    'scroll case with notes': 'scroll-case',
    'bone dice': 'bone-dice',
    'map of your home city': 'city-map',
    'winter blanket': 'winter-blanket',
    'letter from a dead colleague': 'letter-dead-colleague',
    'scroll of pedigree': 'scroll-pedigree',
    'tools of the con': 'tools-of-con',
    'favor of an admirer': 'favor-admirer',
    'letter of introduction from guild': 'guild-letter',
    'trophy from animal': 'trophy-animal',
    'trophy from fallen enemy': 'trophy-enemy',
    'token from parents': 'token-parents',
    'pet mouse': 'pet-mouse',

    // Weapons (existing in items.json)
    'small knife': 'dagger',
    'staff': 'staff',
    'belaying pin (club)': 'club',
};

// Build a lookup map of all items by ID
const allItems: Record<string, Item> = {};

// Helper to add items from a category
const addItemsFromCategory = (items: unknown[]) => {
    items.forEach((item: unknown) => {
        const typedItem = item as Item;
        if (typedItem.id) {
            allItems[typedItem.id] = typedItem;
        }
    });
};

// Load all item categories
if (itemsData.weapons) addItemsFromCategory(itemsData.weapons);
if (itemsData.armor) addItemsFromCategory(itemsData.armor);
if (itemsData.shields) addItemsFromCategory(itemsData.shields);
if (itemsData.magicItems) addItemsFromCategory(itemsData.magicItems);
if (itemsData.consumables) addItemsFromCategory(itemsData.consumables);
if (itemsData.clothing) addItemsFromCategory(itemsData.clothing);
if (itemsData.tools) addItemsFromCategory(itemsData.tools);
if (itemsData.accessories) addItemsFromCategory(itemsData.accessories);
if (itemsData.miscItems) addItemsFromCategory(itemsData.miscItems);

/**
 * Get an item by its ID from the items catalog
 */
export function getItemById(itemId: string): Item | undefined {
    return allItems[itemId];
}

/**
 * Convert a background equipment name to an Item with a unique instance ID
 * Returns undefined if the equipment is gold (e.g., "15 gp") or unrecognized
 */
export function getBackgroundItem(equipmentName: string, index: number): Item | undefined {
    const lowerName = equipmentName.toLowerCase().trim();

    // Skip gold entries
    if (/^\d+\s*gp$/i.test(lowerName) || /purse.*\d+\s*gp/i.test(lowerName)) {
        return undefined;
    }

    // Look up the item ID from our mapping
    const itemId = EQUIPMENT_NAME_TO_ID[lowerName];

    if (itemId) {
        const baseItem = allItems[itemId];
        if (baseItem) {
            // Return a new instance with unique ID
            return {
                ...baseItem,
                id: `bg-${itemId}-${index}-${Date.now()}`,
            };
        }
    }

    // Fallback: create a generic misc item for unrecognized equipment
    return {
        id: `bg-misc-${index}-${Date.now()}`,
        name: equipmentName,
        type: 'misc',
        description: `Starting equipment from your background.`,
        value: 1,
    };
}

/**
 * Parse gold amount from an equipment string
 * Returns 0 if no gold amount found
 */
export function parseGoldFromEquipment(equipmentName: string): number {
    const match = equipmentName.match(/(\d+)\s*gp/i);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * Convert all background equipment to inventory items and total gold
 */
export function processBackgroundEquipment(equipment: string[]): { items: Item[], gold: number } {
    let gold = 0;
    const items: Item[] = [];

    equipment.forEach((equipName, index) => {
        // Parse gold from any equipment string
        gold += parseGoldFromEquipment(equipName);

        // Try to get an item (returns undefined for pure gold entries)
        const item = getBackgroundItem(equipName, index);
        if (item) {
            items.push(item);
        }
    });

    return { items, gold };
}
