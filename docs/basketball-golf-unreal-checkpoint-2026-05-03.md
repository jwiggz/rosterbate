# Basketball Golf / Hoop Links Checkpoint - 2026-05-03

## Current Direction

We pivoted the mini-game from a pure three-point contest into a Hoop Links / basketball mini-golf concept:

- Course-to-course basketball trick-shot gameplay.
- Bottom timing meter inspired by golf games.
- Basketball hoops replace golf holes.
- Rim and backboard stay central to the target identity.
- Course design should feel like mini-golf lanes, ramps, rails, bounce pads, bank walls, and hazards rather than a normal basketball court.

## Web Prototype

Local browser entry:

```text
http://127.0.0.1:8080/basketball-golf.html
```

Key files:

- `basketball-golf.html`
- `basketball-golf.js`
- `basketball-golf-core.js`
- `basketball-golf-courses.js`
- `basketball-golf-renderer.js`
- `tools/test-basketball-golf-core.js`
- `tools/test-basketball-golf-shell.js`
- `tools/test-basketball-golf-playwright.js`

Verified earlier:

```text
npm.cmd run test:basketballgolf
```

## Unreal Prototype

Unreal project:

```text
C:\Users\jabro\Documents\Unreal Projects\Bball\Bball.uproject
```

Builder scripts:

```text
C:\Users\jabro\Documents\Unreal Projects\Bball\Scripts\build_basketball_golf_hole01.py
C:\Users\jabro\Documents\Unreal Projects\Bball\Scripts\build_basketball_golf_course_blockout.py
```

Current recommended Unreal command:

```text
py.exec "C:/Users/jabro/Documents/Unreal Projects/Bball/Scripts/build_basketball_golf_hole01.py"
```

The 3-hole course script still exists as an optional reference, but the user manually removed two courses and wants to work with one course for now.

## Rim Fix

The old hoop used capped cylinder disks, which looked like vertical circles with filled centers. The current scripts now build an open-center rim from ring segments with bracket arms to the backboard.

If the rim still needs polish later:

- Replace cube segments with better rounded tube geometry.
- Add a simple white net under the rim.
- Tune rim height, depth, and backboard spacing after visual testing in Unreal.

## Next When Returning

1. Keep Hole 1 as the focused map.
2. Add a real hoop net and cleaner rim geometry.
3. Start defining gameplay collision targets: made shot, rim touch, backboard touch, rail bounce, out-of-bounds, and hazard reset.
4. Eventually convert the web course data into a reusable Unreal course schema.

## Fantasy Site Re-Entry

When returning to the fantasy website, the highest-priority open issue from before the game pivot is the player-detail click regression:

- Clicking a player on My Team stopped opening the stats/details view.
- The desired next feature is player history inside that player detail view: waivers, trades, roster movement, timestamps, and source team context.

That should come before more portrait/game polish because it affects core fantasy navigation.
