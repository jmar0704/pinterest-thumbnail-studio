import { useEffect, useRef, useState } from "react"
import { Box, Flex, Icon, TapArea, Tooltip } from "gestalt"
import { iconSizes, sizes } from "@/theme/sizes"

type Action = {
  id: string
  label: string
  icon:
    | "move-pin"
    | "trash-can"
    | "camera-roll"
    | "refresh"
    | "arrow-back"
    | "arrow-up"
    | "arrow-down"
    | "arrow-forward"
    | "check-circle"
    | "duplicate"
  disabled?: boolean
  onTap: () => void
}

function ToolbarButton({ action }: { action: Action }) {
  // Hovered and pressed buttons get a light fill, so their icon turns dark.
  const [lit, setLit] = useState(false)
  return (
    <Tooltip idealDirection="up" text={action.label}>
      <div
        className={action.disabled ? "frame-action frame-action-disabled" : "frame-action"}
        data-toolbar-action={action.id}
        onMouseEnter={() => setLit(true)}
        onMouseLeave={() => setLit(false)}
      >
        <TapArea
          accessibilityLabel={action.label}
          disabled={action.disabled}
          onBlur={() => setLit(false)}
          onFocus={() => setLit(true)}
          onTap={action.onTap}
          rounding="circle"
          tapStyle="compress"
        >
          <Box
            alignItems="center"
            display="flex"
            height={sizes.toolbarButton}
            justifyContent="center"
            width={sizes.toolbarButton}
          >
            <Icon
              accessibilityLabel=""
              color={action.disabled ? "disabled" : lit ? "dark" : "light"}
              icon={action.icon}
              size={iconSizes.lg}
            />
          </Box>
        </TapArea>
      </div>
    </Tooltip>
  )
}

/**
 * Floating actions for the selected frame, shown just below it on the canvas:
 * move it without dragging, duplicate it (also Cmd/Ctrl+D, or copy and paste
 * with Cmd/Ctrl+C and V) up to 10 frames, delete its image (the frame stays), replace or
 * add its image, and reset the frame's position and style.
 *
 * "Move frame" swaps the actions for four nudge arrows and Done, so frames can
 * be moved with single clicks or taps (WCAG 2.5.7) as well as by dragging.
 */
export default function FrameToolbar({
  slot,
  hasImage,
  canReset,
  duplicate,
  nudgeStep,
  onNudge,
  onDeleteImage,
  onReplaceImage,
  onResetFrame,
  onExit,
}: {
  slot: number
  hasImage: boolean
  canReset: boolean
  /** Duplicate frame: its tooltip says why it's off (no image, or 10 frames). */
  duplicate: { disabled: boolean; label: string; onDuplicate: () => void }
  /** Canvas px each nudge button moves the frame. */
  nudgeStep: number
  onNudge: (dx: number, dy: number) => void
  onDeleteImage: () => void
  onReplaceImage: () => void
  onResetFrame: () => void
  /** Escape outside Move mode: hand focus back (to the selected frame tile). */
  onExit: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [moving, setMoving] = useState(false)
  const pendingFocus = useRef<string | null>(null)

  // After switching modes, keep keyboard focus inside the toolbar.
  useEffect(() => {
    if (!pendingFocus.current) return
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-toolbar-action="${pendingFocus.current}"] [role="button"]`)
      ?.focus()
    pendingFocus.current = null
  }, [moving])

  const switchMode = (next: boolean) => {
    pendingFocus.current = next ? "nudge-left" : "move"
    setMoving(next)
  }

  const actions: Action[] = moving
    ? [
        { id: "nudge-left", label: "Nudge left", icon: "arrow-back", onTap: () => onNudge(-nudgeStep, 0) },
        { id: "nudge-up", label: "Nudge up", icon: "arrow-up", onTap: () => onNudge(0, -nudgeStep) },
        { id: "nudge-down", label: "Nudge down", icon: "arrow-down", onTap: () => onNudge(0, nudgeStep) },
        { id: "nudge-right", label: "Nudge right", icon: "arrow-forward", onTap: () => onNudge(nudgeStep, 0) },
        { id: "done", label: "Done moving", icon: "check-circle", onTap: () => switchMode(false) },
      ]
    : [
        { id: "move", label: "Move frame", icon: "move-pin", onTap: () => switchMode(true) },
        {
          id: "duplicate",
          label: duplicate.label,
          icon: "duplicate",
          disabled: duplicate.disabled,
          onTap: duplicate.onDuplicate,
        },
        { id: "delete", label: "Delete image", icon: "trash-can", disabled: !hasImage, onTap: onDeleteImage },
        {
          id: "replace",
          label: hasImage ? "Replace image" : "Add image",
          icon: "camera-roll",
          onTap: onReplaceImage,
        },
        { id: "reset", label: "Reset frame", icon: "refresh", disabled: !canReset, onTap: onResetFrame },
      ]

  return (
    <div
      aria-label={`Frame ${slot + 1} actions`}
      className="frame-toolbar"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.stopPropagation()
        if (moving) switchMode(false)
        else onExit()
      }}
      ref={rootRef}
      role="toolbar"
    >
      <Box color="inverse" padding={2} rounding="pill">
        <Flex gap={2}>
          {actions.map((action) => (
            <ToolbarButton action={action} key={action.id} />
          ))}
        </Flex>
      </Box>
    </div>
  )
}
