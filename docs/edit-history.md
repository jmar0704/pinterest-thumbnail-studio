# Edit history

How Thumbnail Studio evolved from a Figma Make export into the current prototype, in the order the work happened (2026-10-07 → 2026-10-14). Each phase lists what changed and the reason, where it matters. Commit hashes are included where a commit maps to the phase.

## 1. Getting it running locally (Oct 7)

- Imported the Figma Make export into `Pinterest_Thumbnail_Maker` and started a git repository (`d7f636e`).
- Installed Node 24 and pnpm. Removed the Figma Make Vite plugins and environment variables, and gave `index.html` a real language and title (`4046392`).
- Fixed an existing type error (a Gestalt Button used a color it doesn't support).

## 2. Foundation and the first editor rebuild (Oct 7)

Commit `958adbf`.

- **Design system:**
  - Switched to Gestalt's **classic** theme.
  - Wired **Metropolis** (400/600) through Gestalt's font variable.
  - Moved every artwork color into `artworkPalette.ts`.
  - Added `pnpm check:tokens`, which fails the build on stray hex, rgb() or hsl() values.
- **Templates:** they load from `templates.json`, cards are drawn by stacking order, and the picker draws each layout from the JSON.
- **Sliders became stepped controls.** Size, Rotate, 3D tilt, Border, and Shadow became segmented controls. That fixed a bug: the old Depth slider rendered every card at 90% even "at default".
- **State is tracked per card,** not per image, so dragging one card no longer moves its duplicate.
- **Free drag** is clamped to the 48px margin, except on sides a template allows to bleed. **Reset position** and **Reset all positions** were added.
- **Margin warnings:** a banner, an icon on the tile, an outline on the card, and the margin guide.
- **Undo/Redo** (one step per drag), real status messages instead of a fake "Saving…", and a responsive layout.

## 3. Colors and templates as a workflow (Oct 7–8)

- **Color templates:** the background and the drop-shadow glow are chosen together, following the colored-shadow pairs spec. There are 19 options: White, plus 9 hues in a light and a deep version. Drop shadow became per-frame on/off, using a spec-accurate glow (`5978f05`).
- **Templates open like a folder:** the tile animates into a settings panel (`238ba09`). Later removed, see phase 8.
- **One image per frame:** uploads fill empty frames, and each frame can replace or remove its image.
- **3D tilt** goes both ways.
- **The picker illustrations were wrong:** Gestalt's CSS changes the pivot point of SVG rotations. That was fixed, and Grid gained two edge columns, for 10 frames (`0d311c6`).
- **Drag to swap** images between frame tiles.
- **Adding more images than the layout holds** switches to the smallest template that fits. Extras become greyed **Spare** tiles. **Reset frame** and **Reset all** were added (`6c2a7ef`).
- **Frame selection is optional:** clicking empty canvas clears it. The Empty State became editable, and a drop shadow hint appears when no frame is selected (`20f4c91`).

## 4. Layout pass (Oct 8)

Commits `e38b050` and `50ba123`.

- Headings changed to sentence case, and the format line now reads "Blog header format: 1600 × 900 pixels".
- Frames became a 3-column grid of larger tiles with number badges. Style became a dropdown.
- The Background picker and Drop shadow moved to the left sidebar.
- A **Preview** modal shows the design as the lead image of a blog listing, with an editable title.

## 5. Canvas editing (Oct 12)

Commit `a6d1435`.

- **Symmetry lines:** a frame's center snaps to the canvas center lines while dragging.
- **Selection handles,** styled after the reference: corner handles resize and the top handle rotates, both snapping to the Size and Rotate steps.
- **Floating frame toolbar:** Delete image, Replace image, and Reset frame. The duplicate buttons were removed from the sidebar.
- **Template settings removed:** Scatter, Shuffle, and Copy recipe are gone, and picking a template just applies it.

## 6. Accessibility audit (Oct 12)

Commits `6727865` through `19ef486`. A WCAG 2.2 AA audit, fixed in seven commits. See [accessibility.md](accessibility.md).

## 7. Styling and background patterns (Oct 13)

Commit `699915e`.

- **Consistent step controls:** same-height segments, and labels never break mid-value. Descriptions moved into the accessible names.
- "Style" became **Frame style**, and **Background style** was added, with Rings and Ripples patterns colored from the color template.

## 8. Low edge contrast warning (Oct 13)

- **First version** (`a59642b`): each visible image edge is compared with the background outside it, using a background-only render re-projected into the card's own space. A marker and a notice offer one-tap fixes.
- **Rework** (`733e2de`):
  - A warning icon on the frame tile, and a canvas cue instead of the marker.
  - The notice has its icon beside the title and two Export-style buttons.
  - **Add outline** applies a border to every frame and shows a toast.
  - **Apply to all** was added for Border.
  - Clicking empty stage space deselects.
  - Rings became circles. Ripples was renamed **Fractal** and follows the background color.
  - The Export button lost its icon, and secondary text went up to 14px.

## 9. New templates and fixes (Oct 13)

Commit `54953fb`.

- **Four templates extracted from Figma** ("Templates 2", 122:251) with the Plugin API: **Trail** (7 frames), **Showcase** (2), **Table spread** (5), and **Strips** (7). Bleed sides were computed from the geometry. Showcase's 0.74× back card starts on Size S.
- 3D tilt labels became −30° through +30°, and the step hover became a darker gray.
- **Lighten/Darken** is now decided by the image's own lightness, which fixes the greyed-out "Lighten" on light images.
- The canvas warning is an 8px orange stroke just outside the frame.

## 10. Final polish (Oct 13)

- Templates are ordered by frame count.
- Showcase's back card keeps its exact Figma scale (0.737×), and its Size control is locked and greyed out.
- "Empty layout" was renamed **Base layout**.
- Nothing floats over the Preview modal.

## 11. Templates designed in code (Oct 14)

- Eight candidates were designed from the rules in the existing templates and reviewed on a page drawn with the app's own renderer.
- Four became official: **Cascade** (5), **Wave** (7), **Skyline** (7), and **Tilted grid** (10, with edge columns like Grid's).

## Ground rules that held throughout

- **Design system:** Gestalt components first. Custom components are composed from Gestalt primitives and semantic tokens. Raw colors exist only in the artwork palette and the template JSON.
- **Defaults:** with every control at its default, each template renders exactly as its JSON specifies.
- **Checks:** every change was typechecked, built, token-checked, and verified in a browser before it was committed.
