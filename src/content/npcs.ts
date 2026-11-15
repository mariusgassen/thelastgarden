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
      { dialogueId: 'crow-heart-after', requires: ['crow-heart-talked', 'bed-restored:bed-heart-fern'] },
      { dialogueId: 'crow-heart-waiting', requires: ['crow-heart-talked'] },
      {
        dialogueId: 'crow-heart-finale',
        requires: ['greenhouse-inner-unlocked'],
        forbids: ['crow-heart-talked'],
        setFlags: ['crow-heart-talked'],
      },
      { dialogueId: 'crow-tower-after-owl', requires: ['water-tower-crow-met', 'owl-gave-vial'] },
      { dialogueId: 'crow-tower-waiting', requires: ['water-tower-crow-met'] },
      {
        dialogueId: 'crow-tower-intro',
        requires: ['episode-1-complete'],
        forbids: ['water-tower-crow-met'],
        setFlags: ['water-tower-crow-met'],
      },
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
  {
    id: 'owl',
    name: 'Die Turmeule',
    description: 'Eine alte Schleiereule, die von der Mauer des Wasserturms über das stille Erlenbrück wacht.',
    interactLabel: 'Ansprechen',
    color: 0xb9946b,
    dialogues: [
      { dialogueId: 'owl-after-vial', requires: ['owl-gave-vial'] },
      {
        dialogueId: 'owl-gives-vial',
        requires: ['owl-met', 'tower-cistern-repaired', 'bed-restored:bed-tower-lily'],
        forbids: ['owl-gave-vial'],
        setFlags: ['owl-gave-vial'],
        giveItems: [{ itemId: 'tower-water-vial', count: 1 }],
      },
      { dialogueId: 'owl-waiting', requires: ['owl-met'] },
      { dialogueId: 'owl-intro', forbids: ['owl-met'], setFlags: ['owl-met'] },
    ],
    dialogueId: 'owl-waiting',
  },
];
