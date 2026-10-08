import { Accordion, Box, Flex, Icon, Text } from "gestalt"
import StepControl from "@/components/StepControl"
import {
  borderSteps,
  defaultCardStyle,
  rotateSteps,
  sizeSteps,
  tiltSteps,
  type CardStyle,
  type Step,
} from "@/data/styleOptions"
import { iconSizes } from "@/theme/sizes"

// Drop shadow lives with the Background colors (DropShadowSwitch).
type StepKey = Exclude<keyof CardStyle, "dropShadow">

const controls: { key: StepKey; label: string; steps: Step<unknown>[] }[] = [
  { key: "size", label: "Size", steps: sizeSteps },
  { key: "rotate", label: "Rotate", steps: rotateSteps },
  { key: "tilt", label: "3D tilt", steps: tiltSteps },
  { key: "border", label: "Border", steps: borderSteps },
]

/**
 * Per-frame style controls, tucked into a "Style" dropdown (Gestalt
 * Accordion.Expandable) so the frame grid above stays in view.
 */
export default function StylePanel({
  enabled,
  slot,
  style,
  expanded,
  onExpandedChange,
  onChange,
}: {
  enabled: boolean
  slot: number
  style: CardStyle
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onChange: (update: Partial<CardStyle>) => void
}) {
  const content = (
    <Flex direction="column" gap={4}>
      {!enabled ? (
        <Box color="secondary" padding={3} rounding={3}>
          <Flex alignItems="center" gap={2}>
            <Icon accessibilityLabel="" color="subtle" icon="info-circle" size={iconSizes.sm} />
            <Text size="200">Select a frame to style it.</Text>
          </Flex>
        </Box>
      ) : null}

      {/* Disabled: dimmed, inert, and skipped by assistive tech. */}
      <Box
        aria-hidden={!enabled}
        dangerouslySetInlineStyle={{ __style: { pointerEvents: enabled ? "auto" : "none" } }}
        opacity={enabled ? 1 : 0.5}
      >
        <div inert={!enabled}>
          <Flex direction="column" gap={5}>
            {controls.map((control) => (
              <StepControl
                defaultValue={defaultCardStyle[control.key]}
                key={control.key}
                label={control.label}
                onChange={(index) => onChange({ [control.key]: index })}
                steps={control.steps}
                value={style[control.key]}
              />
            ))}
          </Flex>
        </div>
      </Box>
    </Flex>
  )

  return (
    <Accordion.Expandable
      borderStyle="none"
      expandedIndex={expanded ? 0 : null}
      id="style-panel"
      items={[
        {
          title: enabled ? `Style · Frame ${slot + 1}` : "Style",
          children: content,
        },
      ]}
      onExpandedChange={(index) => onExpandedChange(index === 0)}
      size="sm"
    />
  )
}
