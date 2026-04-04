# Dev Workflow

## Local development

Use the built-in PowerShell server so you can test without deploying:

```powershell
cd "C:\Users\jabro\Desktop\Fantasy Project"
.\Start-Local-Dev.bat
```

Then open:

- `http://localhost:8080/`
- `http://localhost:8080/rosterbate-draft.html?sport=nfl`
- `http://localhost:8080/rosterbate-season.html?sport=nba`

This does not create a Netlify deploy, so it does not spend production deploy credits.

## Suggested branch workflow

- `main`: production only
- `dev`: staging / preview branch

Recommended flow:

1. Make changes locally.
2. Test on `localhost`.
3. Push to `dev` only when you want a hosted preview URL.
4. Merge `dev` into `main` only when ready for production.

## Netlify usage

- Local testing on `localhost` is the cheapest option because nothing is deployed.
- Branch deploys / deploy previews are the right place for staging.
- Keep production pushes for real releases only.

## Future option

If you later install the Netlify CLI, this repo already includes a minimal `netlify.toml` so you can also try:

```powershell
netlify dev
```

That is optional. The local PowerShell server is enough for this project right now.
