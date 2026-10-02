# VPA - Visual Performance and Arts Club

A static HTML, CSS and JavaScript website for VPA at Meenakshi Sundararajan Engineering College. No admin dashboard, database, login, API, environment secrets or runtime dependencies.

## Local preview

Requires Node.js 22 or newer for the build and local preview tools.

```sh
npm run dev
```

Open http://127.0.0.1:5173. The local server builds and serves only the static output.

## Deploy to Render Static Site

- Branch: `main`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`

If automatic deploys are disabled, choose Manual Deploy > Deploy latest commit. No paid disk or Node Web Service is needed. Any static host can serve the generated `dist/` directory.

## Content

`content-data.js` contains the public events, gallery, team, descriptions and image references. Edit that file to update content. `index.html`, `styles.css`, `experience.css`, `app.js` and `experience.js` define the existing design and interactions. Supplied images remain in `assets/`.

The site includes six events with generated detail pages, fifteen gallery entries, all six office bearers, both Euphoria posters, Euphony and inauguration photos, solo performers, and student artworks. Art 4 is used in the opening hero; Arts 1-3 appear in Fine Arts. Nekitha's name is corrected. The supplied Dance1 photo appears in the hero, Dance section and gallery.

## Checks

```sh
npm run check
npm test
npm run build
```

The build creates public files only. Static build tests verify content counts, artwork/name corrections, image paths and generated event pages. With Chrome debugging on port 9222 and the preview running, `node quality-check.mjs` verifies mobile/desktop layouts, images, event tabs, gallery keyboard/touch controls, animations and reduced motion. Set `CHECK_ORIGIN` to check a different preview URL.

The Euphoria gallery includes four additional band photos, delivered as optimized WebP copies of the supplied originals.
