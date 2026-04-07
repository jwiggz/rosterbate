# RosterBate Data System - Live vs Demo Mode

## Overview

RosterBate has **TWO completely separate data systems**:

1. **LIVE DATA** - Current season stats (updated daily at 4AM)
2. **DEMO DATA** - Last season's stats (static, for "Try It Now" preview)

---

## Data Sources

### Live Data (Real Leagues)
- **Files**: `sport-data-live.json` + `sport-data-live.js`
- **Global Variable**: `window.RB_IMPORTED_POOLS`
- **Update Schedule**: Daily at 4AM (similar to baseball stats refresh)
- **Contains**: Current season stats for NBA, NFL, MLB
- **Used By**: All real drafts and seasons

### Demo Data (Preview Mode)
- **File**: `sport-demo-data.js`
- **Global Variable**: `window.getRosterbateDemoPlayers(sport)`
- **Update Schedule**: Static (2024-25 season data)
- **Contains**: Last season's stats for preview/testing
- **Used By**: Only "Try It Now" demo mode

---

## How Each Page Uses Data

### Draft Page (`rosterbate-draft.html`)

**Always uses LIVE data:**
```javascript
// Line 13: Loads live data
<script src="sport-data-live.js"></script>

// Line 1540: Builds player pool from live data
PLAYERS = buildRosterbateSportPlayerPool(SPORT, 300);
```

**What happens on draft completion:**
```javascript
// Line 3018: Sets isDemo flag to FALSE for live drafts
const draftData = {
  // ... other properties
  isDemo: false,  // ← Always false because draft uses live data
  savedAt: Date.now()
};

// Saves to localStorage
localStorage.setItem('rosterbateDraft', JSON.stringify(draftData));
```

### Season Page (`rosterbate-season.html`)

**Checks the `isDemo` flag to decide which data to use:**

```javascript
// Line 12: Loads demo data for fallback
<script src="sport-demo-data.js"></script>

// Line 2294-2298: Chooses data source based on isDemo flag
const waiverPool = D.isDemo 
  ? (getRosterbateDemoPlayers(CURRENT_SPORT) || [])      // ← Demo data
  : (buildRosterbateSportPlayerPool(CURRENT_SPORT, 260))  // ← Live data
```

**Data Flow:**
1. Loads saved draft from localStorage
2. Checks `D.isDemo` flag
3. If `false` → Uses **live data** (RB_IMPORTED_POOLS)
4. If `true` → Uses **demo data** (sport-demo-data.js)

---

## Configuration (`sport-config-live.js`)

### Key Functions:

```javascript
// Checks if current session is demo mode
window.isRosterbateDemoMode = function() {
  const data = JSON.parse(localStorage.getItem('rosterbateDraft'));
  return data.isDemo === true;  // ← Explicit check
};

// ALWAYS returns live data from RB_IMPORTED_POOLS
window.buildRosterbateSportPlayerPool = function(sport, limit) {
  const pool = window.RB_IMPORTED_POOLS?.[sport];  // ← Live data only
  return pool.slice(0, limit || 300);
};
```

---

## Data Update Strategy

### Live Data Updates (4AM Daily)

Your backend process should:

1. **Fetch current stats** from sports APIs (NBA Stats API, MLB Stats API, etc.)
2. **Calculate fantasy points** using your scoring rules
3. **Generate new files**:
   - `sport-data-live.json` (primary)
   - `sport-data-live.js` (fallback)
4. **Deploy to production** so users get fresh stats

**Example update flow:**
```
4:00 AM → Fetch NBA/NFL/MLB stats
4:05 AM → Calculate fantasy points
4:10 AM → Generate sport-data-live.json
4:15 AM → Deploy to Netlify/hosting
4:20 AM → Users see updated stats
```

### Demo Data Updates (Manual)

Demo data is **intentionally static**:
- Uses complete 2024-25 season stats
- Only updated when you want to change preview data
- Allows "Try It Now" to work even if live data fails

---

## Current Status

### ✅ What's Working:
- Draft page loads live data correctly
- Draft completion saves `isDemo: false` flag
- Season page checks `isDemo` flag for data source

### 🔧 What Was Fixed:
1. **Syntax error** on line 2956 (closing brace indentation)
2. **Added `isDemo: false`** to draft data save
3. **Updated `isRosterbateDemoMode()`** to only check `isDemo` flag
4. **Added documentation** to `buildRosterbateSportPlayerPool()`

### 📋 What You Need to Do:

1. **Upload the fixed files** to your site:
   - `rosterbate-draft.html`
   - `sport-config-live.js`

2. **Test draft completion**:
   - Complete a draft at https://rosterbate.net/rosterbate-draft.html?sport=nba
   - Verify no console errors
   - Check that it transitions to completion screen

3. **Set up daily data updates** (future):
   - Create a script to fetch current stats
   - Generate new `sport-data-live.json`
   - Schedule at 4AM daily (cron job, GitHub Actions, etc.)

---

## Example Data Structures

### Live Data Format (`sport-data-live.json`):
```json
{
  "nba": [
    {
      "id": 257,
      "name": "Luka Doncic",
      "team": "DAL",
      "pos": "PG",
      "fp": 62.6,
      "adp": 1,
      "source": "nba-statsapi",
      "sourcePlayerId": "1629029",
      "statsThroughDate": "2026-04-06",
      "statSummary": "33.9 pts - 9.2 reb - 9.8 ast",
      "statValues": {
        "PTS": 33.9,
        "REB": 9.2,
        "AST": 9.8,
        "STL": 1.4,
        "BLK": 0.5,
        "TO": 4.5,
        "3PM": 3.6
      }
    }
  ],
  "nfl": [...],
  "mlb": [...]
}
```

### Draft Data Saved to localStorage:
```json
{
  "sport": "nba",
  "teamName": "My Team",
  "leagueName": "RosterBate League",
  "isDemo": false,  // ← KEY FLAG
  "myRoster": [...],
  "allRosters": [...],
  "savedAt": 1712458800000
}
```

---

## Troubleshooting

### Problem: Season page uses demo data instead of live data
**Check:**
1. Is `isDemo` set to `false` in localStorage?
   - Open DevTools → Application → Local Storage
   - Check `rosterbateDraft` → `isDemo` value
2. Is `sport-data-live.json` loading successfully?
   - Check Network tab for 404 errors

### Problem: Draft page shows "Real player data failed to load"
**Check:**
1. Is `sport-data-live.json` accessible?
2. Does it contain valid JSON?
3. Does it have `nba`, `nfl`, `mlb` arrays?

### Problem: Stats aren't updating daily
**Solution:**
- You need to set up a backend process to generate fresh `sport-data-live.json` daily
- This is separate from the frontend - it's a data pipeline task

---

## Summary

**The key point:** Your draft system is now configured to:
- ✅ Always use **live data** from `RB_IMPORTED_POOLS`
- ✅ Set `isDemo: false` on draft completion
- ✅ Allow season page to use **live data** for waivers and stat updates
- ✅ Keep demo data completely separate for preview mode

The "Try It Now" demo mode would need a separate implementation that sets `isDemo: true`, but your regular drafts will always use live, current-season data that you update daily at 4AM.
