import { Box, Flex, Icon, TapArea, Text } from "gestalt"
import { iconSizes, sizes } from "@/theme/sizes"

/**
 * One chip per card in the current layout. The count follows the template
 * (3 for Arc, 5 for Spread, 6 for Grid). Each chip shows that card's image.
 */
export default function FrameChips({
  count,
  selected,
  imageForSlot,
  warningSlots,
  onSelect,
}: {
  count: number
  selected: number
  imageForSlot: (slot: number) => string | undefined
  warningSlots: Set<number>
  onSelect: (slot: number) => void
}) {
  return (
    <Flex gap={2} wrap>
      {Array.from({ length: count }, (_, slot) => {
        const src = imageForSlot(slot)
        const isSelected = slot === selected
        const hasWarning = warningSlots.has(slot)
        return (
          <TapArea
            accessibilityLabel={`Frame ${slot + 1}${isSelected ? ", selected" : ""}${hasWarning ? ", crosses the margin" : ""}`}
            key={slot}
            onTap={() => onSelect(slot)}
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
                overflow="hidden"
                rounding={3}
                width={sizes.frameChip}
              >
                {src ? (
                  <img alt="" className="image-chip" src={src} />
                ) : (
                  <Icon
                    accessibilityLabel=""
                    color="subtle"
                    icon="image-portrait"
                    size={iconSizes.md}
                  />
                )}
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
        )
      })}
    </Flex>
  )
}
