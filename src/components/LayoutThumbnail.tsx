import { canvas, card, type Template } from "@/data/templates"

/** A template's card silhouettes, drawn from templates.json. */
export default function LayoutThumbnail({
  template,
  selected,
}: {
  template: Template
  selected: boolean
}) {
  const cards = [...template.cards].sort((a, b) => a.z - b.z)
  return (
    <svg
      aria-hidden
      className="template-thumbnail"
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
    >
      {cards.map((templateCard) => {
        // Cards with a fixed template scale (Showcase) are drawn at that size.
        const scale = templateCard.scale ?? 1
        return (
          <rect
            className={selected ? "template-card template-card-selected" : "template-card"}
            height={card.height * scale}
            key={templateCard.z}
            rx={card.cornerRadius * scale}
            transform={`rotate(${templateCard.rotate} ${templateCard.cx} ${templateCard.cy})`}
            width={card.width * scale}
            x={templateCard.cx - (card.width * scale) / 2}
            y={templateCard.cy - (card.height * scale) / 2}
          />
        )
      })}
    </svg>
  )
}
