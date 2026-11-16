/**
 * Meals: cooked at a workbench (content/recipes.ts), eaten from the bag. No Phaser dependency.
 * A meal gives one short-lived effect; eating another replaces it. There is no hunger.
 *
 *   isMeal(itemId)           true for items that carry `ItemDef.meal`
 *   eatMeal(itemId)          spends one and starts its effect; false if none is carried
 *   getActiveMeal()          the running effect, or null once it has worn off
 *   getMealSpeedFactor()     walking speed multiplier from a 'swift' meal
 *   isBlightproof()          true while a 'blightproof' meal lets the player ignore the blight's drag
 *
 * State: `ext.meal = { effect, until }` (epoch ms). Old saves simply have none.
 */
import { content } from '../content';
import type { MealEffect } from '../content/types';
import { bus } from './events';
import { gameState } from './state';

/** Walking speed while a swift meal lasts. */
export const SWIFT_SPEED_FACTOR = 1.25;

interface MealExt {
  effect: MealEffect;
  until: number;
}

export function isMeal(itemId: string): boolean {
  return content.items.find(itemId)?.meal !== undefined;
}

export function getActiveMeal(): MealExt | null {
  const meal = gameState.getExt<MealExt | null>('meal', null);
  return meal && meal.until > Date.now() ? meal : null;
}

export function eatMeal(itemId: string): boolean {
  const def = content.items.find(itemId)?.meal;
  if (!def || !gameState.removeItem(itemId, 1)) return false;
  gameState.setExt('meal', { effect: def.effect, until: Date.now() + def.minutes * 60_000 });
  gameState.setFlag('ate-meal');
  gameState.save();
  bus.emit('meal-eaten', { itemId });
  return true;
}

export function getMealSpeedFactor(): number {
  return getActiveMeal()?.effect === 'swift' ? SWIFT_SPEED_FACTOR : 1;
}

export function isBlightproof(): boolean {
  return getActiveMeal()?.effect === 'blightproof';
}
