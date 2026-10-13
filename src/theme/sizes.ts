// Fixed UI dimensions with no Gestalt token. All sit on the 4px scale.

export const sizes = {
  leftPanelWidth: 320,
  rightPanelWidth: 320,
  /** The frame tile that follows the pointer while dragging (4:5, like the tiles). */
  dragGhostWidth: 64,
  dragGhostHeight: 80,
  swatchLarge: 32,
  /** Icon buttons in the floating frame toolbar. */
  toolbarButton: 48,
  /** Gap between the selected frame and its floating toolbar. */
  toolbarOffset: 12,
  previewModalWidth: 1120,
} as const

/** Gestalt icon sizes used in the app (24px grid; 16 and 20 for dense UI). */
export const iconSizes = { sm: 16, md: 20, lg: 24 } as const
