/**
 * Read-only view of the inventory for the HUD (ui/InventoryPanel.ts). No Phaser dependency.
 */
import { content } from '../content';
import type { ItemCategory, ItemDef } from '../content/types';
import { gameState } from './state';

export interface InventoryGroup {
  title: string;
  entries: { item: ItemDef; count: number }[];
}

const GROUPS: { title: string; categories: ItemCategory[] }[] = [
  { title: 'Samen', categories: ['seed'] },
  { title: 'Ernte', categories: ['produce'] },
  { title: 'Speisen', categories: ['meal'] },
  { title: 'Rohstoffe', categories: ['resource'] },
  { title: 'Werkzeug & Bauteile', categories: ['tool', 'material'] },
  { title: 'Schlüssel & Andenken', categories: ['key'] },
  { title: 'Notizen', categories: ['note'] },
];

/** Everything the player carries, grouped for display; empty groups are left out. */
export function getInventoryGroups(): InventoryGroup[] {
  return GROUPS.map(({ title, categories }) => ({
    title,
    entries: content.items
      .all()
      .filter((item) => categories.includes(item.category))
      .map((item) => ({ item, count: gameState.getItemCount(item.id) }))
      .filter((entry) => entry.count > 0),
  })).filter((group) => group.entries.length > 0);
}
