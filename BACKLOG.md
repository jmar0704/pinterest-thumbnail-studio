# Backlog

Work from top to bottom, one item per task. Items marked **Decision needed** require proposing options and getting an answer before writing code.

## Decisions (2026-10-07)

- **Images (updated 2026-10-08):** one image per frame, never repeated. "Add images" fills the layout's empty frames in order; empty frames show the placeholder. The selected frame has Replace/Add image and Remove buttons under the frame chips. Images stay with their slot across template switches. Shuffle swaps images between the layout's frames.
- **Style scope:** style controls apply to the selected card only. Switching templates (or going back to the Empty State) resets styles and positions, because card slots don't correspond between templates. Undo restores them.
- **Stepped controls, not free sliders:** non-designers shouldn't be able to push a card to an extreme. Per-card controls are Gestalt `SegmentedControl`s: Size (S 0.9× · M 1.0× · L 1.1× · XL 1.2×), Rotate (−10° to +10° in 5° steps, added to the template's rotation), 3D tilt (Off · Subtle · Strong), Border (None · 4 · 8 · 12 px), Shadow (None · Soft · Mid · Strong), plus Shadow color when a shadow is on. Steps live in `src/data/styleOptions.ts`.
- **Scatter** replaced the per-card Offset, Rotation-jitter and Depth sliders. It is one composition-wide control (Off · Subtle · Playful) with seeded per-card randomness.
- **Margin rule:** dragging is clamped to the 48px margin on sides the template doesn't allow to bleed. On bleed sides the card's center stays on the canvas. Style controls and Scatter may still push a card past the margin; that shows a warning banner, a warning mark on the frame chip, a warning outline on the card and the margin guide. The guide appears only in the preview, never in the export.
- **Positions:** "Reset position" (Style panel) returns the selected card to its template spot; "Reset all positions" (canvas toolbar) returns every card.
- **Shuffle** re-rolls Scatter and reassigns images to cards. It's disabled, with a tooltip, when it would have no effect.
- **Save status:** the fake "Saving…" status is gone. The header shows only real events (upload, export, copy, reset) for a few seconds.
- **"Frame N" header button:** removed. The frame chips in the Style panel replace it.
- **Header:** no Pinterest logo; just the "Thumbnail Studio" title.
- **Template settings (updated 2026-10-08):** picking a template opens it like a folder. The tile grows into a panel that replaces the grid (View Transitions API, instant when unsupported or with reduced motion), holding Scatter, Shuffle, Reset all positions and Copy recipe. A back arrow returns to the grid. Settings stay in view however many templates there are.
- **3D tilt:** both directions: L 30° · L 15° · Off · R 15° · R 30°.
- **Format section:** labeled "FORMAT: BLOG HEADER"; the box shows only "1600 × 900" as body-default text.
- **Template thumbnails fixed (2026-10-08):** Arc and Spread looked wrong in the picker because `gestalt.css` sets `svg * { transform-box: fill-box }`, so rotations pivoted around the wrong point. Thumbnails now pivot in the view box. The canvas and export were always correct.
- **Grid edge columns:** 4 cards added in `templates.json`, one 482px column step outside the existing columns (cx −164 and 1764), with only y changed (left 146/828, right 16/698). Grid now bleeds on all four sides, so about 60px of each edge card shows. On bleed sides, dragging keeps at least 48px of a card on the canvas.
- **Reordering images:** drag a frame chip onto another to swap their images (Alt+←/→ from the keyboard). Styles and positions stay with the frame.
- **More images than frames (2026-10-08):** adding images that don't fit the current layout (including the Empty State's 3) switches to the smallest template that holds them all: 4–5 images load Spread, 6–10 load Grid. That template opens, and any spare images are pulled into view. In a layout with fewer frames than images, the extras appear after the frame chips as greyed "Spare" chips. Drag one onto a frame, or tap it to put it in the selected frame (the frame's image becomes the spare). Up to 10 images in total.
- **Reset buttons:** "Reset frame" returns the selected frame to its template spot and default style. "Reset all" returns every frame's position and style, Scatter, and the background (White) to the template as designed; images and the template stay. Both are undoable.
- **Selection and the Empty State (2026-10-08):** no frame is selected at first. Clicking a frame (canvas or chip) selects it, and clicking empty canvas clears the selection. With nothing selected, the Style panel says "Select a frame to style it" and the per-frame image buttons hide. The Empty State's frames can be selected, dragged (within the 48px margin) and styled; Scatter still only applies to templates.
- **Drop shadow hint:** with no frame selected, pressing the Drop shadow switch opens a Gestalt Popover above it reading "Select a frame to activate drop shadow" (info icon, no button). It closes on outside click or Escape.
- **Spare chips are drag-only:** tapping a spare does nothing; drag it onto a frame to use it.
- **Canvas editing (2026-10-12):**
  - Symmetry lines: while dragging, a frame's center snaps to the canvas's vertical and/or horizontal center line within 12 canvas px, and the snapped line is drawn in the focus color. The margin rule still wins.
  - Selection follows the reference, in the semantic focus blue: outline, four corner handles and a rotation handle on a stem. Corners resize and the top handle rotates, both snapping to the Size (S–XL) and Rotate (−10° to +10°) steps. Cursors change over handles.
  - A floating dark pill toolbar sits under the selected frame (inside the canvas if the frame runs off it), with Delete image (the frame stays), Replace/Add image and Reset frame. Each has a tooltip, a 160ms light-fill hover and a focus-ring pressed state. The matching right-sidebar buttons are gone; Reset all stays there.
  - Template settings removed: no folder view, Scatter, Shuffle, Reset all positions or Copy recipe. Picking a template just applies it. Tiles have a secondary fill, the secondary-weak fill on hover, selected-base when chosen (selected-strong on hover), and TapArea's compress when pressed.
  - The Preview modal has no heading or sub-heading. The Preview button sits 24px below the canvas.
- **Layout pass (2026-10-08):**
  - Headings are sentence case ("Blog header format: 1600 × 900 pixels", "Background", "Templates", "Frames", "Style").
  - Left sidebar, top to bottom: format, Add images, Background (swatches without row labels or center dots) with the Drop shadow switch, Templates. "Pick a template to open its settings." sits right under the Templates heading.
  - Right sidebar: Frames as a 3-column grid of 4:5 tiles with the frame number as a badge, then the frame's image buttons, then Reset frame / Reset all, then Style as a collapsed-by-default Gestalt Accordion.Expandable. Ten frames fit without scrolling on screens 768px tall or more.
  - Preview button under the canvas opens a Gestalt Modal: the design as the lead image of a blog listing (16:9, rounded), an editable title, today's date and sample tags, next to two neutral placeholder articles.
  - ⌘Z / Ctrl+Z is left to text fields when one is focused.
- **Format heading:** "BLOG HEADER FORMAT: 1600 × 900 PIXELS" (in the panel's all-caps section-label style), with no separate size line.
- **Step-control hover:** unselected segments in Size, Rotate, 3D tilt, Border (and Scatter, which shares the control) ease to the elevation-accent fill with the raised-top shadow on hover.
- **Left panel copy:** the IMAGES heading and the "frames filled · spare" count are gone. Under Add images: "JPG or PNG or WebP • Max 10 Images • 10MB Max Per Image". The format size is plain text with no pill.
- **Template tiles:** each illustration is inset 4px inside its white rounded card, so Grid (whose cards cover the whole canvas) shows the white background too.
- **Drop shadow placement:** the switch sits under the Background colors (the container below the canvas, now titled "Background") and applies to the selected frame.
- **Color templates (background + drop shadow):** background and shadow color are chosen together, following the colored-shadow pairs spec. There are 19 options: White (with the neutral gray-roboflow-800 glow, the default) plus 9 hue ramps in two directions. Light means a `-50` background with a `-800` glow and 11px spread; deep means a `-800` background with a `-50` glow and 16px spread. Every glow is 25% opacity, 50px blur, no offset. The picker sits below the canvas.
- **Drop shadow** (renamed from Shadow) is a per-card Off/On control. The glow is drawn by blurring a copy of the card enlarged by the spread, because canvas shadows have no spread. The old shadow strength steps and per-card shadow color are gone.

## Done

1. Run locally without Figma Make.
2. Placeholder image (`public/assets/580dc.svg`) renders in empty cards.
3. Classic theme (`forceTheme` removed; `--color-background-primary-base` is #e60023, `--color-text-subtle` is #767676).
4. Metropolis 400 and 600 via `@font-face`, wired through `--font-family-default-latin`.
5. Artwork colors in `src/theme/artworkPalette.ts`; stroke color picked by luminance.
6. Token pass. Fixed sizes are in `src/theme/sizes.ts`; the header-height `calc()` and `!important` widths are gone (CSS grid layout).
7. `pnpm check:tokens`.
8. Templates load from `src/data/templates.json` via `src/data/templates.ts`, drawn by `z`. The template picker draws each layout's thumbnail from the JSON.
9. Per-card state (styles, offsets) keyed by card slot; offsets reset on template change.
10. Margin rule (see Decisions).
11. "Empty layout" button returns to the Empty State and keeps images.
12. Undo/Redo with ⌘Z / ⇧⌘Z (Ctrl on Windows). A drag is one history step. Object URLs are revoked only once no undo step can show them.
13. Fake save status removed.
14. Shuffle reassigns images and re-rolls Scatter.
15. Style panel is dimmed and inert in the Empty State, with the hint "Pick a template to style frames."
16. Cleanup: `isExportingRef` removed; image load listeners have proper dependencies; object URLs are revoked.

Also done: hit testing accounts for rotation and tilt; export renders to an offscreen canvas without guides or selection; below 1100px wide the canvas stacks above both panels.

### Values with no matching token (item 6 report)

- `opacity={0.5}` on the disabled Style panel and Scatter control. The opacity scale is 0.04 / 0.2 / 0.4 / 0.8 / 0.9.
- Layout breakpoint `1100px` and the stacked stage height `70vh` in `index.css`.
- Canvas-space drawing values (margin guide dash 16/12, guide and outline widths 3 and 6). These are artwork-scale numbers, not UI spacing.
- Motion: Gestalt has no duration or easing tokens, so hovers (step controls, template tiles, frame toolbar) use 160ms ease-out in `index.css`.
- The colored-shadow pairs aren't tokens yet; they live in `artworkPalette.ts`. If the 18 `shadow-{hue}-50-on-800` / `-800-on-50` tokens are added to the design system, consider reading them from there.

## New templates (2026-10-14)

- Designed 8 candidates in code from the existing templates' rules (450×650 frames, 48px margin, Grid's 32px gaps, rotation range, intentional bleed) and reviewed them on a page drawn with the app's renderer. Kept 4:
  - **Cascade** (5): frames dealt along a diagonal at −6°, center frame on top.
  - **Wave** (7): frames along a gentle S-curve, rotations ±10°/±20°.
  - **Skyline** (7): upright frames at stepped heights rising to a center hero.
  - **Tilted grid** (10): Grid's spacing in staggered columns turned −12°, with edge columns on both sides (7–8% visible, like Grid's 7–10%).
- Not kept: Flank, Burst, Pairs, Depth.
- Next: brainstorm reference-inspired layouts that use 3D tilt (see Decision needed below).

## Edits (2026-10-13, fourth pass)

- Templates are listed by frame count, lowest first (ties keep JSON order): Showcase, Arc, Stack, Spread, Table spread, Trail, Strips, Grid.
- Showcase's back card is back to its Figma scale (0.7373×), stored as a fixed `"scale"` on the card. Its Size control is greyed out and inert with the note "Size is fixed by this template", and it has no corner resize handles (rotation still works). This replaces the earlier "starts on S" mapping.
- "Empty layout" is now "Base layout" (button, announcement, and the empty state's name).
- While Preview is open, nothing floats over it: the frame toolbar and toasts are hidden, and swap menus and the drop shadow hint close.

## Templates and edits (2026-10-13, third pass)

- Four templates extracted from Figma page "Templates 2" (122:251) with the Plugin API (exact centers and rotations from each card's absolute transform): Trail (7 cards; bleeds right, bottom, left), Showcase (2; the 0.74× back card starts on Size S, 0.9×, by request), Table spread (5; top, bottom), Strips (7; all sides). Bleed sides were computed from the geometry, so none of them warn at their defaults. Template cards can now carry a starting Size step, which resets honor.
- Template tiles stack the frame count under the name.
- 3D tilt reads −30° · −15° · Off · +15° · +30°.
- Step-control hover uses the darker `--color-background-secondary-weak`, with no shadow.
- Lighten/Darken background is decided by the image's own edge lightness (light image → Darken), fixing the greyed-out "Lighten" on light images.
- The low edge contrast canvas cue is an 8px warning-color stroke just outside the frame (preview only) instead of a tint.

## Edits (2026-10-13, second pass)

- Low edge contrast: no marker on the canvas. Flagged images get a warning icon on their frame tile (Frames panel) and a low-opacity warning tint (`--color-background-warning-base`, preview only, never exported). The notice is built from Gestalt primitives with the icon beside its title, and always offers two full-width medium buttons that match Export: Lighten or Darken background (by whether the image edges are darker or lighter than the background; disabled when no such color exists) and Add outline. Add outline gives every frame without a border a Thin border and shows a Gestalt Toast: "Outline added to all frames to maintain consistency".
- Clicking empty space in the center stage (outside the canvas) clears the frame selection; sidebars and the header don't.
- Border has an "Apply to all" button that copies the selected frame's border to every frame (toast confirms).
- Rings are true circles. "Ripples" is now "Fractal", and it's dominated by the chosen background color (its pair only accents it), so light and deep versions of a hue look clearly different.
- Export button reads "Export", with no icon.
- Regular-weight 12px text is now 14px, matching "No frame selected" (the bold frame-number badges stay 12px). Headings are sentence case; "Thumbnail Studio" is the product name.

## Low edge contrast warning (2026-10-13)

A design-quality check, not a compliance claim (photos are exempt from WCAG 1.4.11). For each image, the visible outer edge (the drawn cover crop, minus rounded corners; or the border color when a frame border is drawn) is compared per side with the background just outside it, sampled from a background-only render (color + pattern) re-projected into the card's own space, so rotation, 3D tilt and size are accounted for. Below 2:1 on any side warns: a warning on the image (see the second pass below) and a notice for the selected frame (not aria-live). Fixes reuse existing controls: Add outline and Lighten/Darken background (the same hue's other tone, or White / Gray deep). Dismissal is per image + background. Re-checks are debounced 150ms after changes and sample at about 96px.

Known limitation: transparent PNGs and cutouts. Mostly transparent sides are skipped, because the visible edge is the subject's silhouette, which isn't judged yet.

Follow-ups:
- Show the 2:1–3:1 "hint" level (computed already; `SHOW_HINT_LEVEL` in `src/lib/edgeContrast.ts`).
- Silhouette contour check for cutouts.
- Also check against Pinterest's dark-mode feed color, since the thumbnail's own edges sit on the feed.
- Rotated images are handled by the card-space reprojection, but the bands assume straight edges; the rounded corners are excluded rather than measured.
- Overlapping frames: the check compares to the background, not to a neighboring frame behind.
- Add unit tests for `src/lib/edgeContrast.ts` if a test runner is added (cases verified once with a temporary script).

## Styling pass (2026-10-13)

- Step controls share one look: equal-width segments of the same height whose labels never break mid-value; with very large text, whole segments wrap to a new row (also fixes the audit's 1.4.4/1.4.12 split-label finding). The step descriptions beside each heading ("As designed", "Flat"…) are gone from view but stay in each segment's accessible name.
- "Style" is now "Frame style". A new "Background style" dropdown sits under it with a Pattern control: None, Rings (dashed concentric ellipses; Rings 1–5, Gap Tight/Medium/Wide) or Ripples (fluted glass; Ribs Fine/Medium/Wide, Wave Off/Soft/Strong). Pattern colors come from the color template's paired glow color. Patterns are part of the artwork (export, Preview, undo) and Reset all clears them. Ripples are rendered once per color/setting and cached.

## Accessibility (WCAG 2.2 AA audit, 2026-10-12)

Audited with axe-core, a keyboard walk, dialog focus checks, reflow/zoom/text-spacing checks, token contrast and a manual review. Automated tools catch only part of the issues; this isn't a conformance claim.

Fixed:
- Frames move without dragging: arrow keys (Shift for 48px) on the canvas, tiles or toolbar, plus a Move mode in the frame toolbar (2.1.1, 2.5.7).
- Images swap without dragging: a "Swap image with…" menu on every frame and spare tile (2.5.7).
- Selection outline and handles in solid `--color-icon-info` over a white halo (1.4.11).
- Template frame counts use the default text color (1.4.3).
- Light color swatches get a `--color-border-default` ring (1.4.11).
- Drop shadow hint announced through the status live region, tooltip role, and focus returns to the switch (4.1.3, 2.4.3).
- Style toggle named "Expand/Collapse style" (2.5.3); section titles exposed as headings (1.3.1); `main` landmark and labelled sidebars; header wraps at 320px (1.4.10).
- A hidden-until-focused "Frame N actions" button jumps from the tiles to the frame toolbar; Escape returns (2.4.3).
- Gestalt 177's IconButton never draws its focus ring (an unresolved `i__imported_accessibilityOutlineFocus` class); `index.css` restores Gestalt's 4px focus outline on that class (2.4.7). Remove when Gestalt fixes it.

Still open (best practice, not failures):
- Selected states are written into accessible names ("…, selected") instead of `aria-pressed`.
- 19 color swatches are 19 tab stops; a radio group with arrow keys would be faster.
- Status messages clear after 4 seconds (they're announced, but slow readers may miss them on screen).
- At 200% text the Gestalt accordion titles truncate ("Frame style ·…"); the frame number is lost visually.
- At 320px (400% zoom) frame tiles are ~40px wide and the swap button covers most of each tile.
- Text sizes are px (Gestalt), so a browser's default font-size setting has no effect (zoom works).
- Not checked: real screen readers (VoiceOver, NVDA, mobile), touch-only use, Gestalt's internal tooltip wrappers (axe "needs review").

## Next

- Keyboard access for spare chips: they move only by dragging today (frame chips also support Alt+←/→).

- Phone-width layout: below about 600px the header wraps and the side panels get cramped. The app targets laptop and desktop today.

- True perspective for 3D tilt. Today it's an affine approximation (horizontal squeeze plus vertical shear), so neither edge gets taller. Real perspective would draw the card in vertical strips, and would need matching changes to the glow, extents and hit testing.

- Arrow-key nudging for the selected card (dragging is pointer-only).
- Replace a single frame's image instead of re-uploading all of them.
- 2× export for high-resolution screens.
- Sync Figma with `templates.json` (the Grid edge columns exist only in the JSON) once the Figma MCP server is authorized.
