---
description: How to generate standard format icons for items
---
1. **Identify Items**: Determine which items in `src/content/items.json` need new or updated icons.
2. **Generate Images**: Use the `generate_image` tool for each item.
   - **Prompt Template**: `Detail icon of [Item Name], [Item Description], fantasy RPG style, digital painting, high resolution, centered, isolated on a dark gray background. No text, no border.`
   - **File Naming**: Save as `src/assets/items/[item_id]_[timestamp].png`.
   - **Batching**: Generate 3 images at a time to respect tool limits.
3. **Update Mapping**:
   - Open `src/data/itemIcons.ts`.
   - Add a new import statement for the generated image: `import [variableName] from '@/assets/items/[filename]';`.
   - Update the `ITEM_ICONS` object to map the item ID to the new variable.
4. **Cleanup**: Remove old unused icon files from `src/assets/items` if necessary.
