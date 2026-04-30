# Simulation Local League Checkpoint - 2026-04-29

## Current Focus

Local simulation leagues are now centered on ESPN-style roster management, day-by-day NBA schedule realism, live matchup reveal, and a reusable portrait pipeline.

## Completed In This Checkpoint

- Added ESPN-style NBA lineup behavior:
  - PG, SG, SF, PF, C, G, F, UTIL, UTIL, UTIL starters.
  - Bench plus two IR slots.
  - Suggested starters now respects slot eligibility instead of preserving invalid saved assignments.
  - OUT/IR-style players can be routed into IR when injuries are enabled.
- Added AI simulation injury toggle support:
  - Team Settings exposes injuries on/off for simulation leagues.
  - Injury behavior no longer invalidates lineups when disabled.
- Added more realistic NBA day availability:
  - Teams do not play every fantasy day.
  - Off-day players show as no-game rows with zero current-day output instead of fake generated stats.
  - Future day availability is wired into My Team opponent/time rendering.
- Improved local-league navigation and shell UX:
  - League Home button returns to the in-season hub instead of global index.
  - Hub layout uses the full page better.
  - Season save indicator remains visible for confidence after local writes.
- Continued live matchup integration:
  - Reveal-day CTA opens the embedded live matchup popup.
  - Matchup selection avoids zero-vs-active reveals when another playable matchup exists.
  - 3x speed is now available and is the default.
  - Halftime and final reveal no longer reuse the same full-game stats.
  - Tiny/rounded zero fantasy events are filtered out.
- Started the portrait asset pipeline:
  - Added `player-portrait-assets.js`.
  - Supports direct real-image fields, registered URLs, localStorage overrides, and generated SVG fallbacks.
  - Season page and live matchup both consume the shared portrait resolver.
  - Generated fallbacks now include player-aware traits for recognizable stars.

## Basketball Reference Image Decision

Do not scrape Basketball Reference images directly into the product right now. It is technically possible, but risky from a usage/licensing and anti-scraping standpoint. Use the portrait pipeline as the product architecture, then feed it with:

- user-provided image packs,
- licensed/public-domain image sources,
- generated portraits,
- or a future approved provider/API.

## Verified Locally

- `node tools\test-player-portrait-assets.js`
- `node tools\test-shared-season-shell-simulation.js`
- `node tools\test-simulation-season-page.js`
- `node tools\test-simulation-season-adapter.js`
- `node tools\test-simulation-mode-runtime.js`
- `node tools\test-simulation-league-engine.js`
- `npm.cmd run test:live-matchup`

## Good Next Slices

1. Add a portrait manifest UI/dev helper so real or generated image files can be mapped to player names without code edits.
2. Add richer portrait animation states: idle, scoring pop, takeover glow, final spotlight, off-day dim, injured/IR treatment.
3. Run a full My Team plus Waivers lineup persistence pass after several simulated days.
4. Polish Trade Desk feedback and one-for-one trade execution.
5. Commit or push only when ready; production deploys cost money, so prefer local validation until a meaningful batch is ready.
