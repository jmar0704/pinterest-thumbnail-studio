import { Box, Flex, TapArea, Text } from "gestalt"
import LayoutThumbnail from "@/components/LayoutThumbnail"
import type { Template } from "@/data/templates"

export default function TemplatePicker({
  templates,
  selectedId,
  onSelect,
}: {
  templates: Template[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <Box display="flex" marginEnd={-1} marginStart={-1} wrap>
      {templates.map((template) => {
        const selected = template.id === selectedId
        return (
          <Box column={6} key={template.id} padding={1}>
            <TapArea
              accessibilityLabel={`${template.name} template, ${template.cards.length} frames${selected ? ", selected" : ""}`}
              onTap={() => onSelect(template.id)}
              role="button"
              rounding={3}
              tapStyle="compress"
            >
              {/* Tile fill, hover and selected states live in index.css (.template-tile). */}
              <div className={selected ? "template-tile template-tile-selected" : "template-tile"}>
                <Flex direction="column" gap={2}>
                  {/* Inset so the white canvas reads even when cards bleed (Grid). */}
                  <Box color="default" padding={1} rounding={2}>
                    <Box overflow="hidden" rounding={1}>
                      <LayoutThumbnail selected={selected} template={template} />
                    </Box>
                  </Box>
                  {/* Name above count, so long names never collide with it. */}
                  <Flex direction="column">
                    <Text color={selected ? "inverse" : "default"} size="200" weight="bold">
                      {template.name}
                    </Text>
                    {/* Not "subtle": text-subtle on the gray tile is only 3.74:1 (WCAG 1.4.3). */}
                    <Text color={selected ? "inverse" : "default"} size="200">
                      {template.cards.length} frames
                    </Text>
                  </Flex>
                </Flex>
              </div>
            </TapArea>
          </Box>
        )
      })}
    </Box>
  )
}
