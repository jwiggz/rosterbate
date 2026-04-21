# Guard-Side Threshold Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the stronger live-boot CPU personality retune by making `guards_bias` harder to earn, while preserving the stronger pass’s real gains: reduced `bigs_bias`, visible `steady_floor`, and unchanged lineup behavior.

**Architecture:** Start from the current local stronger-pass baseline in `cpu-sim-personalities.js` and `tools/test-cpu-sim-personalities.js`. Do not undo the flatter `bigLean` formula or the new `steady_floor` lane. Only split the current shared lean-gap rule into separate thresholds for `bigs_bias` and `guards_bias`, then re-verify the real `1995-96` headless boot.

**Tech Stack:** Vanilla JavaScript, CommonJS-style Node test scripts, PowerShell, existing browser-global helper module loaded by `rosterbate-season.html`

---

## Baseline note

At plan start, the worktree already contains an uncommitted stronger pass in:
- `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
- `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

That baseline currently produces this live `1995-96` headless spread:
- `steady_floor: 6`
- `bigs_bias: 7`
- `guards_bias: 13`
- `balanced: 1`
- `star_loyalist: 2`

This correction plan should preserve those frontcourt and `steady_floor` gains while bringing `guards_bias` down.

## File map

- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
  - Replace the single shared bias lean-gap threshold with separate thresholds, keeping `bigs_bias` at the stronger-pass level and raising the `guards_bias` threshold above it.
- Modify only if needed: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
  - Keep the stronger-pass helper guardrail intact; only update if a narrower assertion needs alignment with the split-threshold design.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
  - Confirms the assignment correction does not break shipped lineup helper behavior.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
  - Confirms the season-page seam still routes through the helper safely.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
  - Confirms historical drafted simulation state still snapshots cleanly.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`
  - Confirms compact slot persistence still preserves `cpuTeamPersonalitiesByTeam`.

### Task 1: Keep the stronger-pass helper guardrail intact

**Files:**
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Re-run the helper test against the current stronger-pass baseline**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: PASS.

This confirms the correction is starting from the known stronger-pass archetype guardrail rather than from the older weaker pass.

- [ ] **Step 2: Only edit the helper test if the split-threshold correction requires a clearer assertion**

Do not broaden or weaken the helper test.

Only adjust it if:
- the guard-heavy fixture needs a slightly stronger lead to remain an obviously valid `guards_bias` case under the new stricter threshold
- or a current assertion becomes too brittle for reasons unrelated to the product intent

If no change is needed, leave `tools/test-cpu-sim-personalities.js` untouched in this correction pass.

### Task 2: Split the shared threshold into asymmetric bias thresholds

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Introduce separate threshold constants**

Starting from the current stronger-pass constant:

```js
const POSITION_LEAN_GAP_THRESHOLD = 175;
```

replace it with two constants:
- one for `bigs_bias`
- one for `guards_bias`

Recommended direction:
- keep the `bigs_bias` threshold at the current stronger-pass level
- raise the `guards_bias` threshold materially above it

- [ ] **Step 2: Update `buildCpuSimPersonalitiesByTeam()` to use the asymmetric thresholds**

Change only the two bias checks:
- `summary.bigLean >= summary.guardLean + BIGS_BIAS_LEAN_GAP_THRESHOLD`
- `summary.guardLean >= summary.bigLean + GUARDS_BIAS_LEAN_GAP_THRESHOLD`

Do not change:
- `bigLean` formula
- `guardLean` formula
- `STEADY_FLOOR_AVERAGE_SHAPE_THRESHOLD`
- `STEADY_FLOOR_LEAN_GAP_THRESHOLD`
- `star_loyalist`

- [ ] **Step 3: Re-run the helper test until it passes**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: PASS with `cpu sim personalities helper test passed`.

- [ ] **Step 4: Commit the correction**

If only `cpu-sim-personalities.js` changes:

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js"
git commit -m "feat: correct guard-side cpu personality threshold"
```

If the helper test also changes:

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js" "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js"
git commit -m "feat: correct guard-side cpu personality threshold"
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

- [ ] **Step 2: Re-run the real headless `1995-96` boot check with the existing iframe/eval harness pattern**

Load:

```text
http://127.0.0.1:8082/rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1996_full_season_v1
```

Inspect:
- `D.cpuTeamPersonalitiesByTeam`
- the per-label counts derived from that array

Expected healthier live results than the current stronger-pass baseline:
- `steady_floor` stays above `0`
- `bigs_bias` stays well below the old `22`
- `guards_bias` drops below `13`
- `balanced` remains present
- `star_loyalist` stays selective

- [ ] **Step 3: Confirm branch cleanliness after verification**

Run:

```powershell
git status --short --branch
```

Expected: clean branch state aside from the intentional stronger-pass baseline if the correction still needs one more iteration, or a clean ready-to-merge state if the correction succeeds fully.
