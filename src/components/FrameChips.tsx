import { useRef, useState } from "react"
import { Box, Flex, Icon, TapArea, Text } from "gestalt"
import { iconSizes, sizes } from "@/theme/sizes"

type Drag = {
  from: number
  pointerId: number
  startX: number
  startY: number
  active: boolean
}

function ChipFace({ src }: { src: string | undefined }) {
  return src ? (
    <img alt="" className="image-chip" draggable={false} src={src} />
  ) : (
    <Icon accessibilityLabel="" color="subtle" icon="image-portrait" size={iconSizes.md} />
  )
}

/**
 * One chip per card in the current layout, showing that card's image.
 * Tap to select a frame. Drag a chip onto another (or press Alt+←/→) to swap
 * their images.
 */
export default function FrameChips({
  count,
  selected,
  imageForSlot,
  warningSlots,
  onSelect,
  onSwap,
}: {
  count: number
  selected: number
  imageForSlot: (slot: number) => string | undefined
  warningSlots: Set<number>
  onSelect: (slot: number) => void
  onSwap: (from: number, to: number) => void
}) {
  const dragRef = useRef<Drag | null>(null)
  const suppressTapRef = useRef(false)
  const [dragging, setDragging] = useState<{ from: number; over: number | null } | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)

  const slotAt = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-frame-slot]")
    return element ? Number(element.dataset.frameSlot) : null
  }

  const onPointerDown = (slot: number) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    dragRef.current = {
      from: slot,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return
      drag.active = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const over = slotAt(event.clientX, event.clientY)
    setDragging({ from: drag.from, over })
    setGhost({ x: event.clientX, y: event.clientY })
  }

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.active) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const over = slotAt(event.clientX, event.clientY)
    // The click that ends a drag shouldn't also select the chip under it.
    suppressTapRef.current = true
    window.setTimeout(() => (suppressTapRef.current = false))
    setDragging(null)
    setGhost(null)
    if (commit && over !== null && over !== drag.from) onSwap(drag.from, over)
  }

  return (
    <>
      <Flex gap={2} wrap>
        {Array.from({ length: count }, (_, slot) => {
          const src = imageForSlot(slot)
          const isSelected = slot === selected
          const hasWarning = warningSlots.has(slot)
          const isSource = dragging?.from === slot
          const isTarget = dragging !== null && dragging.over === slot && !isSource
          return (
            <div
              className={isTarget ? "frame-chip frame-chip-target" : "frame-chip"}
              data-frame-slot={slot}
              key={slot}
              onKeyDown={(event) => {
                if (!event.altKey) return
                const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
                const to = slot + step
                if (step && to >= 0 && to < count) {
                  event.preventDefault()
                  onSwap(slot, to)
                }
              }}
              onPointerCancel={(event) => finishDrag(event, false)}
              onPointerDown={onPointerDown(slot)}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => finishDrag(event, true)}
            >
              <TapArea
                accessibilityLabel={`Frame ${slot + 1}${isSelected ? ", selected" : ""}${hasWarning ? ", crosses the margin" : ""}. Drag, or press Alt plus arrow keys, to swap images.`}
                onTap={() => {
                  if (!suppressTapRef.current) onSelect(slot)
                }}
                role="button"
                rounding={3}
                tapStyle="compress"
              >
                <Flex alignItems="center" direction="column" gap={1}>
                  <Box
                    alignItems="center"
                    borderStyle={isSelected ? "lg" : "sm"}
                    color="secondary"
                    display="flex"
                    height={sizes.frameChip}
                    justifyContent="center"
                    opacity={isSource ? 0.4 : 1}
                    overflow="hidden"
                    rounding={3}
                    width={sizes.frameChip}
                  >
                    <ChipFace src={src} />
                  </Box>
                  <Flex alignItems="center" gap={1}>
                    {hasWarning ? (
                      <Icon
                        accessibilityLabel=""
                        color="warning"
                        icon="workflow-status-warning"
                        size={iconSizes.sm - 4}
                      />
                    ) : null}
                    <Text
                      color={isSelected ? "default" : "subtle"}
                      size="100"
                      weight={isSelected ? "bold" : "normal"}
                    >
                      {slot + 1}
                    </Text>
                  </Flex>
                </Flex>
              </TapArea>
            </div>
          )
        })}
      </Flex>

      {/* The chip being dragged follows the pointer. */}
      {dragging && ghost ? (
        <div
          aria-hidden
          className="frame-chip-ghost"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <Box
            alignItems="center"
            borderStyle="lg"
            color="secondary"
            display="flex"
            height={sizes.frameChip}
            justifyContent="center"
            overflow="hidden"
            rounding={3}
            width={sizes.frameChip}
          >
            <ChipFace src={imageForSlot(dragging.from)} />
          </Box>
        </div>
      ) : null}
    </>
  )
}
