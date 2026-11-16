/**
 * Workbench crafting. No Phaser dependency.
 *
 * Recipes are content (content/recipes.ts). A `craft` interactable (see interaction.ts) opens
 * the menu as an ad-hoc dialogue whose choices carry the recipe id; the UI reports the pick
 * through `dialogue-choice`, and the listener below crafts it.
 *
 *   getUnlockedRecipes()      recipes whose `requiresFlag` is set
 *   getMissing(recipe)        ingredients still short (count = shortfall)
 *   craft(recipeId)           spends the cost, adds the result; false if locked or short
 *   craftingMenuLines()       dialogue lines for the menu, or null if nothing is unlocked yet
 */
import { content } from '../content';
import type { DialogueLine, RecipeDef } from '../content/types';
import { bus } from './events';
import { gameState } from './state';

export const CRAFTING_DIALOGUE_ID = 'crafting';

export function isRecipeUnlocked(recipe: RecipeDef): boolean {
  return !recipe.requiresFlag || gameState.hasFlag(recipe.requiresFlag);
}

export function getUnlockedRecipes(): RecipeDef[] {
  return content.recipes.all().filter(isRecipeUnlocked);
}

export function getMissing(recipe: RecipeDef): { itemId: string; count: number }[] {
  return recipe.cost
    .map((c) => ({ itemId: c.itemId, count: c.count - gameState.getItemCount(c.itemId) }))
    .filter((c) => c.count > 0);
}

export function craft(recipeId: string): boolean {
  const recipe = content.recipes.find(recipeId);
  if (!recipe || !isRecipeUnlocked(recipe) || getMissing(recipe).length > 0) return false;
  for (const c of recipe.cost) gameState.removeItem(c.itemId, c.count);
  for (const r of recipe.result) gameState.addItem(r.itemId, r.count);
  gameState.save();
  bus.emit('item-crafted', { recipeId });
  return true;
}

/** One choice per unlocked recipe, labelled "Name · Zutat have/need · …". */
export function craftingMenuLines(): DialogueLine[] | null {
  const recipes = getUnlockedRecipes();
  if (recipes.length === 0) return null;
  return [
    {
      text: 'Was möchtest du herstellen?',
      choices: [
        ...recipes.map((recipe) => ({
          id: recipe.id,
          label: [
            recipe.name,
            ...recipe.cost.map((c) => `${content.items.get(c.itemId).name} ${gameState.getItemCount(c.itemId)}/${c.count}`),
          ].join(' · '),
        })),
        { label: 'Nichts' },
      ],
    },
  ];
}

const itemList = (items: { itemId: string; count: number }[]): string =>
  items.map((i) => `${i.count} ${content.items.get(i.itemId).name}`).join(', ');

// Registered once at module load (interaction.ts imports this module).
bus.on('dialogue-choice', ({ dialogueId, choiceId }) => {
  if (dialogueId !== CRAFTING_DIALOGUE_ID) return;
  const recipe = content.recipes.find(choiceId);
  if (!recipe) return;
  if (craft(recipe.id)) bus.emit('toast', { text: `+${itemList(recipe.result)}` });
  else bus.emit('toast', { text: `Dafür fehlt noch: ${itemList(getMissing(recipe))}.` });
});

bus.on('flag-changed', ({ key, value }) => {
  if (!value) return;
  for (const recipe of content.recipes.all()) {
    if (recipe.requiresFlag === key) bus.emit('toast', { text: `Neues Rezept für die Werkbank: ${recipe.name}` });
  }
});
