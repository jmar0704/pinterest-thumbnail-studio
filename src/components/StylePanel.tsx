import { Accordion, Box, Button, Flex, Icon, Text } from "gestalt"
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
 * Per-frame style controls, tucked into a "Frame style" dropdown (Gestalt
 * Accordion.Expandable) so the frame grid above stays in view.
 */
export default function StylePanel({
  enabled,
  slot,
  style,
  expanded,
  onExpandedChange,
  onChange,
  onApplyBorderToAll,
  borderMatchesAllFrames,
  sizeLocked,
}: {
  enabled: boolean
  slot: number
  style: CardStyle
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onChange: (update: Partial<CardStyle>) => void
  /** Copies the selected frame's border to every frame. */
  onApplyBorderToAll: () => void
  borderMatchesAllFrames: boolean
  /** The template fixes this frame's size (Showcase's back card). */
  sizeLocked: boolean
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
                disabledNote={
                  control.key === "size" && sizeLocked ? "Size is fixed by this template" : undefined
                }
                action={
                  control.key === "border" ? (
                    <Button
                      accessibilityLabel="Apply this border to all frames"
                      color="transparent"
                      disabled={borderMatchesAllFrames}
                      onClick={onApplyBorderToAll}
                      size="sm"
                      text="Apply to all"
                    />
                  ) : undefined
                }
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
      accessibilityCollapseLabel="Collapse frame style"
      accessibilityExpandLabel="Expand frame style"
      borderStyle="none"
      expandedIndex={expanded ? 0 : null}
      id="style-panel"
      items={[
        {
          title: enabled ? `Frame style · Frame ${slot + 1}` : "Frame style",
          children: content,
        },
      ]}
      onExpandedChange={(index) => onExpandedChange(index === 0)}
      size="sm"
    />
  )
}
