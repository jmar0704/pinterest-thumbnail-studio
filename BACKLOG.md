# Backlog

Work from top to bottom, one item per task. Items marked **Decision needed** require proposing options and getting an answer before writing code.

## Decisions (2026-10-07)

- **Images:** up to the largest template's card count (6). When there are fewer images than cards, they repeat in order.
- **Style scope:** style controls apply to the selected card only. Switching templates (or going back to the Empty State) resets styles and positions, because card slots don't correspond between templates. Undo restores them.
- **Stepped controls, not free sliders:** non-designers shouldn't be able to push a card to an extreme. Per-card controls are Gestalt `SegmentedControl`s: Size (S 0.9× · M 1.0× · L 1.1× · XL 1.2×), Rotate (−10° to +10° in 5° steps, added to the template's rotation), 3D tilt (Off · Subtle · Strong), Border (None · 4 · 8 · 12 px), Shadow (None · Soft · Mid · Strong), plus Shadow color when a shadow is on. Steps live in `src/data/styleOptions.ts`.
- **Scatter** replaced the per-card Offset, Rotation-jitter and Depth sliders. It is one composition-wide control (Off · Subtle · Playful) with seeded per-card randomness.
- **Margin rule:** dragging is clamped to the 48px margin on sides the template doesn't allow to bleed. On bleed sides the card's center stays on the canvas. Style controls and Scatter may still push a card past the margin; that shows a warning banner, a warning mark on the frame chip, a warning outline on the card and the margin guide. The guide appears only in the preview, never in the export.
- **Positions:** "Reset position" (Style panel) returns the selected card to its template spot; "Reset all positions" (canvas toolbar) returns every card.
- **Shuffle** re-rolls Scatter and reassigns images to cards. It's disabled, with a tooltip, when it would have no effect.
- **Save status:** the fake "Saving…" status is gone. The header shows only real events (upload, export, copy, reset) for a few seconds.
- **"Frame N" header button:** removed. The frame chips in the Style panel replace it.
- **Header:** no Pinterest logo; just the "Thumbnail Studio" title.
- **Template settings:** picking a template opens a settings card under the template grid with Scatter, Shuffle, Reset all positions and Copy recipe. The toolbar above the canvas is gone.
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
- The colored-shadow pairs aren't tokens yet; they live in `artworkPalette.ts`. If the 18 `shadow-{hue}-50-on-800` / `-800-on-50` tokens are added to the design system, consider reading them from there.

## Next

- Arrow-key nudging for the selected card (dragging is pointer-only).
- Replace a single frame's image instead of re-uploading all of them.
- 2× export for high-resolution screens.
- Check the rendering against the Figma file once the Figma MCP server is authorized.
