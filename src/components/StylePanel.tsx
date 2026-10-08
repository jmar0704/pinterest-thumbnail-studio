import { Box, Button, Flex, Icon, Text } from "gestalt"
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

export default function StylePanel({
  enabled,
  slot,
  style,
  isFrameChanged,
  canResetAll,
  onChange,
  onResetFrame,
  onResetAll,
}: {
  enabled: boolean
  slot: number
  style: CardStyle
  /** The selected frame was moved or styled. */
  isFrameChanged: boolean
  /** Anything differs from the template's original design. */
  canResetAll: boolean
  onChange: (update: Partial<CardStyle>) => void
  onResetFrame: () => void
  onResetAll: () => void
}) {
  return (
    <Flex direction="column" gap={4}>
      <Flex alignItems="center" justifyContent="between">
        <Text size="100" weight="bold">
          STYLE
        </Text>
        {enabled ? (
          <Text color="subtle" size="100">
            Frame {slot + 1}
          </Text>
        ) : null}
      </Flex>

      {!enabled ? (
        <Box color="secondary" padding={3} rounding={3}>
          <Flex alignItems="center" gap={2}>
            <Icon accessibilityLabel="" color="subtle" icon="info-circle" size={iconSizes.sm} />
            <Text size="200">Pick a template to style frames.</Text>
          </Flex>
        </Box>
      ) : (
        <Flex gap={2} wrap>
          <Button
            disabled={!isFrameChanged}
            iconStart="move-pin"
            onClick={onResetFrame}
            size="sm"
            text="Reset frame"
          />
          <Button
            disabled={!canResetAll}
            iconStart="refresh"
            onClick={onResetAll}
            size="sm"
            text="Reset all"
          />
        </Flex>
      )}

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
}
