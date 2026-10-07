import { Box, Flex, IconButton, SegmentedControl, Text } from "gestalt"
import type { Step } from "@/data/styleOptions"

/**
 * A labeled, stepped style control built on Gestalt's SegmentedControl.
 * Shows the current step's meaning and a reset when it isn't the default.
 */
export default function StepControl<T>({
  label,
  steps,
  value,
  defaultValue,
  onChange,
}: {
  label: string
  steps: Step<T>[]
  value: number
  defaultValue: number
  onChange: (index: number) => void
}) {
  const isDefault = value === defaultValue
  return (
    <Flex direction="column" gap={2}>
      <Flex alignItems="center" justifyContent="between">
        <Flex alignItems="baseline" gap={2}>
          <Text size="200" weight="bold">
            {label}
          </Text>
          <Text color="subtle" size="100">
            {steps[value].description}
          </Text>
        </Flex>
        {/* Reserve the reset button's space so rows don't jump. */}
        <Box opacity={isDefault ? 0 : 1}>
          <IconButton
            accessibilityLabel={`Reset ${label.toLowerCase()}`}
            disabled={isDefault}
            icon="refresh"
            onClick={() => onChange(defaultValue)}
            size="xs"
            tooltip={isDefault ? undefined : { text: `Reset ${label.toLowerCase()}` }}
          />
        </Box>
      </Flex>
      <SegmentedControl
        items={steps.map((step) => step.label)}
        onChange={({ activeIndex }) => {
          if (activeIndex !== value) onChange(activeIndex)
        }}
        selectedItemIndex={value}
        size="sm"
      />
    </Flex>
  )
}
