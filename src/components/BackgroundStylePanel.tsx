import { useState, type CSSProperties } from "react"
import { Accordion, Box, Flex, TapArea, Text } from "gestalt"
import PatternThumbnail from "@/components/PatternThumbnail"
import StepControl from "@/components/StepControl"
import {
  defaultBackgroundStyle,
  patternSteps,
  ribSteps,
  ringCountSteps,
  ringGapSteps,
  waveSteps,
  type BackgroundStyle,
  type PatternKind,
} from "@/data/backgroundOptions"
import type { ColorTemplate } from "@/theme/artworkPalette"

const folderId = "background-style-options"

/**
 * Pattern behind the frames, in a "Background style" dropdown above Frame
 * style. Patterns are picked from tiles that look and behave like template
 * tiles (each previews its pattern in the current colors). Rings and Fractal
 * have extra settings: picking one opens them in a panel that unfolds under
 * the tiles like a folder; pressing the selected tile again folds it away.
 * Applies to the whole thumbnail, so it works with or without a frame.
 */
export default function BackgroundStylePanel({
  style,
  colors,
  expanded,
  onExpandedChange,
  onChange,
}: {
  style: BackgroundStyle
  colors: ColorTemplate
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onChange: (update: Partial<BackgroundStyle>) => void
}) {
  const pattern = patternSteps[style.pattern]
  const [folderOpen, setFolderOpen] = useState(pattern.value !== "none")
  // Keeps the last pattern's settings drawn while the folder closes.
  const [shown, setShown] = useState<PatternKind>(
    pattern.value === "none" ? "rings" : pattern.value,
  )
  const open = folderOpen && pattern.value !== "none"

  const pick = (index: number) => {
    const kind = patternSteps[index].value
    if (index === style.pattern) {
      if (kind !== "none") setFolderOpen(!folderOpen)
      return
    }
    onChange({ pattern: index })
    if (kind !== "none") setShown(kind)
    setFolderOpen(kind !== "none")
  }

  const tiles = (
    <Box display="flex" marginEnd={-1} marginStart={-1}>
      {patternSteps.map((step, index) => {
        const selected = index === style.pattern
        const hasOptions = step.value !== "none"
        return (
          <Box column={4} key={step.value} padding={1}>
            <TapArea
              accessibilityControls={hasOptions ? folderId : undefined}
              accessibilityExpanded={hasOptions && selected ? open : undefined}
              accessibilityLabel={`${step.label} background${selected ? ", selected" : ""}`}
              onTap={() => pick(index)}
              role="button"
              rounding={3}
              tapStyle="compress"
            >
              {/* Same tile as the template picker (.template-tile in index.css). */}
              <div className={selected ? "template-tile template-tile-selected" : "template-tile"}>
                <Flex direction="column" gap={2}>
                  <Box color="default" padding={1} rounding={2}>
                    <Box overflow="hidden" rounding={1}>
                      <PatternThumbnail colors={colors} style={{ ...style, pattern: index }} />
                    </Box>
                  </Box>
                  <Text color={selected ? "inverse" : "default"} size="200" weight="bold">
                    {step.label}
                  </Text>
                </Flex>
              </div>
            </TapArea>
          </Box>
        )
      })}
    </Box>
  )

  const options =
    shown === "rings" ? (
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
    ) : (
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
    )

  // The folder's tab points at its tile's column.
  const column = patternSteps.findIndex((step) => step.value === shown)
  const content = (
    <Flex direction="column">
      {tiles}
      <div
        className="pattern-folder"
        data-open={open}
        id={folderId}
        inert={!open}
        style={{ "--folder-tab-x": `${((column + 0.5) / patternSteps.length) * 100}%` } as CSSProperties}
      >
        <div className="pattern-folder-clip">
          <div className="pattern-folder-panel">{options}</div>
        </div>
      </div>
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
            pattern.value === "none" ? "Background Style" : `Background Style · ${pattern.label}`,
          children: content,
        },
      ]}
      onExpandedChange={(index) => onExpandedChange(index === 0)}
      size="sm"
    />
  )
}
