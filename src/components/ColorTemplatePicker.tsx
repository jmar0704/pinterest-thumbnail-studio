import { Box, Flex, TapArea, Text } from "gestalt"
import type { ColorTemplate } from "@/theme/artworkPalette"
import { sizes } from "@/theme/sizes"

function Swatch({
  colors,
  selected,
  onSelect,
}: {
  colors: ColorTemplate
  selected: boolean
  onSelect: () => void
}) {
  const size = selected ? sizes.swatchLarge - 8 : sizes.swatchLarge
  return (
    <TapArea
      accessibilityLabel={`${colors.name} background with paired drop shadow${selected ? ", selected" : ""}`}
      onTap={onSelect}
      role="button"
      rounding="circle"
      tapStyle="compress"
    >
      {/* Ring: a gap in the page color, then a selected-color outline. */}
      <Box borderStyle={selected ? "lg" : "sm"} padding={selected ? 1 : 0} rounding="circle">
        <Box
          alignItems="center"
          dangerouslySetInlineStyle={{ __style: { backgroundColor: colors.background } }}
          display="flex"
          height={size}
          justifyContent="center"
          rounding="circle"
          width={size}
        >
          {/* The paired drop-shadow color. */}
          <Box
            dangerouslySetInlineStyle={{ __style: { backgroundColor: colors.shadow } }}
            height={sizes.swatchDot}
            rounding="circle"
            width={sizes.swatchDot}
          />
        </Box>
      </Box>
    </TapArea>
  )
}

/**
 * Background + drop shadow, chosen together. Light backgrounds pair with a
 * deep glow from the same hue; deep backgrounds pair with a light glow.
 */
export default function ColorTemplatePicker({
  templates,
  value,
  onChange,
}: {
  templates: ColorTemplate[]
  value: string
  onChange: (id: string) => void
}) {
  const current = templates.find((template) => template.id === value)
  const rows = [
    { label: "Light", items: templates.filter((template) => template.tone === "light") },
    { label: "Deep", items: templates.filter((template) => template.tone === "deep") },
  ]
  return (
    <Flex direction="column" gap={3}>
      <Flex alignItems="baseline" gap={2}>
        <Text size="200" weight="bold">
          Background
        </Text>
        {current ? (
          <Text color="subtle" size="100">
            {current.name}
          </Text>
        ) : null}
      </Flex>
      {rows.map((row) => (
        <Flex alignItems="center" gap={3} key={row.label}>
          <Box width={sizes.colorRowLabel}>
            <Text color="subtle" size="100">
              {row.label}
            </Text>
          </Box>
          <Flex gap={2} wrap>
            {row.items.map((template) => (
              <Swatch
                colors={template}
                key={template.id}
                onSelect={() => onChange(template.id)}
                selected={template.id === value}
              />
            ))}
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}
