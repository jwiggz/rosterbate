# Live-Boot-Driven CPU Personality Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce live `1995-96` historical sim overproduction of `bigs_bias` by softening the classifier shape in `buildCpuSimPersonalitiesByTeam()`, increasing `balanced` as the main fallback, and making `steady_floor` possible without changing lineup behavior or persistence.

**Architecture:** Keep season-page wiring, lineup scoring, and persistence untouched. Retune only the assignment helper in `cpu-sim-personalities.js` by softening frontcourt lean accumulation and lightly widening the `steady_floor` lane. Use `tools/test-cpu-sim-personalities.js` as the focused guardrail and the real live `1995-96` boot as the truth-source verification.

**Tech Stack:** Vanilla JavaScript, CommonJS-style Node test scripts, PowerShell, existing browser-global helper module loaded by `rosterbate-season.html`

---

## File map

- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
  - Reframe the helper fixture so it still protects deterministic assignment and bias behavior while matching the new “soften bigLean, mostly increase balanced, lightly allow steady_floor” intent.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
  - Retune only classifier-shape logic inside `getRosterSummary()` and, if needed, slightly relax the `steady_floor` thresholds in `buildCpuSimPersonalitiesByTeam()`.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
  - Confirms assignment retuning does not break shipped lineup helper behavior.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
  - Confirms the season-page seam still routes through the helper safely.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
  - Confirms historical drafted simulation state still snapshots cleanly.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`
  - Confirms compact slot persistence still preserves `cpuTeamPersonalitiesByTeam`.

### Task 1: Re-align the helper test with the live-boot-driven follow-up

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Update the deterministic spread fixture to match the new live-driven intent**

Keep the existing test structure, but retune the fixture expectations so it protects these outcomes:
- obvious star-heavy roster still resolves to `star_loyalist`
- obvious frontcourt-heavy roster still resolves to `bigs_bias`
- obvious guard-heavy roster still resolves to `guards_bias`
- mixed neutral roster can resolve to `balanced`
- at least one mixed reliable roster can resolve to `steady_floor`

Do **not** rewrite this as an exact live-count test. The helper should stay a shape guardrail, not a replica of the whole `1995-96` league.

- [ ] **Step 2: Preserve the existing bias/stability helper assertions**

Keep or lightly adapt the current assertions that prove:
- `bigs_bias` favors frontcourt profiles
- `guards_bias` favors guard/creator profiles
- combo bigs still benefit from frontcourt bias
- `star_loyalist` preserves stars more strongly
- deterministic assignment remains stable for the same league state

- [ ] **Step 3: Run the helper test and confirm the current runtime fails for the right reason**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: FAIL because the current helper still over-reads frontcourt lean and/or fails to surface the intended `balanced` / `steady_floor` outcomes cleanly enough.

- [ ] **Step 4: Commit the failing test target**

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js"
git commit -m "test: target live-driven cpu personality follow-up"
```

### Task 2: Retune classifier shape, not just thresholds

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Soften `bigLean` accumulation in `getRosterSummary()`**

Retune only the frontcourt-side accumulation so it is less steep for classic rosters:
- reduce the rebounding contribution
- reduce the defense contribution
- keep `overall` in the calculation so truly frontcourt-shaped teams still stand out

Leave `guardLean` unchanged unless a tiny symmetry tweak is clearly required by the helper test.

- [ ] **Step 2: Lightly widen the `steady_floor` lane if helper coverage still requires it**

If the softened `bigLean` shape alone is not enough, make a small threshold adjustment:
- lower `STEADY_FLOOR_AVERAGE_SHAPE_THRESHOLD` somewhat
- loosen `STEADY_FLOOR_LEAN_GAP_THRESHOLD` somewhat

Keep `steady_floor` selective. The main relief valve should still be `balanced`, not a mass migration into `steady_floor`.

- [ ] **Step 3: Keep `star_loyalist`, `guards_bias`, and fallback wiring otherwise unchanged**

Do not:
- add new personalities
- add post-hoc rebalance logic
- add team-specific overrides
- change lineup bias scoring or stable-threshold behavior

- [ ] **Step 4: Run the focused helper test until it passes**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: PASS with `cpu sim personalities helper test passed`.

- [ ] **Step 5: Commit the classifier retune**

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js" "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js"
git commit -m "feat: retune live cpu personality classifier shape"
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
- `cpu sim lineups helper test passed`
- `cpu sim lineup wiring seam test passed`
- `historical drafted universe snapshot test passed`
- `historical universe slot storage test passed`

- [ ] **Step 2: Run one real live `1995-96` headless boot check**

Reuse the existing local server + headless browser QA path already used in this thread to load:

```text
http://127.0.0.1:8082/rosterbate-season.html?historical=sim
```

Then inspect:
- `D.cpuTeamPersonalitiesByTeam`
- the per-label counts from:

```js
D.cpuTeamPersonalitiesByTeam.reduce((counts, value) => {
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {})
```

Expected directionally healthier live results:
- `bigs_bias` clearly down from `22`
- `balanced` clearly up from `1`
- `steady_floor` nonzero
- `guards_bias` not wildly inflated
- `star_loyalist` still selective

- [ ] **Step 3: Confirm the branch is clean after verification**

Run:

```powershell
git status --short --branch
```

Expected: clean branch state with only the two planned commits from Task 1 and Task 2.
