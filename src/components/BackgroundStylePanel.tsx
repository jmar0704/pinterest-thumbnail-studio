import { Accordion, Flex } from "gestalt"
import StepControl from "@/components/StepControl"
import {
  defaultBackgroundStyle,
  patternSteps,
  ribSteps,
  ringCountSteps,
  ringGapSteps,
  waveSteps,
  type BackgroundStyle,
} from "@/data/backgroundOptions"

/**
 * Pattern behind the frames, in a "Background style" dropdown under Frame
 * style. Applies to the whole thumbnail, so it works with or without a
 * selected frame. Each pattern shows only its own settings.
 */
export default function BackgroundStylePanel({
  style,
  expanded,
  onExpandedChange,
  onChange,
}: {
  style: BackgroundStyle
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onChange: (update: Partial<BackgroundStyle>) => void
}) {
  const pattern = patternSteps[style.pattern]
  const content = (
    <Flex direction="column" gap={5}>
      <StepControl
        defaultValue={defaultBackgroundStyle.pattern}
        label="Pattern"
        onChange={(index) => onChange({ pattern: index })}
        steps={patternSteps}
        value={style.pattern}
      />
      {pattern.value === "rings" ? (
        <Flex direction="column" gap={5}>
          <StepControl
            defaultValue={defaultBackgroundStyle.rings}
            label="Rings"
            onChange={(index) => onChange({ rings: index })}
            steps={ringCountSteps}
            value={style.rings}
          />
          <StepControl
            defaultValue={defaultBackgroundStyle.gap}
            label="Gap"
            onChange={(index) => onChange({ gap: index })}
            steps={ringGapSteps}
            value={style.gap}
          />
        </Flex>
      ) : null}
      {pattern.value === "ripples" ? (
        <Flex direction="column" gap={5}>
          <StepControl
            defaultValue={defaultBackgroundStyle.ribs}
            label="Ribs"
            onChange={(index) => onChange({ ribs: index })}
            steps={ribSteps}
            value={style.ribs}
          />
          <StepControl
            defaultValue={defaultBackgroundStyle.wave}
            label="Wave"
            onChange={(index) => onChange({ wave: index })}
            steps={waveSteps}
            value={style.wave}
          />
        </Flex>
      ) : null}
    </Flex>
  )

  return (
    <Accordion.Expandable
      accessibilityCollapseLabel="Collapse background style"
      accessibilityExpandLabel="Expand background style"
      borderStyle="none"
      expandedIndex={expanded ? 0 : null}
      id="background-style-panel"
      items={[
        {
          title:
            pattern.value === "none" ? "Background style" : `Background style · ${pattern.label}`,
          children: content,
        },
      ]}
      onExpandedChange={(index) => onExpandedChange(index === 0)}
      size="sm"
    />
  )
}
