import { Box, Button, Flex, IconButton, Text, Tooltip } from "gestalt"
import LayoutThumbnail from "@/components/LayoutThumbnail"
import StepControl from "@/components/StepControl"
import type { Template } from "@/data/templates"
import { defaultScatter, scatterSteps } from "@/data/styleOptions"
import { templateTransitionName } from "@/lib/viewTransition"

/**
 * An opened template: it takes the grid's place, like opening a folder, so its
 * settings are always in view no matter how many templates there are. The
 * panel shares its view-transition name with the template's tile, so the tile
 * grows into it.
 */
export default function TemplateSettings({
  template,
  onBack,
  scatter,
  onScatterChange,
  canShuffle,
  shuffleHint,
  onShuffle,
  anyMoved,
  onResetAllPositions,
  onCopyRecipe,
}: {
  template: Template
  onBack: () => void
  scatter: number
  onScatterChange: (index: number) => void
  canShuffle: boolean
  shuffleHint: string
  onShuffle: () => void
  anyMoved: boolean
  onResetAllPositions: () => void
  onCopyRecipe: () => void
}) {
  const shuffleButton = (
    <Button
      color="gray"
      disabled={!canShuffle}
      fullWidth
      iconStart="shuffles"
      onClick={onShuffle}
      text="Shuffle"
    />
  )
  return (
    <Box
      borderStyle="sm"
      dangerouslySetInlineStyle={{
        __style: { viewTransitionName: templateTransitionName(template.id) },
      }}
      padding={3}
      rounding={4}
    >
      <Flex direction="column" gap={4}>
        <Flex alignItems="center" gap={2}>
          <IconButton
            accessibilityLabel="Back to all templates"
            icon="arrow-back"
            onClick={onBack}
            size="sm"
            tooltip={{ text: "All templates" }}
          />
          <Flex.Item flex="grow">
            <Text size="200" weight="bold">
              {template.name}
            </Text>
          </Flex.Item>
          <Text color="subtle" size="100">
            {template.cards.length} frames
          </Text>
        </Flex>

        <Box color="secondary" overflow="hidden" padding={2} rounding={3}>
          <LayoutThumbnail selected={false} template={template} />
        </Box>

        <div className="template-settings-body">
          <Flex direction="column" gap={4}>
            <StepControl
              defaultValue={defaultScatter}
              label="Scatter"
              onChange={onScatterChange}
              steps={scatterSteps}
              value={scatter}
            />
            {canShuffle ? (
              shuffleButton
            ) : (
              <Tooltip text={shuffleHint}>
                <Box>{shuffleButton}</Box>
              </Tooltip>
            )}
            <Flex direction="column" gap={1}>
              <Button
                color="transparent"
                disabled={!anyMoved}
                fullWidth
                iconStart="move-pin"
                onClick={onResetAllPositions}
                size="sm"
                text="Reset all positions"
              />
              <Button
                color="transparent"
                fullWidth
                iconStart="copy-to-clipboard"
                onClick={onCopyRecipe}
                size="sm"
                text="Copy recipe"
              />
            </Flex>
          </Flex>
        </div>
      </Flex>
    </Box>
  )
}
