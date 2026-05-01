# Trade Builder Modal V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace cramped inline Trade Desk selectors with a partner-card-to-modal trade builder that supports package trades up to 5 players per side.

**Architecture:** Keep all V1 changes in the existing single-page season shell, but isolate behavior into named helpers inside `rosterbate-season.html`: package selection state, package evaluation, modal rendering, and modal apply. Existing trade fairness and roster mutation paths should be reused and generalized instead of duplicated. Tests stay in the current Node harnesses and assert source-level UI contracts plus package math.

**Tech Stack:** Plain HTML/CSS/JavaScript in `rosterbate-season.html`, existing simulation season adapter APIs, existing Node test harnesses in `tools/`, local browser QA through the in-app browser.

---

## File Map

- Modify `rosterbate-season.html`
  - `renderSimulationTradesInSharedShell()` becomes the clean partner-card desk.
  - Add package helper functions near the current trade preview helpers around `renderSimulationTradePreviewMarkup`.
  - Add modal functions near the simulation Trade Desk renderer: `openSimulationTradeBuilderModal`, `renderSimulationTradeBuilderModal`, `updateSimulationTradeBuilderPreview`, `applySimulationTradeBuilderFromModal`, and `closeSimulationTradeBuilderModal`.
  - Keep `applySimulationTradeFromShell(partnerAbbr)` as a compatibility wrapper that calls `applySimulationTradePackageFromShell(partnerAbbr, [outgoingId], [incomingId])`.
- Modify `tools/test-shared-season-shell-simulation.js`
  - Add source assertions for the modal helpers.
  - Add DOM/harness assertions that partner cards show `Build Trade`, modal markup opens, disabled/enabled states work, and package preview text renders.
- Modify `tools/test-trade-fairness-evaluator.js`
  - Add package fairness unit cases for `3-for-1`, `1-for-3`, and `5-for-5`.

---

### Task 1: Package Fairness Helper Contract

**Files:**
- Modify: `rosterbate-season.html`
- Test: `tools/test-trade-fairness-evaluator.js`

- [ ] **Step 1: Write the failing source and behavior test**

Add these assertions near the existing fairness helper source assertions in `tools/test-trade-fairness-evaluator.js`:

```js
expectSourceMatch(/function evaluateTradePackageFairness\(offer\)/, 'missing package fairness helper');
expectSourceMatch(/function getTradeFairnessWaiverFillIns\(offer,\s*count\)/, 'missing package waiver fill-in helper');
expectSourceMatch(/function getTradeFairnessLikelyDrops\(offer,\s*count\)/, 'missing package likely-drop helper');
```

Add the extracted functions to the `script` array after `getTradeFairnessReplacementRead(offer)`:

```js
extractFunctionSource('getTradeFairnessWaiverFillIns(offer, count)'),
extractFunctionSource('getTradeFairnessLikelyDrops(offer, count)'),
extractFunctionSource('evaluateTradePackageFairness(offer)'),
```

Add these players to the `players` fixture:

```js
42: { id: 42, name: 'Waiver Guard', team: 'NYK', fp: 24, pos: 'PG', pg: 1, g: 1, util: 1 },
43: { id: 43, name: 'Waiver Big', team: 'DEN', fp: 22, pos: 'C', c: 1, util: 1 },
13: { id: 13, name: 'Low Bench Wing', fp: 11, pos: 'SF', sf: 1, f: 1, util: 1 },
14: { id: 14, name: 'Deep Bench Guard', fp: 8, pos: 'PG', pg: 1, g: 1, util: 1 }
```

Update the fixture context so waivers have three fill-ins:

```js
G: { rosters, waiver: [players[41], players[42], players[43]] },
```

Add these tests after the existing package fairness assertions:

```js
const threeForOne = context.evaluateTradePackageFairness({
  fromTeam: 0,
  toTeam: 1,
  give: [11, 12, 13],
  get: [21]
});
assert.equal(threeForOne.supported, true);
assert.equal(threeForOne.openSlotsForFrom, 2);
assert.equal(threeForOne.fillInsForFrom.length, 2);
assert.match(threeForOne.message, /2 waiver fill-ins/i);
assert.match(threeForOne.message, /Waiver Starter/i);

const oneForThree = context.evaluateTradePackageFairness({
  fromTeam: 0,
  toTeam: 1,
  give: [21],
  get: [11, 12, 13]
});
assert.equal(oneForThree.supported, true);
assert.equal(oneForThree.dropPressureForFrom, 2);
assert.equal(oneForThree.likelyDropsForFrom.length, 2);
assert.match(oneForThree.message, /likely drop/i);

const fiveForFive = context.evaluateTradePackageFairness({
  fromTeam: 0,
  toTeam: 1,
  give: [11, 12, 13, 14, 41],
  get: [21, 22, 31, 32, 42]
});
assert.equal(fiveForFive.supported, true);
assert.equal(fiveForFive.openSlotsForFrom, 0);
assert.equal(fiveForFive.dropPressureForFrom, 0);
assert.equal(fiveForFive.fillInsForFrom.length, 0);
assert.equal(fiveForFive.likelyDropsForFrom.length, 0);
```

- [ ] **Step 2: Run the fairness test and verify it fails**

Run:

```powershell
node .\tools\test-trade-fairness-evaluator.js
```

Expected: fails because `evaluateTradePackageFairness`, `getTradeFairnessWaiverFillIns`, and `getTradeFairnessLikelyDrops` do not exist.

- [ ] **Step 3: Add package fairness helpers**

In `rosterbate-season.html`, near `getTradeFairnessReplacementRead(offer)`, add:

```js
function getTradeFairnessWaiverFillIns(offer, count){
  const needed=Math.max(0, Number(count||0));
  if(!needed) return [];
  const selectedIds=new Set([
    ...(Array.isArray(offer?.give)?offer.give:[]),
    ...(Array.isArray(offer?.get)?offer.get:[])
  ].map(Number).filter(Number.isFinite));
  const data=typeof D!=='undefined' ? D : {};
  const pools=[
    ...(Array.isArray(G?.waiver)?G.waiver:[]),
    ...(Array.isArray(G?.freeAgents)?G.freeAgents:[]),
    ...(Array.isArray(data?.waiver)?data.waiver:[]),
    ...(Array.isArray(data?.freeAgents)?data.freeAgents:[])
  ];
  const seen=new Set();
  return pools.map(entry=>{
    const player=entry && typeof entry==='object' ? entry : (typeof P==='function' ? P(entry) : null);
    return player || null;
  }).filter(player=>{
    const id=Number(player?.id);
    if(!Number.isFinite(id) || selectedIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return getTradeFairnessPlayerValue(player)>0;
  }).sort((a,b)=>getTradeFairnessPlayerValue(b)-getTradeFairnessPlayerValue(a)).slice(0, needed).map(player=>({
    player,
    value:getTradeFairnessPlayerValue(player),
    label:player?.name || 'best waiver player'
  }));
}

function getTradeFairnessLikelyDrops(offer, count){
  const needed=Math.max(0, Number(count||0));
  if(!needed) return [];
  const selectedGetIds=new Set((Array.isArray(offer?.get)?offer.get:[]).map(Number).filter(Number.isFinite));
  const fromTeam=Number(offer?.fromTeam);
  const roster=Array.isArray(G?.rosters?.[fromTeam]) ? G.rosters[fromTeam] : [];
  return roster.filter(player=>{
    const id=Number(player?.id);
    return Number.isFinite(id) && !selectedGetIds.has(id);
  }).sort((a,b)=>getTradeFairnessPlayerValue(a)-getTradeFairnessPlayerValue(b)).slice(0, needed).map(player=>({
    player,
    value:getTradeFairnessPlayerValue(player),
    label:player?.name || 'likely drop'
  }));
}

function evaluateTradePackageFairness(offer){
  const give=Array.isArray(offer?.give) ? offer.give.filter(value=>value!=null) : [];
  const get=Array.isArray(offer?.get) ? offer.get.filter(value=>value!=null) : [];
  if(!give.length || !get.length){
    return {
      supported:false,
      rating:'unsupported',
      message:'Choose at least one player on both sides.'
    };
  }
  if(give.length>5 || get.length>5){
    return {
      supported:false,
      rating:'unsupported',
      message:'Package trades are capped at 5 players per side.'
    };
  }
  const resolvePlayer=id=>typeof P==='function' ? P(id)||null : null;
  const givePlayers=give.map(resolvePlayer).filter(Boolean);
  const getPlayers=get.map(resolvePlayer).filter(Boolean);
  if(givePlayers.length!==give.length || getPlayers.length!==get.length){
    return {
      supported:false,
      rating:'unsupported',
      message:'One or more selected players could not be resolved.'
    };
  }
  const giveValue=givePlayers.reduce((sum,player)=>sum+getTradeFairnessPlayerValue(player),0);
  const getValue=getPlayers.reduce((sum,player)=>sum+getTradeFairnessPlayerValue(player),0);
  const openSlotsForFrom=Math.max(0, give.length-get.length);
  const dropPressureForFrom=Math.max(0, get.length-give.length);
  const fillInsForFrom=getTradeFairnessWaiverFillIns(offer, openSlotsForFrom);
  const likelyDropsForFrom=getTradeFairnessLikelyDrops(offer, dropPressureForFrom);
  const fillInValue=fillInsForFrom.reduce((sum,entry)=>sum+Number(entry?.value||0),0);
  const dropValue=likelyDropsForFrom.reduce((sum,entry)=>sum+Number(entry?.value||0),0);
  const adjustedReceiveValue=+(getValue + fillInValue - dropValue).toFixed(1);
  const adjustedSendValue=+giveValue.toFixed(1);
  const adjustedGap=+Math.abs(adjustedReceiveValue-adjustedSendValue).toFixed(1);
  let rating='high_risk';
  if(adjustedGap<=4) rating='fair';
  else if(adjustedGap<=9) rating='slight_lean';
  else if(adjustedGap<=16) rating='uneven';
  const fillInText=openSlotsForFrom ? ` + ${openSlotsForFrom} waiver fill-ins (${fillInsForFrom.map(entry=>entry.label).join(', ') || 'none available'})` : '';
  const dropText=dropPressureForFrom ? `, likely drop ${likelyDropsForFrom.map(entry=>entry.label).join(', ') || 'bench depth'}` : '';
  return {
    supported:true,
    rating,
    packageRead:true,
    givePlayers,
    getPlayers,
    giveValue:+giveValue.toFixed(1),
    getValue:+getValue.toFixed(1),
    adjustedReceiveValue,
    adjustedSendValue,
    adjustedGap,
    openSlotsForFrom,
    dropPressureForFrom,
    fillInsForFrom,
    likelyDropsForFrom,
    message:`Package read: you get ${getPlayers.length} player${getPlayers.length===1?'':'s'}${fillInText}${dropText}. Adjusted value ${adjustedReceiveValue.toFixed(1)} FP vs ${adjustedSendValue.toFixed(1)} FP sent.`
  };
}
```

- [ ] **Step 4: Route existing fairness through the package helper**

Change the start of `evaluateOneForOneTradeFairness(offer)` so multi-player packages delegate:

```js
function evaluateOneForOneTradeFairness(offer){
  const give=Array.isArray(offer?.give) ? offer.give.filter(value=>value!=null) : [];
  const get=Array.isArray(offer?.get) ? offer.get.filter(value=>value!=null) : [];
  if(give.length!==1 || get.length!==1){
    return evaluateTradePackageFairness(offer);
  }
  // keep the existing one-for-one body below
}
```

Remove the old inline multi-player branch that only handled a single replacement.

- [ ] **Step 5: Run the fairness test and verify it passes**

Run:

```powershell
node .\tools\test-trade-fairness-evaluator.js
```

Expected: `trade fairness evaluator test passed`.

- [ ] **Step 6: Commit Task 1**

Run:

```powershell
git add -- rosterbate-season.html tools/test-trade-fairness-evaluator.js
git commit -m "Generalize package trade fairness"
```

---

### Task 2: Modal Source Contract and Partner Card Cleanup

**Files:**
- Modify: `rosterbate-season.html`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Write failing source assertions**

In `tools/test-shared-season-shell-simulation.js`, add source assertions near the Trade Desk tests:

```js
assert.match(html, /function openSimulationTradeBuilderModal\(partnerAbbr\)/, 'simulation Trade Desk should expose a trade builder modal opener');
assert.match(html, /function closeSimulationTradeBuilderModal\(\)/, 'simulation Trade Desk should expose a trade builder modal closer');
assert.match(html, /function renderSimulationTradeBuilderModal\(partnerAbbr\)/, 'simulation Trade Desk should render a package trade modal');
assert.match(html, /function updateSimulationTradeBuilderPreview\(partnerAbbr\)/, 'simulation Trade Desk should update package preview from modal selections');
assert.match(html, /function applySimulationTradeBuilderFromModal\(partnerAbbr\)/, 'simulation Trade Desk should apply package trades from the modal');
assert.match(html, /Build Trade/i, 'simulation Trade Desk partner cards should expose Build Trade instead of inline-only selectors');
```

- [ ] **Step 2: Run the shared shell test and verify it fails**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
```

Expected: fails because the modal helper functions do not exist.

- [ ] **Step 3: Add modal shell helpers**

In `rosterbate-season.html`, near `renderSimulationTradesInSharedShell()`, add:

```js
function closeSimulationTradeBuilderModal(){
  const modal=document.getElementById('simulationTradeBuilderModal');
  if(modal) modal.remove();
}

function openSimulationTradeBuilderModal(partnerAbbr){
  closeSimulationTradeBuilderModal();
  document.body.insertAdjacentHTML('beforeend', renderSimulationTradeBuilderModal(partnerAbbr));
  updateSimulationTradeBuilderPreview(partnerAbbr);
}

function renderSimulationTradeBuilderPlayerOption(player, side, partnerAbbr){
  if(!player) return '';
  const id=Number(player?.id);
  const name=escapeSimulationShellHtml(player?.name || 'Unknown Player');
  const meta=escapeSimulationShellHtml(`${player?.team || '--'} · ${player?.pos || player?.position || 'UTIL'} · ${Number(player?.fp||0).toFixed(1)} FP`);
  return `<label style="display:flex;align-items:center;gap:10px;border:1px solid rgba(148,163,184,.18);border-radius:10px;padding:9px;background:rgba(15,23,42,.72);cursor:pointer;">
    <input type="checkbox" data-trade-builder-side="${side}" data-trade-builder-partner="${escapeSimulationShellHtml(partnerAbbr)}" value="${id}" onchange="updateSimulationTradeBuilderPreview('${escapeSimulationShellHtml(partnerAbbr)}')">
    <span style="display:grid;gap:2px;">
      <span style="font-weight:900;color:#f8fafc;">${name}</span>
      <span style="font-size:11px;color:#94a3b8;">${meta}</span>
    </span>
  </label>`;
}

function renderSimulationTradeBuilderModal(partnerAbbr){
  const tradeVm=SEASON_MODE_ADAPTER.getTradeViewModel?.() || {};
  const partner=Array.isArray(tradeVm.partners) ? tradeVm.partners.find(entry=>String(entry?.teamAbbr||'').toUpperCase()===String(partnerAbbr||'').toUpperCase()) : null;
  const partnerName=escapeSimulationShellHtml(partner?.teamName || partner?.teamAbbr || 'Trade Partner');
  const outgoing=(tradeVm.outgoingRoster || []).slice().sort((a,b)=>Number(b?.fp||0)-Number(a?.fp||0));
  const incoming=(partner?.roster || []).slice().sort((a,b)=>Number(b?.fp||0)-Number(a?.fp||0));
  return `<div id="simulationTradeBuilderModal" class="season-modal-backdrop" style="position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;">
    <div class="season-hero-card" style="width:min(1180px,96vw);max-height:90vh;overflow:hidden;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid rgba(148,163,184,.18);">
        <div>
          <div style="font-family:var(--fd);font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#38bdf8;">Trade Builder</div>
          <div style="font-family:var(--fb);font-size:24px;font-weight:900;color:#f8fafc;">Trade With ${partnerName}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="bp" id="simulationTradeBuilderApply" onclick="applySimulationTradeBuilderFromModal('${escapeSimulationShellHtml(partnerAbbr)}')" disabled>Apply Trade</button>
          <button class="bp secondary" onclick="closeSimulationTradeBuilderModal()">Close</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px;overflow:auto;">
        <section>
          <div style="font-family:var(--fb);font-size:18px;font-weight:900;color:#f8fafc;margin-bottom:10px;">You Send</div>
          <div style="display:grid;gap:8px;">${outgoing.map(player=>renderSimulationTradeBuilderPlayerOption(player, 'outgoing', partnerAbbr)).join('')}</div>
        </section>
        <section>
          <div style="font-family:var(--fb);font-size:18px;font-weight:900;color:#f8fafc;margin-bottom:10px;">You Get</div>
          <div style="display:grid;gap:8px;">${incoming.map(player=>renderSimulationTradeBuilderPlayerOption(player, 'incoming', partnerAbbr)).join('')}</div>
        </section>
      </div>
      <div id="simulationTradeBuilderPreview" style="border-top:1px solid rgba(148,163,184,.18);padding:14px 18px;background:rgba(15,23,42,.9);"></div>
    </div>
  </div>`;
}
```

- [ ] **Step 4: Replace inline partner selectors with Build Trade cards**

In `renderSimulationTradesInSharedShell()`, change each partner card so it no longer renders outgoing/incoming `<select>` controls. The card should end with:

```html
<button class="bp" style="margin-top:12px;" onclick="openSimulationTradeBuilderModal('${partnerAbbr}')">Build Trade</button>
```

Keep the current partner summary card layout, but change the helper copy from `Pick the roster you want to test for a one-for-one deal.` to:

```html
Pick a partner, then build anything from a quick one-for-one to a five-player package.
```

- [ ] **Step 5: Run the shared shell test and verify it passes**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
```

Expected: `shared season shell simulation test passed`.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git add -- rosterbate-season.html tools/test-shared-season-shell-simulation.js
git commit -m "Add trade builder modal shell"
```

---

### Task 3: Modal Selection Preview and Validation

**Files:**
- Modify: `rosterbate-season.html`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Write failing DOM preview tests**

In `tools/test-shared-season-shell-simulation.js`, after rendering the Trade Desk, add:

```js
api.renderSimulationTradesInSharedShell();
api.openSimulationTradeBuilderModal('BOS');
assert.match(elementsBodyHtml(), /Trade With Boston/i, 'trade builder modal should open for the selected partner');
assert.match(elementsBodyHtml(), /You Send/i, 'trade builder modal should render outgoing side');
assert.match(elementsBodyHtml(), /You Get/i, 'trade builder modal should render incoming side');
assert.match(elementsBodyHtml(), /Choose at least one player on both sides/i, 'trade builder preview should explain empty selections');
```

If the harness does not have an `elementsBodyHtml()` helper, add this local helper near the DOM stubs:

```js
function elementsBodyHtml(){
  return Object.values(elements).map(element=>String(element.innerHTML || '')).join('\n') + String(document.body?.innerHTML || '');
}
```

- [ ] **Step 2: Run the shared shell test and verify it fails**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
```

Expected: fails until modal preview writes empty-selection feedback.

- [ ] **Step 3: Implement selection readers and preview updater**

In `rosterbate-season.html`, add:

```js
function getSimulationTradeBuilderSelectedIds(partnerAbbr, side){
  return Array.from(document.querySelectorAll(`[data-trade-builder-partner="${CSS.escape(String(partnerAbbr||''))}"][data-trade-builder-side="${side}"]:checked`))
    .map(input=>Number(input.value))
    .filter(Number.isFinite);
}

function getSimulationTradeBuilderPlayerById(id){
  const numericId=Number(id);
  const pools=[
    ...(Array.isArray(G?.rosters) ? G.rosters.flat() : []),
    ...(Array.isArray(G?.waiver) ? G.waiver : []),
    ...(Array.isArray(D?.freeAgents) ? D.freeAgents : [])
  ];
  return pools.find(player=>Number(player?.id)===numericId) || null;
}

function updateSimulationTradeBuilderPreview(partnerAbbr){
  const preview=document.getElementById('simulationTradeBuilderPreview');
  const applyButton=document.getElementById('simulationTradeBuilderApply');
  if(!preview) return;
  const outgoingIds=getSimulationTradeBuilderSelectedIds(partnerAbbr, 'outgoing');
  const incomingIds=getSimulationTradeBuilderSelectedIds(partnerAbbr, 'incoming');
  const invalidOverLimit=outgoingIds.length>5 || incomingIds.length>5;
  const outgoingPlayers=outgoingIds.map(getSimulationTradeBuilderPlayerById).filter(Boolean);
  const incomingPlayers=incomingIds.map(getSimulationTradeBuilderPlayerById).filter(Boolean);
  const canApply=outgoingPlayers.length>0 && incomingPlayers.length>0 && !invalidOverLimit;
  if(applyButton) applyButton.disabled=!canApply;
  if(invalidOverLimit){
    preview.innerHTML='<div style="color:#fecaca;font-weight:900;">Package trades are capped at 5 players per side.</div>';
    return;
  }
  if(!outgoingPlayers.length || !incomingPlayers.length){
    preview.innerHTML='<div style="color:#bfdbfe;font-weight:900;">Choose at least one player on both sides to preview the trade.</div>';
    return;
  }
  preview.innerHTML=renderSimulationTradePreviewMarkup({
    outgoingPlayers,
    incomingPlayers,
    state:SEASON_MODE_ADAPTER.getState?.() || D,
    partnerName:partnerAbbr
  });
}
```

If `CSS.escape` is not available in the test harness, replace selector construction with filtering:

```js
return Array.from(document.querySelectorAll('[data-trade-builder-side]')).filter(input=>
  input.getAttribute('data-trade-builder-partner')===String(partnerAbbr||'') &&
  input.getAttribute('data-trade-builder-side')===side &&
  input.checked
)
```

- [ ] **Step 4: Run the shared shell test and verify it passes**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
```

Expected: `shared season shell simulation test passed`.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add -- rosterbate-season.html tools/test-shared-season-shell-simulation.js
git commit -m "Wire trade builder package preview"
```

---

### Task 4: Package Apply Path

**Files:**
- Modify: `rosterbate-season.html`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Write failing package apply test**

Add a harness test that opens the modal, selects a `2-for-1`, applies it, and verifies rosters changed. Use the existing DOM stubs; if checkbox state is hard to drive in the harness, call a helper directly:

```js
const beforeUserRosterSize = api.getGame().rosters[0].length;
const beforePartnerRosterSize = api.getGame().rosters[1].length;
api.applySimulationTradePackageFromShell('BOS', [23, 24], [30]);
assert.equal(api.getGame().rosters[0].length, beforeUserRosterSize - 1, '2-for-1 should reduce user roster count by one before waiver fill-in');
assert.equal(api.getGame().rosters[1].length, beforePartnerRosterSize + 1, '2-for-1 should increase partner roster count by one');
assert.ok(api.getGame().rosters[0].some(player=>Number(player.id)===30), 'user roster should receive incoming player');
assert.ok(api.getGame().rosters[1].some(player=>Number(player.id)===23), 'partner roster should receive outgoing player');
```

Add a source assertion:

```js
assert.match(html, /function applySimulationTradePackageFromShell\(partnerAbbr,\s*outgoingIds,\s*incomingIds\)/, 'simulation trades should expose a reusable package apply helper');
```

- [ ] **Step 2: Run the shared shell test and verify it fails**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
```

Expected: fails because `applySimulationTradePackageFromShell` does not exist.

- [ ] **Step 3: Implement reusable package apply**

In `rosterbate-season.html`, add:

```js
function applySimulationTradePackageFromShell(partnerAbbr, outgoingIds, incomingIds){
  const tradeVm=SEASON_MODE_ADAPTER.getTradeViewModel?.() || {};
  const fromTeamAbbr=String(D?.draftState?.controlledTeamAbbr || tradeVm?.userTeamAbbr || '').trim().toUpperCase();
  const toTeamAbbr=String(partnerAbbr || '').trim().toUpperCase();
  const outgoing=(Array.isArray(outgoingIds)?outgoingIds:[]).map(Number).filter(Number.isFinite);
  const incoming=(Array.isArray(incomingIds)?incomingIds:[]).map(Number).filter(Number.isFinite);
  if(!fromTeamAbbr || !toTeamAbbr || !outgoing.length || !incoming.length){
    toast('Choose players on both sides before applying a trade.');
    return false;
  }
  if(outgoing.length>5 || incoming.length>5){
    toast('Package trades are capped at 5 players per side.');
    return false;
  }
  const state=SEASON_MODE_ADAPTER.getState?.() || D;
  const rosters=state?.draftState?.rostersByTeam || {};
  const fromRoster=Array.isArray(rosters[fromTeamAbbr]) ? rosters[fromTeamAbbr].slice() : [];
  const toRoster=Array.isArray(rosters[toTeamAbbr]) ? rosters[toTeamAbbr].slice() : [];
  const outgoingSet=new Set(outgoing);
  const incomingSet=new Set(incoming);
  const outgoingPlayers=fromRoster.filter(player=>outgoingSet.has(Number(player?.id)));
  const incomingPlayers=toRoster.filter(player=>incomingSet.has(Number(player?.id)));
  if(outgoingPlayers.length!==outgoing.length || incomingPlayers.length!==incoming.length){
    toast('Could not apply trade because one selected player was missing.');
    return false;
  }
  rosters[fromTeamAbbr]=fromRoster.filter(player=>!outgoingSet.has(Number(player?.id))).concat(incomingPlayers.map(player=>({...player})));
  rosters[toTeamAbbr]=toRoster.filter(player=>!incomingSet.has(Number(player?.id))).concat(outgoingPlayers.map(player=>({...player})));
  SEASON_MODE_ADAPTER.replaceState?.({
    ...state,
    draftState:{
      ...(state.draftState || {}),
      rostersByTeam:rosters
    }
  });
  D=normalizeSharedSimulationSeasonBootState(SEASON_MODE_ADAPTER.getState?.() || state, D?.historicalUniverseSlotId || null);
  syncGameStateToD();
  queueSharedSeasonSave('simulation_package_trade');
  renderSimulationTradesInSharedShell();
  toast(`Trade completed with ${toTeamAbbr}.`);
  return true;
}
```

- [ ] **Step 4: Wire modal apply into package apply**

Implement:

```js
function applySimulationTradeBuilderFromModal(partnerAbbr){
  const outgoingIds=getSimulationTradeBuilderSelectedIds(partnerAbbr, 'outgoing');
  const incomingIds=getSimulationTradeBuilderSelectedIds(partnerAbbr, 'incoming');
  const applied=applySimulationTradePackageFromShell(partnerAbbr, outgoingIds, incomingIds);
  if(applied) closeSimulationTradeBuilderModal();
}
```

Update `applySimulationTradeFromShell(partnerAbbr)` so it calls `applySimulationTradePackageFromShell(partnerAbbr, [outgoingId], [incomingId])` for old compatibility.

- [ ] **Step 5: Run tests**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-trade-fairness-evaluator.js
```

Expected: both pass.

- [ ] **Step 6: Commit Task 4**

Run:

```powershell
git add -- rosterbate-season.html tools/test-shared-season-shell-simulation.js
git commit -m "Apply package trades from builder modal"
```

---

### Task 5: Local Browser QA

**Files:**
- Modify only if QA finds a defect.

- [ ] **Step 1: Run full local test sweep**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-trade-fairness-evaluator.js
node .\tools\test-simulation-season-page.js
node .\tools\test-simulation-mode-runtime.js
node .\tools\test-simulation-season-adapter.js
```

Expected: all pass.

- [ ] **Step 2: Browser QA fresh league**

In the in-app browser:

1. Open `http://localhost:8080/rosterbate-draft.html?sport=nba`.
2. Enter the draft room if the setup screen appears.
3. Click `Sim Draft`.
4. Click `Start Your Season`.
5. Open `Trade Desk`.
6. Confirm partner cards show `Build Trade`.
7. Open a partner modal.
8. Select `2` outgoing and `1` incoming.
9. Confirm footer mentions waiver fill-ins.
10. Close the modal without applying.
11. Open another modal and select `5` outgoing and `5` incoming.
12. Confirm the apply button can enable and no fill-in/drop warning appears.

- [ ] **Step 3: Browser QA apply and reload**

In the same fresh league:

1. Open Trade Desk.
2. Build a small `2-for-1`.
3. Apply it.
4. Confirm success feedback appears.
5. Reload the season URL.
6. Open Trade Desk again.
7. Confirm partners still render.
8. Open My Team.
9. Confirm the incoming player is on the user roster.

- [ ] **Step 4: Fix only verified QA defects**

If QA reveals a defect, write a focused failing harness test for that defect before changing production code. Then implement the smallest fix and rerun the full test sweep.

- [ ] **Step 5: Commit QA fixes or final checkpoint**

If no fixes were needed:

```powershell
git status --short
```

Expected: only known untracked portrait/tmp files.

If fixes were needed:

```powershell
git add -- rosterbate-season.html tools/test-shared-season-shell-simulation.js tools/test-trade-fairness-evaluator.js
git commit -m "Polish trade builder modal QA"
```

---

## Self-Review

- Spec coverage: partner-card cleanup is Task 2, modal rendering is Tasks 2-3, package math is Task 1, applying/persistence is Task 4, and browser/test QA is Task 5.
- Scope check: this plan intentionally excludes public offers, CPU trade AI, picks, salary, and unrelated page redesign.
- Incomplete-marker scan: no incomplete markers remain. Each code-changing step includes the concrete helper names and code shape to implement.
- Type consistency: package helpers consistently use `offer.give`, `offer.get`, `fromTeam`, `toTeam`, `partnerAbbr`, `outgoingIds`, and `incomingIds`.
