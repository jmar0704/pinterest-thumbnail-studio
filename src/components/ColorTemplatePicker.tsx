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
      accessibilityLabel={`${colors.name} background with paired drop shadow${
        selected ? ", selected" : ""
      }`}
      onTap={onSelect}
      role="button"
      rounding="circle"
      tapStyle="compress"
    >
      {/* Ring: a gap in the page color, then a selected-color outline. Light
          swatches get a stronger ring so they stand out from the white panel
          (WCAG 1.4.11); see .swatch-ring-strong in index.css. */}
      <div
        className={colors.tone === "light" ? "swatch-ring-strong" : undefined}
      >
        <Box
          borderStyle={selected ? "lg" : "sm"}
          padding={selected ? 1 : 0}
          rounding="circle"
        >
          <Box
            dangerouslySetInlineStyle={{
              __style: { backgroundColor: colors.background },
            }}
            height={size}
            rounding="circle"
            width={size}
          />
        </Box>
      </div>
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
    {
      label: "Light",
      items: templates.filter((template) => template.tone === "light"),
    },
    {
      label: "Deep",
      items: templates.filter((template) => template.tone === "deep"),
    },
  ]
  return (
    <Flex direction="column" gap={3}>
      <Flex alignItems="baseline" gap={2}>
        <div aria-level={2} role="heading">
          <Text size="300" weight="bold">
            Background
          </Text>
        </div>
        {current ? (
          <div className="text-medium">
            <Text color="subtle" size="200">
              {current.name}
            </Text>
          </div>
        ) : null}
      </Flex>
      {/* Light backgrounds first, then deep ones, each group on its own lines. */}
      {rows.map((row) => (
        <Flex gap={2} key={row.label} wrap>
          {row.items.map((template) => (
            <Swatch
              colors={template}
              key={template.id}
              onSelect={() => onChange(template.id)}
              selected={template.id === value}
            />
          ))}
        </Flex>
      ))}
    </Flex>
  )
}
