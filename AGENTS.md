# AGENTS.md

Read `ARCHITECTURE.md` and `CLAUDE.md` before making changes.

## Required checks

1. Run `npm run typecheck` for TypeScript-only changes.
2. Run `npm run build` for any implementation, workflow, or PWA change.
3. For visible gameplay/UI changes, test desktop and a phone viewport.

## Guardrails

- Keep all player-facing copy in German.
- Prefer data-driven additions in `src/content/` and `src/world/` over scene-specific conditionals.
- Do not mutate save data directly; use `gameState` and add migrations when the saved schema changes.
- Keep mobile touch interaction, safe-area layout, offline behaviour, and reduced-motion support intact.
- Do not add external services, trackers, credentials, or copyrighted assets.
- Keep commits and pull-request titles Conventional Commits-compatible; Release Please publishes releases from merged commits on `main`.
