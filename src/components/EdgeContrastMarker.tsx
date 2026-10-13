import { Box, Icon, TapArea } from "gestalt"
import { iconSizes, sizes } from "@/theme/sizes"

/**
 * A small warning marker over an image whose edges blend into the
 * background. DOM, not canvas, so it never reaches the exported PNG. Not
 * color-only: it has a warning icon and an accessible name, and selecting it
 * selects the frame so the side panel shows the full notice and fixes.
 */
export default function EdgeContrastMarker({
  slot,
  left,
  top,
  onSelect,
}: {
  slot: number
  /** Position within the artboard frame, CSS px (marker center). */
  left: number
  top: number
  onSelect: () => void
}) {
  return (
    <div className="edge-contrast-marker" style={{ left, top }}>
      <TapArea
        accessibilityLabel={`Frame ${slot + 1}: image edges may blend into the background. Select to see fixes.`}
        onTap={onSelect}
        rounding="circle"
        tapStyle="compress"
      >
        <Box
          alignItems="center"
          color="default"
          display="flex"
          height={sizes.edgeMarker}
          justifyContent="center"
          rounding="circle"
          width={sizes.edgeMarker}
        >
          <Icon
            accessibilityLabel=""
            color="warning"
            icon="workflow-status-warning"
            size={iconSizes.sm}
          />
        </Box>
      </TapArea>
    </div>
  )
}
