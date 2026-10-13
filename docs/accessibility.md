# Accessibility in Thumbnail Studio

What was changed in the prototype to support people using keyboards, screen readers, magnification and other assistive technology, measured against **WCAG 2.2 Level AA**.

> **Scope and honesty.** This is a prototype. The audit used automated tools (axe-core, a scripted keyboard walk, reflow/zoom/text-spacing checks, token contrast) plus manual review. Automated checks catch only part of the problems people actually hit, and none of this replaces testing with disabled people or real screen readers. Nothing here should be read as "fully accessible" or "100% compliant".

## How it was audited

| Check | Tool / method | When |
|---|---|---|
| Rules engine (WCAG 2.0–2.2 A/AA) | axe-core 4.13 via Playwright, on page load and with a frame selected | 2026-10-12, re-run after every fix |
| Keyboard | Scripted Tab walk: order, names, visible focus, traps; dialog checks for Preview and the drop shadow hint | 2026-10-12 |
| Zoom and reflow | 320px width, text forced to 200%, WCAG text-spacing overrides, reduced motion | 2026-10-12, extended 2026-10-13 |
| Contrast | Design-token pairs measured on the rendered page | 2026-10-12 |
| Manual review | Headings, landmarks, labels, drag-only and hover-only interactions, status messages | 2026-10-12 |

**Result after fixes:** 0 axe violations (from 4), no horizontal scroll at 320px, the Preview modal passes every dialog check, and every control has a name and a visible focus ring.

## What was fixed

### Moving and arranging without a mouse

| Problem | Who it affected | Fix | WCAG |
|---|---|---|---|
| Frames could only be moved by dragging on the canvas | Keyboard, switch and voice users; people with tremors | Arrow keys nudge the selected frame 8px (Shift: 48px) from the canvas, frame tiles or toolbar. The frame toolbar has a **Move** mode with four nudge buttons for single-click moves. Same margin limits and center snapping as dragging; snapping to center is announced. | 2.1.1 Keyboard (A), 2.5.7 Dragging Movements (AA) |
| Swapping images (and using spare images) needed a drag | The same groups | Every frame and spare tile has a **"Swap image with…"** menu (Gestalt IconButton + Dropdown). Frame tiles also swap with Alt+←/→. | 2.5.7, 2.1.1 |
| After selecting a frame tile with the keyboard, its toolbar sat earlier in the tab order | Keyboard and screen reader users | A **"Frame N actions"** button, hidden until focused, follows the tiles and jumps into the toolbar; Escape in the toolbar returns to the tile. | 2.4.3 Focus Order (A) |
| Resize and rotate were canvas handles only | Keyboard users | Size and Rotate are also stepped controls in **Frame style**, with the same steps the handles snap to. | 2.1.1 |

### Seeing what's on screen

| Problem | Fix | WCAG |
|---|---|---|
| Selection outline and handles used a 50% blue (1.9:1 on white) | Solid `--color-icon-info` (#0074e8, 4.5:1) over a `--color-background-default` halo (10:1 on deep backgrounds), on the outline, handles, rotation stem and symmetry lines | 1.4.11 Non-text Contrast (AA) |
| Frame counts on template tiles were 3.74:1 | Default text color (14.9:1) | 1.4.3 Contrast (Minimum) (AA) |
| Light color swatches barely showed on the white panel (1.59:1 ring) | Light swatches use a `--color-border-default` ring (4.54:1) | 1.4.11 |
| Gestalt 177's IconButton never drew a focus ring (an unresolved CSS-module class) | `index.css` restores Gestalt's own 4px focus outline on that class. Remove when Gestalt ships the fix. | 2.4.7 Focus Visible (AA) |
| Status colors used alone | Every warning pairs color with an icon and text (margin banner, frame-tile icons, edge contrast notice) | 1.4.1 Use of Color (A) |

### Text size and spacing

| Problem | Fix | WCAG |
|---|---|---|
| At 200% text or with extra letter spacing, step labels broke mid-value ("−10°" read as "−1 / 0°") | Step labels never wrap; whole segments move to a second row when they don't fit | 1.4.4 Resize Text (AA), 1.4.12 Text Spacing (AA) |
| Header scrolled sideways at 320px | Header row wraps | 1.4.10 Reflow (AA) |
| Secondary text was 12px | Regular-weight secondary text is 14px (bold frame-number badges stay 12px) | Best practice |

### Structure, names and announcements

| Problem | Fix | WCAG |
|---|---|---|
| Section titles weren't headings | Format, Background, Templates, Frames and the edge contrast title are exposed as headings | 1.3.1 Info and Relationships (A) |
| No `main` landmark; unlabeled sidebars | `header`, `main`, and sidebars labeled "Images, colors and templates" and "Frames and style" | Best practice (supports 2.4.1) |
| Style dropdown named "Expand section" | "Expand/Collapse frame style" and "Expand/Collapse background style" | 2.5.3 Label in Name (A) |
| Drop shadow hint wasn't announced and Escape lost focus | Hint sent to the status live region; tooltip role; focus returns to the switch | 4.1.3 Status Messages (AA), 2.4.3 |
| Step descriptions removed from view ("As designed", "Flat"…) | Kept in each segment's accessible name ("M, 1.0× (as designed)") | 1.1.1 / 4.1.2 |
| Undo shortcut hijacked text fields | ⌘Z / Ctrl+Z is left to focused text fields | 2.1.1 |
| Confirmations were visual only | Status messages ("Swapped frames 1 and 3", "Outline added to all frames…") go to a polite live region; toasts also announce | 4.1.3 |

### Motion

- All hover and transition animations sit behind `prefers-reduced-motion`.
- Nothing auto-plays, loops or flashes.

## Built-in design-quality check: low edge contrast

Photos are exempt from WCAG 1.4.11, so this isn't a compliance feature. It helps people make thumbnails that read well. The check compares each visible image edge with the background just outside it, and below 2:1 it warns:

- an icon on the frame tile;
- an 8px warning stroke on the canvas (preview only, never in the export);
- a notice with two one-tap fixes.

The warning is never color-only. The notice is static content, not an `aria-live` interruption, and everything in it is keyboard reachable. Details are in [design-decisions.md](design-decisions.md#low-edge-contrast-warning).

## Known gaps

- **At 200% text,** Gestalt's accordion titles truncate ("Frame style ·…").
- **At 320px (400% zoom),** frame tiles are about 40px wide and the swap button covers most of each tile.
- **Font size setting:** Gestalt sizes text in px, so a browser's default font-size setting has no effect. Browser zoom works.
- **Selected states** are written into accessible names ("…, selected") rather than using `aria-pressed`.
- **The 19 color swatches** are 19 tab stops. A radio group with arrow keys would be faster.
- **Status messages** clear after 4 seconds. They're announced, but slower readers may miss them on screen.
- **Spare tiles** have no Alt+arrow shortcut; their swap menu covers keyboard use.
- **Not tested:** real screen readers (VoiceOver, NVDA, mobile), touch-only use, or Gestalt's internal tooltip wrappers (axe "needs review").

## Manual test script

**Keyboard only**
1. Reload, then Tab through everything. The focus ring should always be visible, including on Undo, Redo and the swap buttons.
2. Press Space on Drop shadow with no frame selected. The hint should appear, and Escape should leave focus on the switch.
3. Pick a template, Tab to a frame tile, and press Enter. Move the frame with the arrow keys (Shift moves further).
4. Tab to "Frame N actions" and press Enter. You should land in the toolbar. Open Move, nudge the frame, then press Escape twice to get back to the tile.
5. Open a tile's swap menu and choose another frame.
6. Open Preview, Tab around inside it, press Escape, and confirm focus returns to Preview.

**VoiceOver (macOS)**
1. Press Cmd+F5 to start.
2. Press VO+U and check the Headings and Landmarks lists.
3. Press the drop shadow switch with no frame selected; you should hear the hint.
4. Swap two frames; you should hear the confirmation.
5. Press Cmd+F5 to stop.
