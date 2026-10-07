# Backlog

Work from top to bottom, one item per task. Items marked **Decision needed** require proposing options and getting an answer before writing code.

## Phase 1: Run outside Figma Make

### 1. Make the project run locally

The project was exported from Figma Make and still depends on that environment.

- `vite.config.ts` imports `./.figma/make/site.json` and registers four Figma Make plugins: `figmaSiteConfiguration`, `figmaErrorOverlayReplay`, `figmaReactRefreshBoundaryFallback`, and `figmaMakeKitPlugin`. Remove them and the import. Keep `react()`, `tailwindcss()`, the `@` alias, and the React `dedupe` setting.
- Remove the Figma-specific environment variables (`FIGMA_PUBLIC_URL`, `FIGMA_DEV_SERVER_HOST`) and use Vite's default server settings.
- `index.html` has comment slots (`<!-- figma:lang -->`, `<!-- figma:title -->`, and the head and body slots) that the removed plugin used to fill in. Replace them with real values: `lang="en"` and the title "Thumbnail Studio".
- If an `AGENTS.md` file is present, delete it. It was written for Figma Make, and `CLAUDE.md` replaces it.

**Done when** `pnpm install`, `pnpm dev`, `pnpm build`, and the typecheck all pass without a `.figma` folder.

### 2. Restore the placeholder image

The canvas loads `/assets/580dc.svg`. The starter repo includes `public/assets/580dc.svg`, exported directly from the "Placeholder Image" frame in the Figma file (node `85:876`): a #FFF7F7 card with a dashed 4px border and a centered image icon. If a Figma Make code download includes its own version of this file, compare the two and ask which to keep.

**Done when** empty cards show the placeholder art.

## Phase 2: Design system

### 3. Switch to the classic theme

The app is wrapped in `<DesignTokensProvider forceTheme="visualrefresh">`, but the design system matches Gestalt's classic theme. Check the installed Gestalt typings for the correct way to get classic. It may only require removing `forceTheme`.

**Done when** components render with classic values. Spot-check a few CSS variables in devtools against the `gestalt-design-system` skill, for example `background-primary-base` (#e60023) and `text-subtle` (#767676).

### 4. Wire up Metropolis

`index.css` currently sets Arial. Add Metropolis with `@font-face` rules in `index.css`, placed after the Tailwind import. All nine weights are already in `public/fonts/`, copied from the Design System artifact. Override Gestalt's font-family token variables so `Text`, `Heading`, and `Button` pick it up (check `gestalt.css` for which variables they read). Load only the weights the UI actually uses, and use the fallback stack from the skill.

**Done when** the computed font on `Text`, `Heading`, and `Button` is Metropolis.

### 5. Move artwork colors into one palette file

Create `src/theme/artworkPalette.ts` holding the canvas background options, the shadow color options, the placeholder fill (`#fff7f7`), the backing fill behind loaded images (`#f1f0eb`), and the frame stroke colors. Replace every hex literal in `App.tsx` with imports from this file.

Also replace the stroke contrast check (`background === "#211922"`) with a luminance check, so any background automatically gets a readable stroke color.

**Done when** no hex literals remain in `App.tsx`.

### 6. Token pass on the UI

Replace off-system values with tokens or scale steps. Known cases:

- **Icon sizes 18 and 22.** These are off the 4px scale.
- **The template picker grid.** It's a raw `<div>` with inline grid styles. Use Gestalt layout instead.
- **`.artboard` in `index.css`.** It hardcodes `960px` and `58vh`, and the media query forces `aside` widths to 280px with `!important`.
- **`minHeight="calc(100vh - var(--space-1600))"`.** This assumes the header is exactly 64px tall. Verify it, or measure the header instead.
- **Fixed dimensions.** These include the 44px image chips, 64px template tiles, 28px and 32px swatches, 16px slider thumb, 40px logo, 300px and 360px panel widths, and 420px minimum preview height. Keep any that sit on the 4px scale, and collect them in one constants location.

Report a short list of any value with no matching token instead of guessing.

**Done when** that list is reported and everything else uses tokens.

### 7. Add a token guard

Add a `pnpm check:tokens` script: a small Node script that fails if it finds hex, `rgb()`, or `hsl()` color literals anywhere in `src/` outside `src/theme/artworkPalette.ts` and `src/data/templates.json`.

**Done when** the script passes on the cleaned code and fails when a test hex literal is added.

## Phase 3: Templates

### 8. Load templates from templates.json

Move `templates.json` into `src/data/`. Add `src/data/templates.ts`, which imports the JSON, defines its types, and exports `canvas`, `card`, `emptyState`, and `templates`. Delete the hardcoded `blogHeader`, `templateCard`, `emptyLayout`, `templateLayouts`, and `structureOptions` from `App.tsx`. Build the template picker from `templates`, so a new template added to the JSON appears automatically. Draw cards sorted by `z`, not by array order.

**Done when** changing a value in the JSON changes the render, and adding a template to the JSON adds it to the picker with no other code changes.

### 9. Track state per card, not per image

Positions and styles are currently keyed by image index (`cardIndex % 3`). As a result, Spread (5 cards) and Grid (6 cards) repeat images, and dragging one card also moves its duplicate. Drag offsets also carry over when switching templates.

Fix this by keying drag offsets by card slot and resetting them when the template changes.

**Decision needed:** how many images can a user upload? Options:

- (a) Keep 3 and repeat them across slots.
- (b) Allow up to the template's card count.
- (c) Let the user assign which image goes in each slot.

Also decide whether styles apply per image or per card.

**Done when** dragging a card moves only that card, and switching templates starts from a clean layout.

### 10. Enforce the margin rule

**Decision needed:** the style sliders (scale up to 1.6×, offset jitter) and dragging can push cards across the 48px margin on sides that don't allow bleed. Options:

- Clamp the card back inside the margin.
- Allow it, but show a warning guide.
- Clamp only during drag.

At maximum scale a card is 1040px tall, which is taller than the 804px safe area, so clamping can't always succeed.

**Done when** the chosen behavior is implemented and default slider values still match the JSON exactly.

### 11. Return to the Empty State

Once a template is picked, there's no way back. Add a reset option that clears the template and drag offsets but keeps the uploaded images.

**Done when** the user can return to the Empty State from any template.

## Phase 4: UX fixes

### 12. Make Undo work

The Undo `IconButton` has no click handler. Add a history of snapshots covering the template, frame styles, offsets, background, seed, and images. Support Undo and Redo with Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z. A slider drag should commit one history step per drag, not one per pointer move. Disable Undo when there is no history.

**Done when** every user action can be undone and redone.

### 13. Remove the fake save status

`markChanged()` shows "Saving…" and then "All changes saved," but nothing is actually saved.

**Decision needed:** either remove the save status and show status only for real events (upload, export, copy), or add real persistence (for example, localStorage).

### 14. Make Shuffle meaningful

At default slider values, Shuffle changes nothing, because randomness only comes from the offset, rotation, depth, and tilt sliders. It also does nothing in the Empty State.

**Decision needed:** either disable Shuffle with a hint when it would have no effect, or have it also shuffle something else (for example, which image goes in which slot).

### 15. Explain the style panel in the Empty State

The sliders have no effect before a template is picked. Disable the Style panel in the Empty State and show a short hint, such as "Pick a template to style frames."

**Done when** the Style panel is visibly disabled with the hint in the Empty State, and enabled once a template is picked.

### 16. Cleanup

- `isExportingRef` is set but never read. Remove it or use it.
- The `useEffect` with no dependency array re-attaches image load listeners on every render. Give it proper dependencies.
- Revoke object URLs from `URL.createObjectURL` when images are replaced.

**Done when** all three are fixed and the typecheck and build pass.

## Later

- Let users replace a single frame's image instead of re-uploading all of them.
- Add arrow-key nudging for the selected card, since dragging is pointer-only right now.
- Hit testing ignores the 3D tilt transform, so clicks near tilted edges can miss. Account for tilt.
- Decide whether to keep the "Frame N" header button, which duplicates the frame chips.
- Add a 2× export option for high-resolution screens.
