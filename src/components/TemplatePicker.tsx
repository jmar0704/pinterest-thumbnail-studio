import { Box, Flex, TapArea, Text } from "gestalt"
import LayoutThumbnail from "@/components/LayoutThumbnail"
import type { Template } from "@/data/templates"
import { templateTransitionName } from "@/lib/viewTransition"

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
              <Box
                borderStyle={selected ? "lg" : "sm"}
                color={selected ? "selected" : "secondary"}
                dangerouslySetInlineStyle={{
                  __style: { viewTransitionName: templateTransitionName(template.id) },
                }}
                padding={2}
                rounding={3}
              >
                <Flex direction="column" gap={2}>
                  <Box color="default" overflow="hidden" rounding={2}>
                    <LayoutThumbnail selected={selected} template={template} />
                  </Box>
                  <Flex justifyContent="between">
                    <Text color={selected ? "inverse" : "default"} size="200" weight="bold">
                      {template.name}
                    </Text>
                    <Text color={selected ? "inverse" : "subtle"} size="100">
                      {template.cards.length} frames
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            </TapArea>
          </Box>
        )
      })}
    </Box>
  )
}
