import { canvas, card, type Template } from "@/data/templates"
import { cardLinearTransform } from "@/lib/composition"

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
        // Drawn with the card's starting size and 3D tilt, like the canvas.
        const [a, b, c, d] = cardLinearTransform(
          templateCard.rotate,
          templateCard.tilt ?? 0,
          templateCard.scale ?? templateCard.size ?? 1,
        )
        return (
          <rect
            className={selected ? "template-card template-card-selected" : "template-card"}
            height={card.height}
            key={templateCard.z}
            rx={card.cornerRadius}
            transform={`matrix(${a} ${b} ${c} ${d} ${templateCard.cx} ${templateCard.cy})`}
            width={card.width}
            x={-card.width / 2}
            y={-card.height / 2}
          />
        )
      })}
    </svg>
  )
}
