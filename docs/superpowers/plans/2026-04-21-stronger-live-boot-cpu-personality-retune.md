# Stronger Live-Boot CPU Personality Retune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the live `1995-96` historical sim overproduction of `bigs_bias` strongly enough to make `steady_floor` a real category and keep `balanced` present, without changing lineup behavior, persistence, or season wiring.

**Architecture:** Keep the season-page wiring, lineup helper, and persistence untouched. Start from the current local classifier baseline and strengthen the assignment helper in `cpu-sim-personalities.js` by materially flattening frontcourt lean accumulation and opening a real `steady_floor` lane. Use `tools/test-cpu-sim-personalities.js` as the focused shape guardrail and the real headless `1995-96` boot as the truth-source verification.

**Tech Stack:** Vanilla JavaScript, CommonJS-style Node test scripts, PowerShell, existing browser-global helper module loaded by `rosterbate-season.html`

---

## Baseline note

At plan start, the worktree already contains an uncommitted weaker pass in:
- `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
- `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

That weaker pass:
- passed the focused helper/test sweep
- but only moved the live `1995-96` headless boot from `bigs_bias: 22` to `bigs_bias: 21`
- and still left `steady_floor: 0`

This stronger plan should treat that dirty baseline as the starting point, not revert it blindly.

## File map

- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
  - Keep the test as a shape guardrail while strengthening it around the new “real steady_floor lane” intent.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
  - Strengthen only classifier-shape logic inside `getRosterSummary()` and widen the `steady_floor` lane in `buildCpuSimPersonalitiesByTeam()`.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
  - Confirms the stronger assignment retune does not break shipped lineup helper behavior.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
  - Confirms the season-page seam still routes through the helper safely.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
  - Confirms historical drafted simulation state still snapshots cleanly.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`
  - Confirms compact slot persistence still preserves `cpuTeamPersonalitiesByTeam`.

### Task 1: Strengthen the helper guardrail around a real `steady_floor` lane

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Keep the archetype-based assertions, but make the `steady_floor` target reflect the stronger pass**

Retain the current test shape:
- star-heavy roster -> `star_loyalist`
- obvious frontcourt-heavy roster -> `bigs_bias`
- obvious guard-heavy roster -> `guards_bias`
- neutral mixed roster -> `balanced`
- mixed reliable roster -> `steady_floor`

If needed, strengthen the `steady_floor` target fixture slightly so it represents the newly approved wider lane without becoming trivial.

- [ ] **Step 2: Preserve deterministic assignment and bias/stability assertions**

Keep the existing protections that prove:
- deterministic assignment for the same league state
- `bigs_bias` still favors frontcourt profiles
- `guards_bias` still favors guard/creator profiles
- combo bigs still benefit from frontcourt bias
- `star_loyalist` still preserves stars more strongly

- [ ] **Step 3: Run the helper test and confirm the current dirty baseline still fails or is too weak for the stronger target**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected:
- either FAIL because the stronger `steady_floor` target or category behavior is not yet met
- or PASS but still known-insufficient for live QA, in which case record that the live boot remains the deciding proof

- [ ] **Step 4: Commit the stronger test target when it is in the intended pre-implementation state**

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js"
git commit -m "test: strengthen live cpu personality guardrails"
```

### Task 2: Materially flatten `bigLean` and open `steady_floor`

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Flatten `bigLean` more aggressively in `getRosterSummary()`**

Starting from the current local formula:

```js
summary.bigLean += defense * 2.5 + rebounding * 3.5 + overall;
```

make a stronger cut:
- reduce rebounding again
- reduce defense again
- keep `overall` present

The result should still let truly frontcourt-heavy teams win `bigs_bias`, but should stop moderately frontcourt-leaning classic teams from piling up there.

- [ ] **Step 2: Open a real `steady_floor` lane in `buildCpuSimPersonalitiesByTeam()`**

Retune only these thresholds:
- `STEADY_FLOOR_AVERAGE_SHAPE_THRESHOLD`
- `STEADY_FLOOR_LEAN_GAP_THRESHOLD`

Make them permissive enough that mixed classic rosters can actually qualify for `steady_floor`, while still keeping it more selective than a generic fallback.

- [ ] **Step 3: Keep all other classifier paths unchanged**

Do not change:
- `guardLean`
- `star_loyalist`
- fallback hashing model
- lineup bias scoring
- stable-threshold behavior
- team-specific logic

- [ ] **Step 4: Run the focused helper test until it passes**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: PASS with `cpu sim personalities helper test passed`.

- [ ] **Step 5: Commit the stronger classifier retune**

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js" "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js"
git commit -m "feat: strengthen live cpu personality classifier"
```

### Task 3: Verify focused regressions and the real `1995-96` boot

**Files:**
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`

- [ ] **Step 1: Run the focused regression sweep**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:
- `cpu sim personalities helper test passed`
- `cpu sim lineups policy test passed`
- `cpu sim lineup wiring test passed`
- `historical drafted-universe snapshot test passed`
- `historical universe slot storage test passed`

- [ ] **Step 2: Run one real headless `1995-96` boot check using the proven iframe/eval harness pattern**

Serve the repo locally and load:

```text
http://127.0.0.1:8082/rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1996_full_season_v1
```

Then inspect:
- `D.cpuTeamPersonalitiesByTeam`
- the per-label counts derived from that array

Use the same-origin harness approach already proven in this thread, with `eval('D')` inside the iframe page if needed.

Expected materially healthier live results:
- `bigs_bias` clearly below `21`
- `steady_floor` clearly above `0`
- `balanced` remains present
- `guards_bias` does not spike into a new dominant skew
- `star_loyalist` stays selective

- [ ] **Step 3: Confirm branch cleanliness after verification**

Run:

```powershell
git status --short --branch
```

Expected: clean branch state aside from the planned commits if the pass is ready, or a clearly documented dirty state if the stronger pass still needs another iteration.
