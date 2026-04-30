# Player Portrait Assets

Drop licensed or generated portrait images in this folder and map them in `manifest.json`.

Fast path: name files with a player slug and optional team code, then run:

```bash
node tools/build-player-portrait-manifest.js --write
```

Filename examples:

- `michael-jordan__CHI.png` maps to `Michael Jordan|CHI`
- `nikola-jokic__DEN.webp` maps to `Nikola Jokic|DEN`
- `larry-bird.png` maps to `Larry Bird`

Preferred art direction:

- square illustrated bust portrait
- clean light/white background
- chest-and-head framing with face near the upper center
- team-color jersey visible
- WebP or PNG, ideally 512x512 or larger

Supported manifest shapes:

```json
{
  "players": {
    "Michael Jordan|CHI": "assets/player-portraits/michael-jordan.png",
    "nikola jokic": "assets/player-portraits/nikola-jokic.png"
  }
}
```

or:

```json
{
  "players": [
    { "name": "Michael Jordan", "team": "CHI", "url": "assets/player-portraits/michael-jordan.png" }
  ]
}
```

When a player has no manifest entry, RosterBate falls back to the generated SVG portrait pipeline.
