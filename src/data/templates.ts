import data from "./templates.json"
import { defaultCardStyle, startStyleFor, type CardStyle } from "./styleOptions"

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
   * A fixed scale from the design (e.g. Showcase's 0.7373× back card). When
   * set, the card always draws at this scale and its Size control is locked.
   */
  scale?: number
  /** Starting Size step value (e.g. 0.8 for XS); the user can change it. */
  size?: number
  /** Starting 3D tilt step value (±15 or ±30); the user can change it. */
  tilt?: number
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
/** Templates ordered by frame count, lowest first (ties keep their JSON order). */
export const templates = [...(data.templates as Template[])].sort(
  (a, b) => a.cards.length - b.cards.length,
)

/** The most cards any layout uses; per-card state is sized to this. */
export const maxCards = Math.max(
  emptyState.cards.length,
  ...templates.map((template) => template.cards.length),
)

/**
 * Every slot's starting style for a template: its cards' own Size and 3D
 * tilt steps, defaults elsewhere (including unused slots).
 */
export function startStyles(template: Template): CardStyle[] {
  return Array.from({ length: maxCards }, (_, slot) =>
    slot < template.cards.length ? startStyleFor(template.cards[slot]) : { ...defaultCardStyle },
  )
}

export function findTemplate(id: string | null): Template {
  return templates.find((template) => template.id === id) ?? emptyState
}
