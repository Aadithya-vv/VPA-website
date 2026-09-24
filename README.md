# VPA — Visual Performance and Arts Club

Responsive public website for Meenakshi Sundararajan Engineering College, Chennai. Built with semantic HTML, CSS and vanilla JavaScript; no runtime packages or framework required.

## Run

Requires Node.js 20 or newer.

```sh
npm run dev
```

Open http://localhost:5173. `PORT` overrides the default port. The development server binds to localhost and serves only public site files.

```sh
npm run check
npm run build
```

Deploy the contents of `dist/` to any static host. The included server is a local preview server.

## Content and design

- Design tokens, responsive layouts and reduced-motion support: `styles.css`.
- Site structure, supplied vision/mission and institutional information: `index.html`.
- Events, gallery metadata, office bearers and interactive behavior: `app.js`.
- Original SVG visual studies: `assets/`. These are explicitly labeled artistic placeholders, not documentary club photographs.
- The hero and Music section use supplied singer and drummer photographs. The gallery includes all three solo performers, two Euphony performance photos and the official Euphony poster, with full-image lightbox viewing. Dance and Fine Arts retain labeled visual studies.
- The navigation logo uses a padded circular white frame with gold rings; the entire source logo remains visible.
- Fonts use Google Fonts with local serif/sans-serif fallbacks; the site remains usable without that service.
- Native dialog lightbox supports Escape, arrow keys, focus containment and return focus. Event tabs support arrow keys; the mobile menu supports Escape and keyboard cycling.

## Interaction polish

`experience.css` and `experience.js` add a progressive interaction layer without changing the supplied assets or section order. The hero entrance lasts under 1.5 seconds, runs once per browser tab session, and cancels on pointer, wheel or keyboard interaction. Tiny pointer/scroll offsets affect the hero. The three disciplines support mouse hover, keyboard focus, explicit tap buttons and mobile scroll activation, with distinct colour and line treatments.

The existing Euphoria event becomes a poster spotlight; gallery filters and the native lightbox gain short transitions and touch swiping. Photography uses one-time curtain reveals. The philosophy words move a few pixels and change accent colours as they enter the viewport. Navigation, selected buttons and team portraits have restrained micro-interactions. A footer motion control supplements the operating system's reduced-motion preference.

Scroll updates are requestAnimationFrame-coalesced and limited to visible hero/philosophy sections. There is no perpetual JavaScript animation loop, scroll interception or animation dependency. Existing lazy loading is preserved, and event image dimensions reserve space before loading. The original full-resolution image files are preserved; generating smaller responsive image derivatives remains a future asset optimization.

Custom cursors, pinned horizontal scrolling and infinite marquees were intentionally omitted to keep native interaction and avoid competing with the photography. There are no route/page transitions because this is a single-page anchor-based site.

Browser verification: run `node quality-check.mjs` with Node.js 22+ and a local Chrome debugging session on port 9222, while the preview runs on port 5173. The checks cover 320/390/768/1440px layouts, anchor destinations, event tabs, spotlight rerenders, discipline focus/tap, native dialog focus return/Escape, keyboard image navigation, real emulated touch swipes, all image decoding, reduced motion, session intro suppression/skip, console errors and layout-shift metrics. Screenshots are ignored by Git. These are local Chromium checks, not a cross-browser or physical-device performance certification.

## Awaiting supplied content

The supplied club logo is used in the navigation, and all six office bearers use their supplied portraits. The Secretary's supplied phone screenshot is framed with CSS to hide the phone controls without modifying the original file. Display names and roles retain the spellings from the brief.

The navigation and footer link to the supplied Instagram account, @msec_vpa_club. Events include the supplied inauguration photograph and both Euphoria posters, with 25 September 2026 and 26 September 2026 dates taken from their respective posters.

Still needed: additional performance photography, remaining event posters and dates, and gallery images with meaningful alternative text. No club photographs, dates, contact addresses or social accounts have been fabricated.

Events are categorized exactly as supplied, including Sketchora as a past event associated with Euphoria’26 while Euphoria’26 itself appears upcoming. Confirm this relationship before publication.

## Admin milestone

This delivery is the first public-facing version requested at the end of the brief. It does **not** include an admin login, authentication, database, uploads or event CRUD. Public events currently come from the `eventData` structure in `app.js`.

A production admin area must use server-side authentication (one provisioned administrator, no public signup), secure HTTP-only sessions, CSRF protection, login rate limits, durable storage and validated image uploads. Do not implement protection with client-side passwords or localStorage. Keep an administrator table keyed by ID to support additional admins later without introducing roles in version 1.

Suggested event record: `id`, `title`, `description`, nullable `eventDate`, `category` (MUSIC/DANCE/FINE_ARTS/GENERAL), `poster` (asset and alt text), `gallery` (ordered assets and alt text), `status` (UPCOMING/COMPLETED/DRAFT), `published`, timestamps. Only published, non-draft records should reach the public API. Implement create, edit, delete and publish/unpublish behind authenticated server routes when the hosting and storage environment are chosen.
