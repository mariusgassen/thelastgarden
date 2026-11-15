import type { NpcDef } from './types';

/** NPC rules are evaluated top to bottom on interaction (see systems/npcs.ts). */
export const NPCS: NpcDef[] = [
  {
    id: 'crow',
    name: 'Die Krähe',
    description: 'Eine aufmerksame Krähe, die den Garten zu beobachten scheint.',
    interactLabel: 'Ansprechen',
    color: 0x2b2b33,
    dialogues: [
      { dialogueId: 'crow-intro', forbids: ['crow-met'], setFlags: ['crow-met'] },
      { dialogueId: 'crow-epilogue', requires: ['greenhouse-unlocked'] },
      { dialogueId: 'crow-key-given', requires: ['crow-gave-key'] },
      {
        dialogueId: 'crow-gives-key',
        requires: ['quest-completed:q-journal-pages'],
        setFlags: ['crow-gave-key'],
        giveItems: [{ itemId: 'greenhouse-key', count: 1 }],
      },
      { dialogueId: 'crow-pages-pending', requires: ['quest-completed:q-restore-beds'] },
      { dialogueId: 'crow-progress', requires: ['journal-read:page-bramble'] },
      { dialogueId: 'crow-progress', requires: ['journal-read:page-lily'] },
      { dialogueId: 'crow-progress', requires: ['journal-read:page-lavender'] },
    ],
    dialogueId: 'crow-waiting',
  },
];
