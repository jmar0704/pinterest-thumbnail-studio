# Design decisions

The key product and design decisions behind Thumbnail Studio: what was considered, what was chosen, and why. Where a later decision replaced an earlier one, both are kept so the reasoning stays traceable.

Format: **Context** → **Options** → **Decision** → **Why**.

---

## Product foundations

### Stepped controls instead of free sliders
- **Context:** The original sliders ran 0–100 with no units. They could push cards to extremes, and at their default values they didn't even reproduce the template (every card rendered at 90%).
- **Options:** keep the 0–100 sliders; sliders with real units; stepped segments.
- **Decision:** Stepped segments built on Gestalt `SegmentedControl`: Size S–XL, Rotate ±10° in 5° steps, 3D tilt −30° to +30°, and Border None/Thin/Mid/Thick (Border later became an on/off preset, see below).
- **Why:** The tool is for non-designers as much as designers. Steps keep every result "on brand", make defaults explicit, and keep each template exactly as designed at default.

### Style is per frame
- **Options:** global styles with per-frame overrides; per frame only; global only.
- **Decision:** Per frame. **Add outline** (edge contrast notice) is the one shortcut that turns the border on for every frame. Border's earlier **Apply to all** went away when Border became a preset.
- **Why:** Designers wanted control over individual frames. The "all frames" shortcuts cover the common case where consistency matters more.

### The 48px margin
- **Options:** clamp cards inside the margin; allow crossing with a warning; clamp only while dragging.
- **Decision:** Dragging is clamped. Size, rotation, and tilt changes may cross the margin, which shows a warning: a banner with an icon and text, an icon on the frame tile, and an outline on the card. Sides a template marks as `allowBleed` are exempt.
- **Why:** A card at maximum size is taller than the safe area, so clamping can't always work. Warning keeps people in control without silent snapping.

### Fixed-size template cards
- **Context:** Showcase's back card is 0.737× in Figma, smaller than any Size step.
- **Options:** add an XS step; shrink S; map it to S (0.9×); keep the exact scale and lock it.
- **Decision:** Keep the exact scale, as a fixed `"scale"` on the card. Its Size control is greyed out with "Size is fixed by this template", and it gets no resize handles.
- **Why:** The template renders exactly as designed, and nobody can break the composition the smaller card exists for. Mapping it to S was tried first, but it changed the design.

### Templates designed in code
- **Context:** New layouts were wanted beyond the Figma set.
- **Decision:** Candidates are generated from the existing templates' rules, checked numerically (bleed sides, margin, how much of each frame is visible), and reviewed on a page rendered by the app before being added. Kept templates have an empty `figmaNodeId` and a note.
- **Why:** They stay consistent with the hand-made set, and nothing reaches the picker until it has been seen as it will render.

### Templates that start on other steps
- **Context:** Coverflow needs smaller frames toward the edges and frames turned toward the center; Turned row needs every frame at −30°.
- **Options:** a fixed, locked scale and tilt (like Showcase); a base the control adds to (like Rotate); the control's starting step.
- **Decision:** Starting step. A card's `size` and `tilt` choose where Size and 3D tilt start; Reset returns there. Size gained XS (0.8×) so Coverflow can use presets (L, M, S, XS). 3D tilt keeps its slanted look rather than true perspective.
- **Why:** The design reads correctly at first, people can still adjust any frame, and every size is a preset they can see in the control.

### templates.json is the source of truth
- **Decision:** Layouts were extracted from Figma, and now live in the JSON. Rendering bugs are fixed in code, never by editing geometry. New templates are extracted from Figma with the Plugin API, using each card's absolute transform for exact centers and rotations.
- **Why:** The templates are the product's value. One canonical file keeps the app, the picker illustrations, and the export in sync.

---

## Images and frames

### One image per frame
- **Context:** Images originally repeated across frames, so one upload filled three frames.
- **Decision:** Each frame holds its own image. Uploads fill empty frames in order. If more images arrive than the layout holds, the app switches to the smallest template that fits. Images that don't fit a smaller layout become greyed **Spare** tiles.
- **Why:** It matches how people think ("this photo goes here") and never silently drops images.

### Swapping images
- **Decision:** Drag a tile onto another, or use the **Swap image with…** menu, or Alt+←/→. Spare tiles are drag-or-menu only; tapping one does nothing.
- **Why:** Drag is fast for mouse users. The menu meets WCAG 2.5.7 for everyone else. Tapping a spare is reserved, so a stray tap can't replace an image.

### Selection and canvas handles
- **Decision:**
  - **Selection is optional:** no frame is selected at first, and clicking empty space (on the canvas or the stage around it) clears it.
  - **Handles:** the selection shows corner and rotation handles, which snap to the same Size and Rotate steps as the controls.
  - **Toolbar:** a floating toolbar holds Move, Delete image, Replace image, and Reset frame.
- **Why:** This follows familiar canvas-editor conventions from your reference. Snapping keeps direct manipulation consistent with the stepped controls.

### Selection color
- **Options:** the reference's purple (a base-palette value); the semantic focus blue.
- **Decision:** Blue. It started as `--color-border-focus` and became the solid `--color-icon-info` with a white halo after the accessibility audit.
- **Why:** It uses semantic tokens only. The halo keeps it visible on light and deep backgrounds (1.4.11).

### Symmetry snapping
- **Decision:** While dragging, a frame's center snaps to the canvas center lines within 12px, and the line is drawn. Keyboard nudges snap only when moving toward center.
- **Why:** It makes manual centering easy, and a centered frame can still be nudged off center.

---

## Color and backgrounds

### Background and drop shadow as color templates
- **Context:** The colored-shadow pairs spec pairs each hue's -50 tone with its -800 tone.
- **Decision:** 19 color templates (White, plus 9 hues in a light and a deep version) set the background and the glow color together. The glow is 25% opacity, 50px blur, with 11px or 16px spread. Since canvas has no spread, the glow is drawn by blurring an enlarged copy of the card. Drop shadow is a per-frame on/off switch that lives with the colors.
- **Why:** The pairing is always correct by construction, and the glow color makes sense next to the background it belongs to.

### Border as a preset (2026-10-15)
- **Context:** Drop shadow is an on/off preset whose color comes from the background. Border already took its color from the background, but had four widths in Frame style.
- **Decision:** Border is now an on/off switch at the Mid width (8px), per frame, beside Drop shadow under the Background colors. One shared line under both says which frame they apply to. Frame style keeps Size, Rotate and 3D tilt.
- **Why:** Both are looks that depend on the background, so they live with it and behave the same way. One good width removes a choice non-designers didn't need.

### Background style tiles (2026-10-15)
- **Decision:** Background style sits above Frame style. None, Rings and Fractal are tiles with the template tiles' look, hover and press states, each previewing its pattern in the current colors and settings. Picking Rings or Fractal opens its settings in a panel that unfolds under the tiles like a folder (its tab points at the chosen tile); pressing the chosen tile again folds it away. Reduced motion turns the animation off.
- **Why:** Patterns are as visual as templates, so they're picked the same way. Unlike templates they have settings, and the folder keeps them attached to the tile they belong to.

### Background patterns
- **Decision:** A **Background style** dropdown offers **Rings** (dashed concentric circles; count and gap) and **Fractal** (fluted-glass ribs; rib width and wave). Patterns take their colors from the color template, so the chosen background dominates and its pair only accents it.
- **Why:** Patterns add variety without leaving the palette. "Ripples" was renamed Fractal, and rebalanced after light and deep versions of a hue came out looking the same.

---

## Low edge contrast warning

- **Context:** An image whose outer edge matches the background (for example, a dark photo on a dark background) disappears into it.
- **Measurement:**
  - **What's compared:** for each side, the visible edge (the drawn crop, minus rounded corners, or the border color when a border is drawn) against the background just outside it. The background comes from a background-only render re-projected into the card's own space, which handles rotation, tilt, and size.
  - **What's skipped:** sides that touch the canvas edge, and transparent cutouts.
  - **Thresholds:** below 2:1 warns. A 2:1–3:1 "hint" level is computed but hidden.
  - **Performance:** re-checks are debounced 150ms after changes and sample at about 96px.
- **Presentation (iterated twice):**
  - **First version:** a marker on the canvas and a BannerCallout.
  - **Final version:** a warning icon on the frame tile, an 8px orange stroke just outside the frame on the canvas (preview only, never exported), and a notice with the icon beside the title and two buttons that match the Export button.
- **Fixes:**
  - **Lighten/Darken background:** decided by the image's own lightness, using an existing color.
  - **Add outline:** turns the Border preset on for every frame and shows a toast: "Outline added to all frames to maintain consistency". This keeps frames consistent instead of outlining just one.
- **Why:** It's a design-quality aid, not a compliance claim, since photos are exempt from WCAG 1.4.11. It's quiet and non-blocking, never color-only, and its fixes reuse existing controls.

---

## Interface

### Templates: from folder to simple picker
- **First:** picking a template opened a settings card under the grid.
- **Then:** the tile animated into a folder-style settings panel.
- **Final:** the settings (Scatter, Shuffle, Copy recipe) were removed. Picking a template just applies it, tiles have hover, selected, and pressed states, and templates are listed by frame count (fewest first).
- **Why:** The settings added complexity without enough value. The picker scales to more templates without scrolling to find settings.

### Panels
- **Left sidebar:** the format line, Add images, Background and Drop shadow, and Templates.
- **Right sidebar:**
  - **Frames:** a 3-column grid that fits 10 frames without scrolling on a laptop.
  - **Then:** the edge contrast notice and Reset all.
  - **Then:** the **Frame style** and **Background style** dropdowns, collapsed by default.
- **Why:** Content you choose once (images, colors, layout) sits on the left. Per-frame editing sits on the right, next to the frames it affects.

### Typography and copy
- **Decisions:** Metropolis through Gestalt's font variable. Sentence-case headings. Regular-weight secondary text at 14px (bold badges at 12px). "Export" with no icon. Step descriptions removed from view but kept for screen readers.
- **Why:** These follow the design system's type roles, read better at small sizes, and keep the panels calm.

### Motion and hover
- **Decision:** Short (160ms) background-color hovers using the design system's darker gray, with no shadows, all disabled under reduced motion.
- **Why:** Gestalt has no motion tokens, so the values are minimal and flagged in the backlog.

---

## Process

- **Token guard:** `pnpm check:tokens` runs before every commit, along with the typecheck and build.
- **Flagging gaps:** when no token fits, the gap is flagged rather than a value invented. Examples: the 50% disabled opacity, the layout breakpoint, motion durations, and the colored-shadow pairs.
- **Verification:** features are tested in a real browser (headless when the pane is hidden), and accessibility claims come with measured evidence.
