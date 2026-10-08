import { useRef, useState } from "react"
import { Box, Flex, Icon, Label, Popover, Switch, Text } from "gestalt"
import { iconSizes } from "@/theme/sizes"

/**
 * Turns the color template's paired glow on or off for the selected frame.
 * Lives with the Background colors because the glow color comes from them.
 * With no frame selected the switch is inactive; pressing it explains why in
 * a popover above it.
 */
export default function DropShadowSwitch({
  slot,
  switched,
  onChange,
}: {
  slot: number | null
  switched: boolean
  onChange: (switched: boolean) => void
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(false)
  const hasFrame = slot !== null

  return (
    <Flex direction="column" gap={2}>
      <Text size="200" weight="bold">
        Drop shadow
      </Text>
      <Flex alignItems="center" gap={3}>
        <div
          onClickCapture={(event) => {
            if (hasFrame) return
            event.preventDefault()
            event.stopPropagation()
            setShowHint(true)
          }}
          ref={anchorRef}
        >
          <Switch
            id="drop-shadow-switch"
            onChange={({ value }) => {
              if (hasFrame) onChange(value)
            }}
            switched={hasFrame && switched}
          />
        </div>
        <Box>
          <Label htmlFor="drop-shadow-switch">
            <Text color={hasFrame ? "default" : "subtle"} size="200">
              {hasFrame ? `Frame ${slot + 1}` : "No frame selected"}
            </Text>
          </Label>
        </Box>
      </Flex>

      {showHint && !hasFrame ? (
        <Popover
          accessibilityLabel="Drop shadow needs a frame"
          anchor={anchorRef.current}
          idealDirection="up"
          onDismiss={() => setShowHint(false)}
          role="dialog"
          shouldFocus={false}
          size="flexible"
        >
          <Box padding={4}>
            <Flex alignItems="center" gap={3}>
              <Icon
                accessibilityLabel="Info"
                color="info"
                icon="info-circle"
                size={iconSizes.md}
              />
              <Text size="200">Select a frame to activate drop shadow</Text>
            </Flex>
          </Box>
        </Popover>
      ) : null}
    </Flex>
  )
}
