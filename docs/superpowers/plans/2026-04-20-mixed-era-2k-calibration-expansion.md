# Mixed-Era 2K Calibration Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the flagship `1996-2016-top300` 2K calibration dataset to a broader curated cross-section, then rerun the calibration-assisted audit so the next normalization retune is based on a stronger premium-tier sample.

**Architecture:** Keep runtime behavior and UI logic unchanged unless verification exposes a bug. Treat this as a data-and-audit pass: enlarge the authored calibration JSON, strengthen the audit view-model regression around the expanded sample, rerun the flagship audit page, and record the updated calibration-assisted verdict in the vault.

**Tech Stack:** Checked-in JSON data, CommonJS Node test scripts, vanilla JS runtime already in repo, PowerShell localhost verification, Edge headless browser verification, Markdown vault notes.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\audit-calibration\1996-2016-top300.2k.json`
  Purpose: store the curated `44`-player flagship 2K calibration sample with balanced era coverage and broad archetype coverage.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`
  Purpose: verify the expanded calibration fixture size, player coverage, era balance, and audit summary behavior.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`
  Purpose: no intended code change in this plan; it is the live consumer used for the calibration-assisted re-audit.

- `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md`
  Purpose: store the updated flagship audit notebook after the expanded calibration set is verified on the real board.

### Task 1: Expand The Flagship Calibration Dataset And Tighten Fixture Coverage

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\audit-calibration\1996-2016-top300.2k.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`

- [ ] **Step 1: Add a failing regression that locks the expanded calibration target**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`, add this block immediately after the `calibrationFixture` require:

```js
const expected1996Names = [
  'Michael Jordan',
  'Scottie Pippen',
  'Dennis Rodman',
  'Shawn Kemp',
  'Gary Payton',
  'Hakeem Olajuwon',
  'David Robinson',
  'Shaquille O\'Neal',
  'Karl Malone',
  'Alonzo Mourning',
  'Charles Barkley',
  'Patrick Ewing',
  'Grant Hill',
  'Jason Kidd',
  'Anfernee Hardaway',
  'Dikembe Mutombo',
  'John Stockton',
  'Mitch Richmond',
  'Clifford Robinson',
  'Reggie Miller',
  'Detlef Schrempf',
  'Chris Webber'
];

const expected2016Names = [
  'Stephen Curry',
  'Klay Thompson',
  'Draymond Green',
  'LeBron James',
  'Kawhi Leonard',
  'Russell Westbrook',
  'DeMarcus Cousins',
  'James Harden',
  'Kevin Durant',
  'Anthony Davis',
  'Chris Paul',
  'Damian Lillard',
  'Paul George',
  'Kyle Lowry',
  'Pau Gasol',
  'Andre Drummond',
  'Blake Griffin',
  'Rajon Rondo',
  'Karl-Anthony Towns',
  'Jimmy Butler',
  'Giannis Antetokounmpo',
  'Isaiah Thomas'
];

const calibrationNames = calibrationFixture.players.map((entry) => entry.name);
const calibration1996 = calibrationFixture.players.filter((entry) => entry.historicalPackId === 'nba_1996_full_season_v1');
const calibration2016 = calibrationFixture.players.filter((entry) => entry.historicalPackId === 'nba_2016_full_season_v1');

assert.strictEqual(calibrationFixture.players.length, 44);
assert.strictEqual(calibration1996.length, 22);
assert.strictEqual(calibration2016.length, 22);
expected1996Names.forEach((name) => assert.ok(calibrationNames.includes(name), `expected 1996 calibration entry for ${name}`));
expected2016Names.forEach((name) => assert.ok(calibrationNames.includes(name), `expected 2016 calibration entry for ${name}`));
assert.strictEqual(
  calibrationNames.filter((name) => name === 'Gheorghe Mureșan' || name === 'Gheorghe Muresan').length,
  0,
  'do not add duplicate Muresan variants to the calibration set'
);
```

- [ ] **Step 2: Run the regression and verify it fails first**

Run:

```powershell
node .\tools\test-mixed-era-audit-view-model.js
```

Expected: FAIL because the calibration fixture still contains only `11` players.

- [ ] **Step 3: Expand the calibration JSON to the curated `44`-player target**

Edit `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\audit-calibration\1996-2016-top300.2k.json`.

Keep the current top-level metadata and existing entry shape. Expand the `players` array so it contains exactly these `44` names:

```js
const finalCalibrationRoster = {
  'nba_1996_full_season_v1': [
    'Michael Jordan',
    'Scottie Pippen',
    'Dennis Rodman',
    'Shawn Kemp',
    'Gary Payton',
    'Hakeem Olajuwon',
    'David Robinson',
    'Shaquille O\'Neal',
    'Karl Malone',
    'Alonzo Mourning',
    'Charles Barkley',
    'Patrick Ewing',
    'Grant Hill',
    'Jason Kidd',
    'Anfernee Hardaway',
    'Dikembe Mutombo',
    'John Stockton',
    'Mitch Richmond',
    'Clifford Robinson',
    'Reggie Miller',
    'Detlef Schrempf',
    'Chris Webber'
  ],
  'nba_2016_full_season_v1': [
    'Stephen Curry',
    'Klay Thompson',
    'Draymond Green',
    'LeBron James',
    'Kawhi Leonard',
    'Russell Westbrook',
    'DeMarcus Cousins',
    'James Harden',
    'Kevin Durant',
    'Anthony Davis',
    'Chris Paul',
    'Damian Lillard',
    'Paul George',
    'Kyle Lowry',
    'Pau Gasol',
    'Andre Drummond',
    'Blake Griffin',
    'Rajon Rondo',
    'Karl-Anthony Towns',
    'Jimmy Butler',
    'Giannis Antetokounmpo',
    'Isaiah Thomas'
  ]
};
```

Author each new player with the same schema already used in the file:

```json
{
  "name": "Kevin Durant",
  "historicalPackId": "nba_2016_full_season_v1",
  "2kOverall": 98.0,
  "inside": 88,
  "outside": 97,
  "athleticism": 90,
  "playmaking": 84,
  "defense": 82,
  "rebounding": 78,
  "notes": "Primary scoring wing and crossover anchor."
}
```

Rules while editing:

- keep exactly `22` entries per era
- keep `Dennis Rodman` as the one deliberate out-of-band specialist even though he is outside the current live `top100`
- do not add both `Gheorghe Mureșan` and `Gheorghe Muresan`
- if a 2K season/version match is unclear for a target name, do not guess; stop and resolve the source before finishing the task

- [ ] **Step 4: Re-run the regression and verify it passes**

Run:

```powershell
node .\tools\test-mixed-era-audit-view-model.js
```

Expected:

```text
mixed-era audit view-model test passed
```

- [ ] **Step 5: Commit the expanded dataset and regression**

Run:

```powershell
git add historical-packs/mixed-era/audit-calibration/1996-2016-top300.2k.json tools/test-mixed-era-audit-view-model.js
git commit -m "feat: expand flagship 2k calibration sample"
```

### Task 2: Re-Audit The Flagship Board With The Expanded Calibration Sample

**Files:**
- Create: `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md`
- Reference: `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md`
- Reference: `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-notebook-format.md`

- [ ] **Step 1: Start the local audit server on the current repo root**

Run:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -RootPath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'"
```

If `8082` is already taken, rerun the same command on `8092` and use that substituted port in the next steps.

- [ ] **Step 2: Verify the expanded calibration sample on the real audit page**

Open:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300
```

Record these specific observations:

- `Calibration Summary` count of `44` calibrated rows and `256` uncalibrated rows
- the top `5` over-ranked names shown in the summary
- the top `5` under-ranked names shown in the summary
- whether the strongest mismatches are still mostly older-era interior / defense profiles, or whether the disagreement is broader
- whether `11-25`, `26-50`, and `51-100` now feel meaningfully more explainable with the calibration layer visible

Also verify the graceful fallback path:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top100
```

Expected on `top100`:

- `Calibrated` stays `0`
- `Uncalibrated` stays `100`
- row cells for `2K OVR`, `Delta`, and `Mismatch` show `—`

- [ ] **Step 3: Write the new calibration-assisted audit notebook**

Create `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md`.

Start from the existing notebook at:

```text
C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md
```

Preserve the same section order, then add one new section between `Composition Results` and `Star Fairness Notes`:

```md
## Calibration Summary
- Calibrated Rows: record the observed calibrated and uncalibrated counts from the live audit page.
- Strongest Over-Ranked Signals: list the clearest `3-5` names from the calibration summary and what the disagreement seems to mean.
- Strongest Under-Ranked Signals: list the clearest `3-5` names from the calibration summary and what the disagreement seems to mean.
- Coverage Notes: state whether the expanded `44`-player set now gives useful signal in `11-25`, `26-50`, and `51-100`.
```

Required content for the new note:

- keep the original board context and composition results current with the live page
- explicitly state that the calibration file now covers `44` curated players
- summarize whether the biggest disagreements cluster in older-era interior/defense profiles, specific star outliers, or broader multi-archetype disagreement
- end with an updated `Outcome` and `Next Action`

- [ ] **Step 4: Stop the temporary server after the notebook is saved**

Stop the localhost server process you started in Step 1 before moving to the final verification sweep.

### Task 3: Run The Final Verification Sweep And Confirm Cleanliness

**Files:**
- No additional repo edits intended

- [ ] **Step 1: Run the mixed-era regression suite from the repo root**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
node .\tools\test-mixed-era-runtime.js
node .\tools\test-mixed-era-universe-summary.js
node .\tools\test-mixed-era-audit-view-model.js
node .\tools\test-mixed-era-audit-page-static.js
node .\tools\test-mixed-era-top300-primary-wiring.js
```

Expected:

```text
mixed-era loader smoke test passed
mixed-era runtime test passed
mixed-era universe summary test passed
mixed-era audit view-model test passed
mixed-era audit page static test passed
mixed-era top300 primary wiring test passed
```

- [ ] **Step 2: Restart the local audit server for one headless browser verification pass**

Run:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -RootPath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'"
```

If `8082` is unavailable, use the same substitute port you used in Task 2 and keep it consistent below.

- [ ] **Step 3: Do one headless browser verification pass for the flagship board**

Run:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --virtual-time-budget=10000 --dump-dom 'http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300'
```

Expected in the dumped DOM:

- `Calibration Summary`
- `Calibrated</span><strong>44`
- `2K OVR`
- `Mismatch`

- [ ] **Step 4: Stop the temporary server and verify the repo is clean when work is done**

Stop the temporary localhost server, then run:

```powershell
git status --short --branch
```

Expected:

- one clean feature branch
- no uncommitted repo changes after the data expansion commit
- vault note exists outside the repo but does not dirty git
