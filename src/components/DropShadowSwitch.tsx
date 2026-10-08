import { Box, Flex, Label, Switch, Text } from "gestalt"

/**
 * Turns the color template's paired glow on or off for the selected frame.
 * Lives with the Background colors because the glow color comes from them.
 */
export default function DropShadowSwitch({
  enabled,
  slot,
  switched,
  onChange,
}: {
  enabled: boolean
  slot: number
  switched: boolean
  onChange: (switched: boolean) => void
}) {
  return (
    <Flex direction="column" gap={2}>
      <Text size="200" weight="bold">
        Drop shadow
      </Text>
      <Flex alignItems="center" gap={3}>
        <Switch
          disabled={!enabled}
          id="drop-shadow-switch"
          onChange={({ value }) => onChange(value)}
          switched={enabled && switched}
        />
        <Box>
          <Label htmlFor="drop-shadow-switch">
            <Text color={enabled ? "default" : "subtle"} size="200">
              {enabled ? `Frame ${slot + 1}` : "Pick a template to add shadows"}
            </Text>
          </Label>
        </Box>
      </Flex>
    </Flex>
  )
}
