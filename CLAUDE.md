# Fireball Board — Claude Code Context

Bourbon game manager PWA. Vite + React + Supabase + GitHub Pages.

## Live URL
https://chadspencer.github.io/bourbon/

## Stack
- **Frontend**: Vite 5, React 18, CSS Modules
- **Database**: Supabase (Postgres) — talks directly from frontend, no backend
- **Hosting**: GitHub Pages via GitHub Actions on every push to `main`
- **Fonts**: Playfair Display (headers), Crimson Text (body) via Google Fonts

## Project Structure
```
bourbon/
├── .github/workflows/deploy.yml   # Auto-deploy to Pages on push to main
├── src/
│   ├── main.jsx                   # Entry point
│   ├── App.jsx                    # Tab routing, Supabase data fetching
│   ├── App.module.css             # Header, tab nav, layout
│   ├── index.css                  # Global styles, CSS variables, grain overlay
│   ├── lib/
│   │   └── supabase.js            # Supabase client (reads from .env)
│   └── components/
│       ├── UI.jsx                 # Shared: Input, Select, PrimaryBtn, SecondaryBtn,
│       │                          #   Label, SectionHeader, Toggle, Card, StatPill,
│       │                          #   CopyBtn, Spinner
│       ├── UI.module.css
│       ├── GameTab.jsx            # Game flow: single/multi, fireball template, duck list, end game
│       ├── GameTab.module.css
│       ├── DucksTab.jsx           # Standalone duck list generator
│       ├── DucksTab.module.css
│       ├── InventoryTab.jsx       # View/edit inventory, add bottles, CSV export
│       ├── InventoryTab.module.css
│       ├── SalesLogTab.jsx        # Sales history
│       └── SalesLogTab.module.css
├── index.html
├── vite.config.js                 # base: '/bourbon/' for GitHub Pages
├── package.json
├── schema.sql                     # Supabase table definitions + seed data
└── .env                           # Not committed — see .env.example
```

## Environment Variables
```
VITE_SUPABASE_URL=https://xivzrjbvulkurnykminb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```
GitHub repo secrets mirror these for the Actions build.

## Database Schema

### `inventory`
| column      | type    | notes                          |
|-------------|---------|--------------------------------|
| id          | bigint  | auto identity PK               |
| bottle      | text    | display name                   |
| paid        | numeric | price paid per bottle          |
| value       | numeric | current market value           |
| quantity    | integer |                                |
| total_paid  | numeric | generated: paid * quantity     |
| total_value | numeric | generated: value * quantity    |
| profit      | numeric | generated: (value-paid)*qty    |

### `sales`
| column   | type        | notes                        |
|----------|-------------|------------------------------|
| id       | bigint      | auto identity PK             |
| bottles  | text[]      | array of bottle names used   |
| mode     | text        | 'single' or 'multi'          |
| sold_for | numeric     | what the game ran for        |
| date     | timestamptz | defaults to now()            |

## Key Business Logic

### Fireball Template
Generated at game start. Format:
```
M/D Mid🔥   or   M/D Eve🔥   (Mid = before noon, Eve = noon+)
Bottle Name

XX 🥃           (single price)
-- or --
XX ☝️           (two-price: higher = 1 sip)
XX ✌️           (two-price: lower = 2 sips)

Sip info posted below board after live.

🥩 in SE SGF any time
```

### Price Auto-calculation
- **Single game**: `Math.round(bottle.paid / 10)`
- **Two-price single**: p1 = `Math.round(base * 1.3)`, p2 = base
- **Multi game**: sum all 4 bottles' `value`, divide by 10
- **Two-price multi**: same 1.3x multiplier for p1

### Multi game template
Each bottle shown as: `Bottle Name ($XX)` where XX = `Math.round(bottle.value / 10)`

### Duck List
Numbered list starting at 0: `0.` through `N-1.`

### End Game
- Decrements `quantity` by 1 for each bottle used (via Supabase update)
- Inserts row into `sales` table
- Triggers full data refresh in App.jsx

## Design System (CSS Variables)
```css
--bg:         #0b0705   /* page background */
--bg-card:    #130d08   /* card surfaces */
--bg-raised:  #1c1108   /* elevated elements */
--border:     #2e1a0a   /* default borders */
--border-hot: #7a3a10   /* active/focus borders */
--amber:      #c8931a   /* primary accent, headers */
--amber-dim:  #7a5a18   /* muted amber */
--cream:      #e4cfa0   /* primary text */
--cream-dim:  #8a7050   /* secondary text, labels */
--green:      #4a8a3a   /* positive values, profit */
--red:        #8a2a2a   /* depleted inventory */
--font-display: 'Playfair Display'
--font-body:    'Crimson Text'
```

## Dev Commands
```bash
npm install       # install deps
npm run dev       # local dev server at localhost:5173
npm run build     # production build to /dist
npm run preview   # preview production build locally
```

## Deploy
Push to `main` → GitHub Action builds → deploys to Pages automatically.
No manual deploy step needed.

## Notes
- `.env` is gitignored — never commit real keys
- GitHub Actions reads secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Supabase RLS is open (public read/write) — fine for personal use
- `vite.config.js` base must stay `/bourbon/` to match the Pages URL path
- All CSS is CSS Modules — no Tailwind, no styled-components
- No React Router — tab state is just `useState` in App.jsx
