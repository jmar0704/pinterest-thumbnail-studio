import { Box, Button, Flex, Heading, Layer, Modal, Text, TextField } from "gestalt"
import { sizes } from "@/theme/sizes"

const tags = ["News", "Insights"]

function MetaRow({ date }: { date: string }) {
  return (
    <Flex alignItems="center" gap={2} wrap>
      <Text color="subtle" size="200">
        {date}
      </Text>
      {tags.map((tag) => (
        <Box color="secondary" key={tag} paddingX={2} paddingY={1} rounding={2}>
          <Text color="subtle" size="200">
            {tag}
          </Text>
        </Box>
      ))}
    </Flex>
  )
}

/** A neutral stand-in article so the user's thumbnail is the only real content. */
function PlaceholderCard() {
  return (
    <Flex direction="column" gap={4}>
      <Box
        color="secondary"
        dangerouslySetInlineStyle={{ __style: { aspectRatio: "16 / 9" } }}
        rounding={4}
        width="100%"
      />
      <Flex direction="column" gap={2}>
        <Box color="secondary" height={20} rounding="pill" width="90%" />
        <Box color="secondary" height={20} rounding="pill" width="60%" />
      </Flex>
      <Box color="secondary" height={12} rounding="pill" width="40%" />
    </Flex>
  )
}

/**
 * Shows the current design as the lead image of a blog listing, next to two
 * neutral placeholder articles, with an editable headline.
 */
export default function BlogPreview({
  imageUrl,
  title,
  onTitleChange,
  onDismiss,
}: {
  imageUrl: string
  title: string
  onTitleChange: (title: string) => void
  onDismiss: () => void
}) {
  const date = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  return (
    <Layer>
      <Modal
        accessibilityModalLabel="Blog preview"
        footer={
          <Flex justifyContent="end">
            <Button color="gray" onClick={onDismiss} text="Back to editor" />
          </Flex>
        }
        onDismiss={onDismiss}
        size={sizes.previewModalWidth}
      >
        <Flex direction="column" gap={6}>
          <TextField
            id="preview-title"
            label="Post title"
            onChange={({ value }) => onTitleChange(value)}
            placeholder="Your blog post title"
            value={title}
          />
          <Box display="flex" marginEnd={-3} marginStart={-3} wrap>
            <Box column={4} paddingX={3}>
              <Flex direction="column" gap={4}>
                <img alt="Your thumbnail" className="preview-image" src={imageUrl} />
                <Heading accessibilityLevel={2} size="400">
                  {title || "Your blog post title"}
                </Heading>
                <MetaRow date={date} />
              </Flex>
            </Box>
            <Box column={4} paddingX={3}>
              <PlaceholderCard />
            </Box>
            <Box column={4} paddingX={3}>
              <PlaceholderCard />
            </Box>
          </Box>
        </Flex>
      </Modal>
    </Layer>
  )
}
