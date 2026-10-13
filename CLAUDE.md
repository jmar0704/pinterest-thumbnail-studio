# Thumbnail Studio

Thumbnail Studio lets designers and non-designers build 1600×900 blog-header thumbnails by placing one image per Pinterest-style rounded card (up to ten, in Grid). Users pick a template (Arc, Stack, Spread, Grid, Trail, Showcase, Table spread, Strips), drag cards within the margins, style each card with stepped controls, and export a PNG.

The value of the tool is its templates. Layouts were designed by hand in Figma and now live in `src/data/templates.json`; they must render exactly as that file specifies.

This project was prototyped in Figma Make and is now developed locally. Open work is tracked in `BACKLOG.md`.

## Commands

- Node comes from nvm (`. ~/.nvm/nvm.sh`); the Browser pane's `.claude/launch.json` calls Node by absolute path because it doesn't load nvm.
- `pnpm install`
- `pnpm dev` starts the Vite dev server
- `pnpm build` builds for production (it does not typecheck)
- `pnpm typecheck` (or `pnpm exec tsc --noEmit`); run it before calling any task done
- `pnpm format` formats with oxfmt
- `pnpm check:tokens` fails on raw color values outside allowed files

## Stack

React 19, Vite, TypeScript (strict), and Gestalt (Pinterest's design system) for all UI. Tailwind v4 is installed but is not used for styling decisions (see rule 9). The thumbnail preview is drawn on a `<canvas>`.

## Design system rules

Token values come from the `gestalt-design-system` skill. Read it before any UI change.

Fuller reference lives in `docs/design-system/`, copied from the Design System artifact (https://claude.ai/artifact/ALhNHPTCtUcFKfSEtZKGrP): `README.md` for principles, `api/tokens.md` for every token value, and `api/components/<Component>.md` for component guidelines. The docs name tokens without a prefix (`text-default`), while the app uses the `gestalt` package's CSS variables (`--color-text-default`). Confirm a variable exists before using it.

1. **Gestalt components first, new components where the tool needs them.** Use `Box`, `Flex`, `Text`, `Heading`, `Button`, `IconButton`, `TapArea`, `Icon`, `Divider`, and so on wherever they fit. This tool also needs components Gestalt doesn't have (the range slider, template picker, color swatches, canvas controls). Build those in `src/components/`, one per file, composed from Gestalt primitives and tokens so they look native to the system.
2. **Semantic color tokens only.** No hex, `rgb()`, `hsl()`, or named colors in components or CSS. The one exception is artwork colors (see below).
3. **Spacing and radius come from the 4px scale.** Use Gestalt props or the `--space-*` and radius variables. No arbitrary px values. Fixed width and height values must be multiples of 4.
4. **Pick type by role.** Use Gestalt `Text` and `Heading` sizes that map to help-text (12), body-dense (14), body-default (16), heading-sm (20), heading-md (28), and heading-lg (36). Don't introduce new sizes or weights. Leave line-height unset.
5. **The font is Metropolis.** Wire it through Gestalt's font-family token variables, not only `:root`.
6. **Use the Gestalt classic theme.** The design system matches classic values. Don't force `visualrefresh`.
7. **One primary (red) action per surface.** In the header, that's Export PNG.
8. **Pair status colors with an icon or text label.** Text must meet WCAG AA contrast.
9. **Don't use Tailwind for color, spacing, type, radius, or shadow.** Tailwind's defaults bypass the tokens. Use Gestalt props instead.
10. **If no token fits, stop and flag it.** Never invent a value.

## Artwork colors

Colors that belong to the user's artwork are content, not UI. That includes canvas backgrounds, drop-shadow glow colors (paired with the background as color templates), the placeholder fill, and frame strokes. They live in one file: `src/theme/artworkPalette.ts`. That file and `src/data/templates.json` are the only places hex values are allowed.

Canvas drawing code can't read CSS variables directly. If it needs a UI token, read it with `getComputedStyle(document.documentElement).getPropertyValue("--token-name")`.

## Templates

The source of truth is `src/data/templates.json`. It was first extracted from Figma file `XyvXAvzsiYBcNrLaeaslrO`, pages "Templates" (node `85:874`) and "Templates 2" (node `122:251`), and each template records its Figma node ID. Since 2026-10-08 the geometry is maintained in the JSON directly (the Grid's left and right edge columns were added there), so Figma may lag behind it.

- **Don't edit template geometry to fix a rendering bug.** If a template renders differently from its JSON, the bug is in the rendering code (for example, `gestalt.css` sets `svg * { transform-box: fill-box }`, which broke the picker thumbnails' rotation pivots). Change the JSON only when the design itself changes.
- **Cards are always 450×650 with a 48 corner radius.** Templates change position, rotation and stacking order; a card may also name a starting Size step (`"size": "S"`), as Showcase's back card does (0.74× in Figma, mapped to S at 0.9×).
- **`cx` and `cy` are card centers** in canvas pixels. **`rotate` is in degrees, clockwise positive**, already converted from Figma's counter-clockwise convention. **`z` of 0 is the back.**
- **The 48px margin is the only hard layout rule.** A card may cross it only on sides listed in that template's `allowBleed`. The canvas clips at its edges.
- **The 5×5 grid (20px gutter) is a visual guide only.** Nothing snaps to it.
- **`emptyState` is the default layout** shown before a template is picked. It is not a template option. Its frames can be selected, dragged and styled like a template's (since 2026-10-08).
- **With every style control at its default, each template must render exactly as the JSON specifies.**

## Code map

- `src/data/templates.ts`: typed access to `templates.json`.
- `src/data/styleOptions.ts`: the stepped frame style controls.
- `src/data/backgroundOptions.ts`: background patterns (Rings, Fractal) and their steps.
- `src/lib/composition.ts`: card placement, margin clamping, margin checks, hit testing, selection-handle geometry (resize/rotate snap to the style steps) and center-line snapping.
- `src/lib/drawComposition.ts`: canvas rendering (`drawBackgroundLayer` is the background-only render; `coverCrop` is the image crop drawn); the overlay (guides, selection) is preview-only.
- `src/lib/edgeContrast.ts`: pure low-edge-contrast math (WCAG luminance, per-side sampling); `src/hooks/useEdgeContrastWarnings.ts` runs it debounced in card space.
- `src/lib/drawBackground.ts`: background patterns, colored from the color template (Fractal cached per color/setting).
- `src/hooks/useHistory.ts`: undo/redo snapshots.
- `src/theme/artworkPalette.ts`: color templates (background + paired drop-shadow glow) and other artwork colors.
- `src/components/`: TemplatePicker, LayoutThumbnail, FrameChips (3-column frame grid: tap to select, drag to swap images), FrameToolbar (floating actions under the selected frame), StylePanel (the Frame style dropdown), BackgroundStylePanel (the Background style dropdown), StepControl, ColorTemplatePicker, DropShadowSwitch, BlogPreview (the Preview modal), EdgeContrastNotice (low edge contrast warning; flagged images also get a warning icon on their frame tile and a preview-only tint on the canvas).
- UI copy uses sentence case, including section headings.

## Code conventions

- Export components as default exports.
- Use double quotes for strings that contain apostrophes.

## How to work

- Do one backlog item per task. If an item is marked **Decision needed**, propose options and wait for an answer before writing code.
- Don't change product behavior outside the item you're working on. If you notice something else, add it to `BACKLOG.md`.
- Before finishing, run the typecheck, the build, and `pnpm check:tokens` (once it exists).
- If the Figma MCP server is connected, use it to check rendering against the Figma file instead of guessing.
