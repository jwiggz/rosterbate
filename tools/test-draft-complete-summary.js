const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

assert.match(
  source,
  /let\s+completedSimulationSeasonUrl\s*=\s*null/,
  'draft completion should track a pending simulation league URL for the summary button'
);
assert.match(
  source,
  /function\s+renderSimulationDraftCompleteSummary\s*\(finalState\)/,
  'simulation drafts should render the existing draft-complete summary before entering the league'
);
assert.match(
  source,
  /renderSimulationDraftCompleteSummary\(payload\)/,
  'simulation draft completion should populate the summary card'
);
assert.doesNotMatch(
  source,
  /completeSimulationModeDraft\(finalState\)[\s\S]*window\.location\.href\s*=\s*getSimulationSeasonRedirect/,
  'simulation draft completion should not immediately redirect away from the summary screen'
);
assert.match(
  source,
  /if\(completedSimulationSeasonUrl\)\s*return completedSimulationSeasonUrl/,
  'Start Your Season should use the pending simulation URL after the summary renders'
);

console.log('test-draft-complete-summary passed');
