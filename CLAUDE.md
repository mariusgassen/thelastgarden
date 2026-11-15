# CLAUDE.md

## Project

The Last Garden is a mobile-first, offline-capable Phaser 3 browser game. It uses TypeScript and Vite; all UI text is German. Read `ARCHITECTURE.md` before changing game systems, world data, save data, or scenes.

## Commands

```bash
npm ci
npm run dev
npm run typecheck
npm run build
```

Run `npm run build` before handing work over. For visible UI/gameplay work, verify the result at desktop plus a phone-sized viewport.

## Working conventions

- Keep gameplay data in `src/content/` or `src/world/`; do not put content constants into scenes.
- Keep persistent changes behind `gameState` APIs. If a save shape changes, update defaults and migrations in `src/systems/save.ts`.
- Use the typed `bus` for cross-system events. Scene listeners must use `bus.onScene()`.
- Keep gameplay systems separate from Phaser-bound rendering layers.
- Preserve touch controls, safe-area handling, reduced-motion support, and the small, cozy, non-violent tone.
- Avoid unrelated formatting or dependency updates.

## Git and releases

- Use Conventional Commit messages and PR titles: `feat: …`, `fix: …`, `docs: …`, `chore: …`, etc.; optional scopes are allowed, e.g. `feat(world): …`.
- Squash merge with the PR title so Release Please can derive versions and release notes from commits on `main`.
- Do not manually edit a generated release PR unless needed to resolve a conflict.
