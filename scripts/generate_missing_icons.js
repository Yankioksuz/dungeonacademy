import fs from 'fs';
import path from 'path';

const ITEMS_PATH = './src/content/items.json';
const OUTPUT_DIR = './src/assets/items';

const MISSING_IDS = [
    'ring-of-regeneration',
    'belt-of-giant-strength-storm',
    'ioun-stone-mastery',
    'talisman-of-pure-good',
    'primordial-winter-shard',
    'deck-of-many-things',
    'helm-of-brilliance',
    'bracers-of-defense',
    'sunblade',
    'dagger-venom',
    'frost-rune-axe',
    'adamantine-armor',
    'dragon-scale-mail',
    'animated-shield',
    'spellguard-shield',
    'bag-of-holding',
    'boots-of-elvenkind',
    'gauntlets-of-ogre-power',
    'wand-of-fireballs',
    'rod-of-the-pact-keeper',
    'heart-shard',
    'rimeguard-medallion'
];

async function generateImage(prompt, filename) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('Please set OPENAI_API_KEY environment variable.');
        process.exit(1);
    }

    console.log(`Generating: ${filename}...`);

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json",
                quality: "standard",
                style: "vivid"
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} ${error}`);
        }

        const data = await response.json();
        const base64Data = data.data[0].b64_json;
        const buffer = Buffer.from(base64Data, 'base64');

        fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
        console.log(`Saved: ${filename}`);

    } catch (error) {
        console.error(`Failed to generate ${filename}:`, error.message);
    }
}

async function main() {
    // Read items
    const rawData = fs.readFileSync(ITEMS_PATH, 'utf-8');
    const itemsData = JSON.parse(rawData);

    // Flatten all items into one list for searching
    const allItems = [];
    Object.values(itemsData).forEach(category => {
        if (Array.isArray(category)) {
            allItems.push(...category);
        }
    });

    for (const id of MISSING_IDS) {
        const item = allItems.find(i => i.id === id);
        if (!item) {
            console.warn(`Item not found: ${id}`);
            continue;
        }

        const timestamp = Date.now();
        const filename = `${id.replace(/-/g, '_')}_${timestamp}.png`;
        const prompt = `Detail icon of ${item.name}, ${item.description.substring(0, 100)}, fantasy RPG style, digital painting, high resolution, centered, isolated on a dark gray background. No text, no border.`;

        await generateImage(prompt, filename);

        // Log filename for manual update
        console.log(`GENERATED_FILE: ${filename}`);
    }
}

main();
