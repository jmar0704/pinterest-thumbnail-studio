import { useRef, useState } from "react"
import { Box, Flex, Icon, TapArea, Text } from "gestalt"
import SwapImageMenu from "@/components/SwapImageMenu"
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
    <Icon accessibilityLabel="" color="subtle" icon="image-portrait" size={iconSizes.lg} />
  )
}

/**
 * The current layout's frames as a 3-column grid of portrait tiles, each
 * showing that frame's image with its number as a badge. Tap a tile to select
 * the frame. Drag a tile onto another (or press Alt+←/→) to swap their images.
 *
 * Images that don't fit the layout (e.g. a 4th image in a 3-frame template)
 * follow as greyed "Spare" tiles. Drag one onto a frame to use it there.
 *
 * Every tile also has a "Swap image with…" menu, so swaps never require a
 * drag (WCAG 2.5.7).
 */
export default function FrameChips({
  count,
  selected,
  imageForSlot,
  warningSlots,
  onSelect,
  onSwap,
  spareSlots,
  edgeWarningSlots,
}: {
  count: number
  selected: number | null
  imageForSlot: (slot: number) => string | undefined
  warningSlots: Set<number>
  onSelect: (slot: number) => void
  onSwap: (from: number, to: number) => void
  spareSlots: number[]
  /** Frames whose image edges blend into the background. */
  edgeWarningSlots: Set<number>
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
    setDragging({ from: drag.from, over: slotAt(event.clientX, event.clientY) })
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
    // The click that ends a drag shouldn't also select the tile under it.
    suppressTapRef.current = true
    window.setTimeout(() => (suppressTapRef.current = false))
    setDragging(null)
    setGhost(null)
    if (commit && over !== null && over !== drag.from) onSwap(drag.from, over)
  }

  const slots = [...Array.from({ length: count }, (_, slot) => slot), ...spareSlots]

  return (
    <>
      {/* 20px gap + the tiles' 4px padding: 24px above the spare note, like below it. */}
      <Flex direction="column" gap={5}>
        <Box display="flex" marginEnd={-1} marginStart={-1} wrap>
          {slots.map((slot) => {
            const isSpare = slot >= count
            const src = imageForSlot(slot)
            const isSelected = !isSpare && slot === selected
            const crossesMargin = warningSlots.has(slot)
            const blendsIn = edgeWarningSlots.has(slot)
            const hasWarning = crossesMargin || blendsIn
            const isSource = dragging?.from === slot
            const isTarget = dragging !== null && dragging.over === slot && !isSource
            return (
              <Box column={4} key={slot} padding={1} position="relative">
                <div
                  className={isTarget ? "frame-chip frame-chip-target" : "frame-chip"}
                  data-frame-slot={slot}
                  onKeyDown={(event) => {
                    if (!event.altKey || isSpare) return
                    const step =
                      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
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
                    accessibilityLabel={
                      isSpare
                        ? "Spare image, not in this layout. Drag it onto a frame, or use its swap menu."
                        : `Frame ${slot + 1}${isSelected ? ", selected" : ""}${crossesMargin ? ", crosses the margin" : ""}${blendsIn ? ", image edges may blend into the background" : ""}`
                    }
                    onTap={() => {
                      // Spares only move by dragging; tapping them does nothing.
                      if (suppressTapRef.current || isSpare) return
                      onSelect(slot)
                    }}
                    role="button"
                    rounding={3}
                    tapStyle="compress"
                  >
                    <Box
                      alignItems="center"
                      borderStyle={isSelected ? "lg" : "sm"}
                      color="secondary"
                      dangerouslySetInlineStyle={{ __style: { aspectRatio: "4 / 5" } }}
                      display="flex"
                      justifyContent="center"
                      opacity={isSource || isSpare ? 0.4 : 1}
                      overflow="hidden"
                      position="relative"
                      rounding={3}
                      width="100%"
                    >
                      <ChipFace src={src} />
                      {/* Frame number (or "Spare") badge. */}
                      <Box left margin={1} position="absolute" top>
                        <Box
                          color={isSelected ? "selected" : "default"}
                          paddingX={2}
                          rounding="pill"
                        >
                          <Text color={isSelected ? "inverse" : "default"} size="100" weight="bold">
                            {isSpare ? "Spare" : slot + 1}
                          </Text>
                        </Box>
                      </Box>
                      {hasWarning ? (
                        <Box margin={1} position="absolute" right top>
                          <Box color="default" padding={1} rounding="circle">
                            <Icon
                              accessibilityLabel=""
                              color="warning"
                              icon="workflow-status-warning"
                              size={iconSizes.sm}
                            />
                          </Box>
                        </Box>
                      ) : null}
                    </Box>
                  </TapArea>
                </div>
                {/* Outside the TapArea so it isn't a button inside a button. */}
                <Box bottom margin={2} position="absolute" right>
                  <SwapImageMenu
                    label={isSpare ? "the spare" : `frame ${slot + 1}`}
                    onSwap={onSwap}
                    slot={slot}
                    targets={slots
                      .filter((other) => other !== slot && !(isSpare && other >= count))
                      .map((other) => ({
                        slot: other,
                        label: other >= count ? "Spare image" : `Frame ${other + 1}`,
                      }))}
                  />
                </Box>
              </Box>
            )
          })}
        </Box>
        {spareSlots.length ? (
          <Text color="subtle" size="200">
            {spareSlots.length === 1 ? "1 image doesn't" : `${spareSlots.length} images don't`} fit
            this layout. Drag a spare onto a frame, or use its swap menu.
          </Text>
        ) : null}
      </Flex>

      {/* The tile being dragged follows the pointer. */}
      {dragging && ghost ? (
        <div aria-hidden className="frame-chip-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <Box
            alignItems="center"
            borderStyle="lg"
            color="secondary"
            display="flex"
            height={sizes.dragGhostHeight}
            justifyContent="center"
            overflow="hidden"
            rounding={3}
            width={sizes.dragGhostWidth}
          >
            <ChipFace src={imageForSlot(dragging.from)} />
          </Box>
        </div>
      ) : null}
    </>
  )
}
