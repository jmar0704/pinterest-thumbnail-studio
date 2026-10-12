import { useRef, useState } from "react"
import { Dropdown, IconButton } from "gestalt"

/**
 * A small menu on each frame tile listing the other frames (and spares) to
 * swap images with. It's the single-click and keyboard alternative to
 * dragging one tile onto another (WCAG 2.5.7).
 */
export default function SwapImageMenu({
  slot,
  label,
  targets,
  onSwap,
}: {
  slot: number
  /** How this tile is named, e.g. "frame 2" or "spare image". */
  label: string
  targets: { slot: number; label: string }[]
  onSwap: (from: number, to: number) => void
}) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  if (!targets.length) return null
  return (
    <>
      <IconButton
        accessibilityControls={`swap-menu-${slot}`}
        accessibilityExpanded={open}
        accessibilityHaspopup
        accessibilityLabel={`Swap ${label}'s image with…`}
        bgColor="white"
        icon="reorder-images"
        onClick={() => setOpen((value) => !value)}
        ref={anchorRef}
        selected={open}
        size="xs"
        tooltip={{ text: "Swap image with…" }}
      />
      {open ? (
        <Dropdown
          anchor={anchorRef.current}
          headerContent="Swap image with"
          id={`swap-menu-${slot}`}
          onDismiss={() => setOpen(false)}
        >
          {targets.map((target) => (
            <Dropdown.Item
              key={target.slot}
              onSelect={() => {
                setOpen(false)
                onSwap(slot, target.slot)
              }}
              option={{ value: String(target.slot), label: target.label }}
            />
          ))}
        </Dropdown>
      ) : null}
    </>
  )
}
