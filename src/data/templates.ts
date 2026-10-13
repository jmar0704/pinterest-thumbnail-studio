import data from "./templates.json"

export type BleedSide = "top" | "right" | "bottom" | "left"

export type TemplateCard = {
  /** Stacking order, 0 = back. */
  z: number
  /** Card center in canvas px. */
  cx: number
  cy: number
  /** Degrees, clockwise positive. */
  rotate: number
  /**
   * The card's starting Size step label ("S", "M", …) when the design calls
   * for a non-default size, e.g. Showcase's smaller back card. Default "M".
   */
  size?: string
}

export type Template = {
  id: string
  name: string
  figmaNodeId: string
  allowBleed: BleedSide[]
  cards: TemplateCard[]
  note?: string
}

export type Canvas = {
  width: number
  height: number
  background: string
  clipContent: boolean
  margin: number
  guideGrid: {
    enforced: boolean
    columns: number
    rows: number
    gutter: number
    columnWidth: number
    rowHeight: number
  }
}

export type Card = {
  width: number
  height: number
  cornerRadius: number
  placeholder: {
    fill: string
    stroke: string
    strokeWidth: number
    iconSize: number
    iconAlign: string
  }
}

export const canvas: Canvas = data.canvas
export const card: Card = data.card
export const emptyState = data.emptyState as Template
export const templates = data.templates as Template[]

/** The most cards any layout uses; per-card state is sized to this. */
export const maxCards = Math.max(
  emptyState.cards.length,
  ...templates.map((template) => template.cards.length),
)

export function findTemplate(id: string | null): Template {
  return templates.find((template) => template.id === id) ?? emptyState
}
