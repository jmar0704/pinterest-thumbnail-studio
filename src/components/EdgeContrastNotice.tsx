import { BannerCallout } from "gestalt"
import { describeSides, type Side } from "@/lib/edgeContrast"

/**
 * Quiet, non-blocking note for the selected image when its outer edges are
 * close to the background behind them. Gestalt 177 has no `Callout`; its
 * BannerCallout is the equivalent. It renders as static content (no
 * aria-live), so it doesn't interrupt screen reader users.
 *
 * Fixes reuse existing controls only: a Thin frame border ("Add outline"),
 * and switching to another existing background color.
 */
export default function EdgeContrastNotice({
  weakSides,
  onAddOutline,
  backgroundFix,
  onDismiss,
}: {
  weakSides: Side[]
  /** Offered only when the frame has no border yet. */
  onAddOutline?: () => void
  /** e.g. { label: "Lighten background", onApply } — only when it would help. */
  backgroundFix?: { label: string; description: string; onApply: () => void }
  onDismiss: () => void
}) {
  const outline = onAddOutline
    ? {
        label: "Add outline",
        accessibilityLabel: "Add a thin outline to this frame",
        onClick: onAddOutline,
      }
    : undefined
  const background = backgroundFix
    ? {
        label: backgroundFix.label,
        accessibilityLabel: backgroundFix.description,
        onClick: backgroundFix.onApply,
      }
    : undefined

  return (
    <BannerCallout
      dismissButton={{ accessibilityLabel: "Dismiss edge contrast warning", onDismiss }}
      iconAccessibilityLabel="Warning"
      message={`This image's ${describeSides(weakSides)} ${weakSides.length === 1 ? "is" : "are"} close to your background color and may blend in.`}
      primaryAction={outline ?? background}
      secondaryAction={outline ? background : undefined}
      title="Image may blend into the background"
      type="warning"
    />
  )
}
