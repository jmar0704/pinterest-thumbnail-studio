import type { ReactNode } from "react"
import { Box, Flex, IconButton, SegmentedControl, Text } from "gestalt"
import type { Step } from "@/data/styleOptions"

/**
 * A labeled, stepped style control built on Gestalt's SegmentedControl, with
 * a reset when it isn't on its default step.
 *
 * Every control shares one look (see .step-control in index.css): equal-width
 * segments of the same height whose labels never break mid-value ("−10°"
 * can't split into "−1 / 0°"); with very large text, whole segments wrap to a
 * second row instead (WCAG 1.4.4, 1.4.12). Each step's description isn't
 * shown, but stays in the segment's accessible name.
 */
export default function StepControl<T>({
  label,
  steps,
  value,
  defaultValue,
  onChange,
  action,
  disabledNote,
}: {
  label: string
  steps: Step<T>[]
  value: number
  defaultValue: number
  onChange: (index: number) => void
  /** Extra control beside the heading, e.g. Border's "Apply to all". */
  action?: ReactNode
  /** When set, the control is greyed out and locked, with this explanation. */
  disabledNote?: string
}) {
  const disabled = disabledNote !== undefined
  const isDefault = disabled || value === defaultValue
  return (
    <Flex direction="column" gap={2}>
      <Flex alignItems="center" justifyContent="between">
        <Text size="300" weight="bold">
          {label}
        </Text>
        <Flex alignItems="center" gap={1}>
          {action}
          {/* Reserve the reset button's space so rows don't jump. */}
          <Box opacity={isDefault ? 0 : 1}>
            <IconButton
              accessibilityLabel={`Reset ${label.toLowerCase()}`}
              disabled={isDefault}
              icon="refresh"
              onClick={() => onChange(defaultValue)}
              size="xs"
              tooltip={
                isDefault ? undefined : { text: `Reset ${label.toLowerCase()}` }
              }
            />
          </Box>
        </Flex>
      </Flex>
      {disabled ? (
        <Text color="subtle" size="200">
          {disabledNote}
        </Text>
      ) : null}
      {/* Locked: greyed out, inert, and announced as unavailable. */}
      <div
        aria-disabled={disabled || undefined}
        className={disabled ? "step-control step-control-disabled" : "step-control"}
        inert={disabled}
      >
        <SegmentedControl
          items={steps.map((step) => (
            <span key={step.label}>
              {step.label}
              {step.description !== step.label ? (
                <span className="visually-hidden">, {step.description}</span>
              ) : null}
            </span>
          ))}
          onChange={({ activeIndex }) => {
            if (activeIndex !== value) onChange(activeIndex)
          }}
          responsive
          selectedItemIndex={value}
          size="sm"
        />
      </div>
    </Flex>
  )
}
