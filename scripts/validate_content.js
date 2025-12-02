const fs = require('fs');
const path = require('path');

const files = [
    'src/content/characterCreation.json',
    'src/content/spells.json',
    'src/content/adventure.json',
    'src/content/adventure-shadows.json'
];

let hasError = false;

files.forEach(file => {
    try {
        const filePath = path.join(process.cwd(), file);
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${file} is valid JSON.`);
    } catch (error) {
        hasError = true;
        console.error(`❌ ${file} has errors:`);
        console.error(error.message);
    }
});

if (hasError) {
    process.exit(1);
} else {
    console.log('All content files are valid JSON.');
}
