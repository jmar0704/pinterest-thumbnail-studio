import { Box, Button, Flex, Icon, Text } from "gestalt"
import StepControl from "@/components/StepControl"
import SwatchPicker from "@/components/SwatchPicker"
import {
  borderSteps,
  defaultCardStyle,
  isDefaultStyle,
  rotateSteps,
  shadowSteps,
  sizeSteps,
  tiltSteps,
  type CardStyle,
  type Step,
} from "@/data/styleOptions"
import { shadowColorOptions } from "@/theme/artworkPalette"
import { iconSizes, sizes } from "@/theme/sizes"

type StepKey = Exclude<keyof CardStyle, "shadowColor">

const controls: { key: StepKey; label: string; steps: Step<unknown>[] }[] = [
  { key: "size", label: "Size", steps: sizeSteps },
  { key: "rotate", label: "Rotate", steps: rotateSteps },
  { key: "tilt", label: "3D tilt", steps: tiltSteps },
  { key: "border", label: "Border", steps: borderSteps },
  { key: "shadow", label: "Shadow", steps: shadowSteps },
]

export default function StylePanel({
  enabled,
  slot,
  style,
  isMoved,
  onChange,
  onResetStyle,
  onResetPosition,
}: {
  enabled: boolean
  slot: number
  style: CardStyle
  isMoved: boolean
  onChange: (update: Partial<CardStyle>) => void
  onResetStyle: () => void
  onResetPosition: () => void
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
            disabled={!isMoved}
            iconStart="move-pin"
            onClick={onResetPosition}
            size="sm"
            text="Reset position"
          />
          <Button
            disabled={isDefaultStyle(style)}
            iconStart="refresh"
            onClick={onResetStyle}
            size="sm"
            text="Reset style"
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
            {style.shadow > 0 ? (
              <Flex direction="column" gap={2}>
                <Text size="200" weight="bold">
                  Shadow color
                </Text>
                <SwatchPicker
                  colors={shadowColorOptions}
                  label="shadow"
                  onChange={(shadowColor) => onChange({ shadowColor })}
                  size={sizes.swatchSmall}
                  value={style.shadowColor}
                />
              </Flex>
            ) : null}
          </Flex>
        </div>
      </Box>
    </Flex>
  )
}
