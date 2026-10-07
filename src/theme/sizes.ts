// Fixed UI dimensions with no Gestalt token. All sit on the 4px scale.

export const sizes = {
  logo: 40,
  leftPanelWidth: 320,
  rightPanelWidth: 320,
  frameChip: 40,
  swatchLarge: 32,
  swatchSmall: 28,
  previewMinHeight: 420,
} as const

/** Gestalt icon sizes used in the app (24px grid; 16 and 20 for dense UI). */
export const iconSizes = { sm: 16, md: 20, lg: 24 } as const
