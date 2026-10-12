import { useState } from "react"
import { Box, Flex, Icon, TapArea, Tooltip } from "gestalt"
import { iconSizes, sizes } from "@/theme/sizes"

type Action = {
  label: string
  icon: "trash-can" | "camera-roll" | "refresh"
  disabled: boolean
  onTap: () => void
}

function ToolbarButton({ action }: { action: Action }) {
  // Hovered and pressed buttons get a light fill, so their icon turns dark.
  const [lit, setLit] = useState(false)
  return (
    <Tooltip idealDirection="up" text={action.label}>
      <div
        className={action.disabled ? "frame-action frame-action-disabled" : "frame-action"}
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
 * delete its image (the frame stays), replace or add its image, and reset the
 * frame's position and style.
 */
export default function FrameToolbar({
  slot,
  hasImage,
  canReset,
  onDeleteImage,
  onReplaceImage,
  onResetFrame,
}: {
  slot: number
  hasImage: boolean
  canReset: boolean
  onDeleteImage: () => void
  onReplaceImage: () => void
  onResetFrame: () => void
}) {
  const actions: Action[] = [
    { label: "Delete image", icon: "trash-can", disabled: !hasImage, onTap: onDeleteImage },
    {
      label: hasImage ? "Replace image" : "Add image",
      icon: "camera-roll",
      disabled: false,
      onTap: onReplaceImage,
    },
    { label: "Reset frame", icon: "refresh", disabled: !canReset, onTap: onResetFrame },
  ]
  return (
    <div aria-label={`Frame ${slot + 1} actions`} className="frame-toolbar" role="toolbar">
      <Box color="inverse" padding={2} rounding="pill">
        <Flex gap={2}>
          {actions.map((action) => (
            <ToolbarButton action={action} key={action.label} />
          ))}
        </Flex>
      </Box>
    </div>
  )
}
