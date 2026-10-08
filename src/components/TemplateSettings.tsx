import { Box, Button, Flex, Text, Tooltip } from "gestalt"
import StepControl from "@/components/StepControl"
import { defaultScatter, scatterSteps } from "@/data/styleOptions"

/**
 * Composition-wide settings for the selected template. Opens under the
 * template grid once a template is picked.
 */
export default function TemplateSettings({
  templateName,
  scatter,
  onScatterChange,
  canShuffle,
  shuffleHint,
  onShuffle,
  anyMoved,
  onResetAllPositions,
  onCopyRecipe,
}: {
  templateName: string
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
    <Box borderStyle="sm" padding={4} rounding={4}>
      <Flex direction="column" gap={4}>
        <Text size="200" weight="bold">
          {templateName} settings
        </Text>
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
    </Box>
  )
}
