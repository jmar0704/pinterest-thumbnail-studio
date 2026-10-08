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
      {cards.map((templateCard) => (
        <rect
          className={selected ? "template-card template-card-selected" : "template-card"}
          height={card.height}
          key={templateCard.z}
          rx={card.cornerRadius}
          transform={`rotate(${templateCard.rotate} ${templateCard.cx} ${templateCard.cy})`}
          width={card.width}
          x={templateCard.cx - card.width / 2}
          y={templateCard.cy - card.height / 2}
        />
      ))}
    </svg>
  )
}
