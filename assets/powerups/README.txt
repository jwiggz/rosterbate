RosterBate custom power-up icons

Use these folders:
- assets/powerups/shared
- assets/powerups/nba
- assets/powerups/nfl
- assets/powerups/mlb

Recommended file types:
- .png
- .webp
- .svg

Current power-up ids:
- captain_mode
- white_gloves
- bench_boost
- sunday_surge

Recommended naming:
- shared/captain_mode.png
- shared/white_gloves.png
- shared/bench_boost.png
- shared/sunday_surge.png

Optional sport-specific overrides:
- nba/captain_mode.png
- nfl/captain_mode.png
- mlb/captain_mode.png

How this should work later:
- sport-specific file wins first
- shared file is fallback
- built-in SVG stays as final fallback if no custom asset exists

Suggested next step:
- drop your files in first
- then wire `rosterbate-season.html` to load custom assets before the current built-in SVG icons
