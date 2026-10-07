import { Box, Flex, TapArea } from "gestalt"
import type { ArtworkColor } from "@/theme/artworkPalette"

export default function SwatchPicker({
  colors,
  value,
  onChange,
  label,
  size,
}: {
  colors: ArtworkColor[]
  value: string
  onChange: (value: string) => void
  /** Noun used in each swatch's accessible name, e.g. "background". */
  label: string
  size: number
}) {
  return (
    <Flex gap={2}>
      {colors.map((color) => {
        const selected = color.value === value
        return (
          <TapArea
            accessibilityLabel={`${color.name} ${label}${selected ? ", selected" : ""}`}
            key={color.value}
            onTap={() => onChange(color.value)}
            role="button"
            rounding="circle"
            tapStyle="compress"
          >
            {/* Ring: a gap in the page color, then a selected-color outline. */}
            <Box
              borderStyle={selected ? "lg" : "sm"}
              padding={selected ? 1 : 0}
              rounding="circle"
            >
              <Box
                dangerouslySetInlineStyle={{ __style: { backgroundColor: color.value } }}
                height={selected ? size - 8 : size}
                rounding="circle"
                width={selected ? size - 8 : size}
              />
            </Box>
          </TapArea>
        )
      })}
    </Flex>
  )
}
