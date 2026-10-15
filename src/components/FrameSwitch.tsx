import { useRef, useState } from "react"
import { Box, Flex, Icon, Label, Popover, Switch, Text } from "gestalt"
import { iconSizes } from "@/theme/sizes"

/**
 * A per-frame preset switch (Drop shadow, Border) that lives with the
 * Background colors, because both take their color from them. With no frame
 * selected the switch is inactive; pressing it explains why in a popover
 * above it.
 */
export default function FrameSwitch({
  id,
  label,
  hasFrame,
  switched,
  onChange,
  onAnnounce,
}: {
  id: string
  label: string
  hasFrame: boolean
  switched: boolean
  onChange: (switched: boolean) => void
  /** Sends the hint to the page's status live region for screen readers. */
  onAnnounce: (message: string) => void
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(false)
  const hint = `Select a frame to activate ${label.toLowerCase()}`

  return (
    <Flex direction="column" gap={2}>
      <Label htmlFor={id}>
        <Text size="300" weight="bold">
          {label}
        </Text>
      </Label>
      <div
        onClickCapture={(event) => {
          if (hasFrame) return
          event.preventDefault()
          event.stopPropagation()
          setShowHint(true)
          onAnnounce(hint)
        }}
        ref={anchorRef}
      >
        <Switch
          id={id}
          onChange={({ value }) => {
            if (hasFrame) onChange(value)
          }}
          switched={hasFrame && switched}
        />
      </div>

      {showHint && !hasFrame ? (
        <Popover
          accessibilityLabel={`${label} needs a frame`}
          anchor={anchorRef.current}
          idealDirection="up"
          onDismiss={() => {
            setShowHint(false)
            // Keep keyboard users where they were.
            document.getElementById(id)?.focus()
          }}
          role="tooltip"
          shouldFocus={false}
          size="flexible"
        >
          <Box padding={4}>
            <Flex alignItems="center" gap={3}>
              <Icon accessibilityLabel="Info" color="info" icon="info-circle" size={iconSizes.md} />
              <Text size="200">{hint}</Text>
            </Flex>
          </Box>
        </Popover>
      ) : null}
    </Flex>
  )
}
