Gestalt is Pinterest's design system: a React component library plus the tokens, guidelines, and icon library that back it. Build product UI, not marketing pages, with it — Pinterest's own brand identity (wordmark, Pinterest Sans, campaign color) is a separate system reserved for brand and marketing surfaces. (This copy's typeface has been swapped for a concept tool — see Typography.)

## Principles

Speedy: default to system font families (`sans`) so UI loads fast and reads correctly across every device and script — don't substitute a webfont into product UI.
Inclusive: don't set a fixed `line-height` on body text; let the browser default (`normal`, ≈120% of font size) so text stays readable across languages and scripts with different ascenders/descenders (Latin vs. Hindi vs. Myanmar).
Minimal: draw from the six sizes in the `Text` type group and the two weights the styles actually use (`400`, `600`) — don't introduce new sizes or weights ad hoc. (Metropolis — see Typography — has seven more weights in reserve, `100`–`900`; reach for them deliberately for a specific moment, not as a substitute for picking the right style.)

## Color

Two themes ship: `light` and `dark`. Always reach for a **semantic** color token (`text-*`, `icon-*`, `background-*`, `border-*`) rather than a base palette swatch (`red-pushpin-*`, `blue-skycicle-*`, …) directly in product UI — the semantic layer is what makes a surface switch cleanly between themes; the base palette exists so the semantic layer (and brand/marketing work) has something to alias.

Use color purposefully, not as the only signal: pair every status color with an icon or text label — color-only distinctions fail for colorblind and low-vision Pinners. Text on its surface must hold WCAG AA contrast (4.5:1 body, 3:1 for 24px+/bold text); icons need at least 3:1 against their background. `text-error`/`icon-error` (aliasing `red-pushpin-*`) and `text-success`/`icon-success` (aliasing `green-matchacado-*`) are told apart by more than hue alone — keep pairing them with their icon or label rather than color alone.

`background-primary-base` (brand red, `red-pushpin-450`, `#E60023`) is Pinterest's one true brand color — reserve it for the single primary action on a surface (primary Button, selected/active state); don't tint whole surfaces with it. `background-elevation-floating` / `background-elevation-raised` are what raised and floating surfaces (menus, popovers, tooltips, cards) use for layering in **dark** theme — dark theme leans on these fills rather than shadows (see Elevation below).

## Typography

**Typeface: Metropolis.** This concept tool uses one typeface everywhere — UI and brand/display alike — rather than Gestalt's real split between a system-font UI face and the brand-only Pinterest Sans. Nine static weights shipped as real font files (`fonts/Metropolis-Thin.ttf` 100 through `fonts/Metropolis-Black.ttf` 900) and are set as `sans` in `type.families`; `--font-sans` now resolves to Metropolis first, with the original system-font stack kept right behind it as the fallback if the font file ever fails to load.

Product UI sets type from the `Text` group (`sans` → Metropolis). Pick a style by role, not by eyeballing a size:

| Style | Size | Weight | Use for |
|---|---|---|---|
| `help-text` | 12px | Regular | Form fields, metadata, secondary info |
| `body-dense` | 14px | Regular | Tables, internal tools, dense business-UI body copy |
| `body-default` | 16px | Regular | Default body copy for multi-line, paragraph text |
| `heading-sm` | 20px | Semibold | Small headings, usually an H3 |
| `heading-md` | 28px | Semibold | PageHeaders, medium headlines |
| `heading-lg` | 36px | Semibold | Large headlines, usually an H1 |

Leave `line-height` unset (browser default) on all of the above — see Principles. Long-form paragraphs at `body-default` should wrap at a max width around 664px (≈90 characters) so they stay easy to scan.

The fallback stack behind Metropolis is Gestalt's real system-font stack, trimmed to fit this format's 200-character cap on a family value (dropped the CJK and emoji-fallback entries — `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Helvetica, Arial, sans-serif`). If a component preview ever renders in a serif font, it means neither Metropolis nor `--font-sans` resolved — reload, or ask to re-check the token.

## Spacing & radius

`spacing-*` runs 0–64px in 4px steps (`space-0` … `space-1600`), plus a mirrored negative scale (`space-negative-*`) for pull-ins/overlaps. `radius-*` runs 0–32px in 4px steps (`radius-0` … `radius-800`), plus `radius-pill` (a full stadium round) and `radius-circle` (50%, for avatars and icon buttons). Compose both from the scale — don't hand-pick an arbitrary px value.

## Elevation

Two shadow tokens: `shadow-floating` (menus, popovers, tooltips) and a top/bottom pair, `shadow-raised-top` / `shadow-raised-bottom` (cards and raised containers). Use the designated elevation token or color for a given layer rather than an ad hoc shadow or tint. In **dark** theme, Gestalt intentionally drops real shadows in favor of flat surface-color layering — `shadow-floating` resolves to `none` and the raised pair drops to a near-zero-opacity hairline; reach for `background-elevation-floating` / `background-elevation-raised` to separate a dark-theme surface instead of expecting a visible shadow.

## Iconography

Every icon in the library sits on a 24px grid, pixel-snapped, with a minimum 2.5px line weight — use icons at the sizes they were designed for rather than scaling arbitrarily. Icons are single-ink (no fill baked in): set their color from a semantic icon token (`icon-default`, `icon-subtle`, `icon-error`, …) rather than leaving them black, and keep at least 3:1 contrast against their background (WCAG AA). Use icons with a text label wherever possible; icon-only controls still need an accessible label. Never redraw or reshape a Gestalt icon — request a new one from the Gestalt team if the library doesn't have what you need.

## Components synced in this pass

Twenty components came in as **static, read-only renditions** — real guidelines and prop types pulled straight from the source `.tsx` files, but the preview cards are hand-built static markup (styled with this system's real tokens), not the live, interactive Gestalt React implementation. Treat each card as a reference for what the component does and what it takes, not as a drop-in widget.

Actions: `Button`, `IconButton`, `Link`. Forms: `TextField`, `Checkbox`, `Switch`, `SearchField`, `ComboBox`, `SelectList`. Status/messaging: `Tag`, `Badge`, `BannerCallout`. Media: `Avatar`. Navigation: `Tabs`, `Dropdown`, `PageHeader`, `SideNavigation`. Overlays: `Modal`. Data: `Table`, `Accordion`.

## Not synced in this pass

- **Typeface swap**: Metropolis (9 static weights, 100–900, Latin, normal style only — no italics) replaces the real sync's two font tracks: Gestalt's system-font `sans` stack *and* the brand-only Pinterest Sans. One unified typeface across UI and brand/display now, by request — not how Pinterest's real Gestalt is set up. The `Brand` type group and `fonts/Pinterest-Sans-Pro-*.otf` from the original sync were removed; the files the user supplied were named as a "variable font" but are nine separate static-weight `.ttf` instances (no `fvar` axis) — which maps cleanly onto this token format's per-weight `type.fonts[]` entries anyway.
- **Scope**: pulled from `packages/gestalt-design-tokens/tokens/classic` (the theme the `gestalt` package actually imports by default) — color, type, spacing, radius, elevation, opacity. Component-specific token overrides (`tokens/classic/comp-web-*.json`, e.g. `datepicker`-only tokens) were left out as too narrow for a general system; ask if you need one.
- **Visual Refresh (`vr-theme`)**: Gestalt is mid-migration to a newer token set (`tokens/vr-theme/`) that already powers some typography CSS (a `body`/`heading` × `LG..XXS` scale with `default`/`emphasis` weights) even though the shipped package still defaults to `classic`. Not included here — worth a dedicated re-sync once it's the default.
- **Dataviz palette**: `base-color-dataviz-*` / `sema-color-dataviz-*` (chart-specific colors) weren't pulled in.
- **~60 of Gestalt's ~80 exported components** weren't brought in (only the 20 above were). Ask by name for more (`Popover`, `Toast`, `Spinner`, `List`, `Masonry`, `Video`, `Datapoint`, …).
- **Icons**: 24 of ~400 were copied in (see `assets/Icons/README.md`) — ask for more by name.
- **No live bundle was built.** This was a read-only sync (no install/build was run on Gestalt's source) — every component preview is a hand-built static card, not the compiled React library.


---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

20 components are documented without a runnable `components/bundle.js`: read each component’s card, and its README where it has one (`components/<Comp>/README.md`), and build to those guidelines. Tokens: the values are on `api/tokens.md`; a Slides deck or Design canvas also takes `tokens.json` by file path.

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`; stored assets and their paths: `api/assets/<Group>.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json`, `components/index.d.ts` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` and `assets/<Group>/README.md` are the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: surface, text, border, palette, type, spacing, radius, shadow, opacity. (32.1k)

**Icons and assets**

- `api/assets/Logos.md` — 2 files, by asset id. (1.4k)
- `api/assets/Icons.md` — 24 files, by asset id. (3.4k)

**Components** (`api/components/<Comp>.md`, 20)

- **Data**: `Accordion` — Accordion is a container that can be expanded and collapsed to show content about a single subject · `Table` — Table is a set of structured data that is easy for a user to scan, examine, and compare
- **Media**: `Avatar` — Avatar is used to represent a user
- **Status**: `Badge` — Badge is a label that indicates status or importance · `Tag` — Tags can be used to categorize, classify or filter content, usually via keywords
- **Messaging**: `BannerCallout` — BannerCallout is a banner displaying short messages with helpful information for a task on the page, or something that requires the user’s attention
- **Actions**: `Button` — Buttons allow users to perform actions within a surface · `IconButton` — IconButton allows users to take actions and make choices with a single click or tap · `Link` — Link is mainly used as navigational element and usually appear within or directly following a paragraph or sentence
- **Forms**: `Checkbox` — Checkbox is used for multiple choice selection · `ComboBox` — ComboBox is the combination of a Textfield and an associated Dropdown that allows the user to filter a list when selecting an option · `SearchField` — SearchField allows users to search for free-form content · `SelectList` — SelectList displays a list of actions or options using the browser’s native select · `Switch` — Use Switch for single cell options that can be turned on and off only · `TextField` — TextField allows for multiple types of text input
- **Navigation**: `Dropdown` — Dropdown displays a list of actions, options or links · `PageHeader` — PageHeader is used to indicate the title of the current screen and can also provide additional content and actions that relate to the current screen as a whole · `SideNavigation` — SideNavigation is start-aligned and arranged vertically · `Tabs` — Tabs may be used navigate between multiple URLs
- **Overlays**: `Modal` — A Modal displays content that requires user interaction
