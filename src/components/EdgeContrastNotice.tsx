import { Box, Button, Flex, Icon, IconButton, Text } from "gestalt"
import { describeSides, type Side } from "@/lib/edgeContrast"
import { iconSizes } from "@/theme/sizes"

/**
 * Quiet, non-blocking note for the selected image when its outer edges are
 * close to the background behind them. Built from Gestalt primitives (not
 * BannerCallout) so the warning icon sits beside the title. Static content:
 * no aria-live, so it never interrupts screen reader users.
 *
 * Always two fixes, both reusing existing controls, as full-width medium
 * buttons that match the Export button's size, padding and rounding:
 * 1. Lighten or Darken background (away from the image's edge color)
 * 2. Add outline (a Thin border on every frame, for consistency)
 */
export default function EdgeContrastNotice({
  weakSides,
  backgroundFix,
  onAddOutline,
  onDismiss,
}: {
  weakSides: Side[]
  backgroundFix: { label: string; description: string; disabled: boolean; onApply: () => void }
  onAddOutline: () => void
  onDismiss: () => void
}) {
  return (
    <Box color="warningWeak" padding={4} rounding={4}>
      <Flex direction="column" gap={3}>
        <Flex alignItems="start" gap={2}>
          <Icon
            accessibilityLabel="Warning"
            color="warning"
            icon="workflow-status-warning"
            size={iconSizes.md}
          />
          <Flex.Item flex="grow">
            <div aria-level={3} role="heading">
              <Text size="200" weight="bold">
                Image may blend into the background
              </Text>
            </div>
          </Flex.Item>
          <IconButton
            accessibilityLabel="Dismiss edge contrast warning"
            icon="cancel"
            onClick={onDismiss}
            size="xs"
          />
        </Flex>
        <Text size="200">
          {`This image's ${describeSides(weakSides)} ${weakSides.length === 1 ? "is" : "are"} close to your background color and may blend in.`}
        </Text>
        <Flex direction="column" gap={2}>
          <Button
            accessibilityLabel={backgroundFix.description}
            color="white"
            disabled={backgroundFix.disabled}
            fullWidth
            onClick={backgroundFix.onApply}
            size="md"
            text={backgroundFix.label}
          />
          <Button
            accessibilityLabel="Add a thin outline to every frame"
            color="white"
            fullWidth
            onClick={onAddOutline}
            size="md"
            text="Add outline"
          />
        </Flex>
      </Flex>
    </Box>
  )
}
