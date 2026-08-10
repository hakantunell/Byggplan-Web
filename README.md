# ByggPlan Web

React- och Vite-frontenden för ByggPlan.

## Cloudflare Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

## API-anrop

Webbläsaren använder alltid same-origin API-anrop via `/api/...` på den aktuella webbdomänen.

För Studio betyder det exempelvis:

`https://studio.byggplan.tunell.org/api/projects`

Cloudflare Pages Functions proxar sedan `/api/*` vidare server-side till ByggPlans API-worker. Webbläsaren behöver därför inte ansluta direkt till `api.byggplan.tunell.org` och ingen separat CORS-konfiguration krävs för normal browsertrafik.

`api.byggplan.tunell.org` kan fortfarande användas internt eller för externa integrationer, men ska inte vara en direkt dependency i browserklienten.
