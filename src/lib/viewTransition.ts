import { flushSync } from "react-dom"

/**
 * Run a state update inside a View Transition so matching
 * `view-transition-name`s morph between the old and new UI. Falls back to an
 * instant update when the browser lacks support or the user prefers reduced motion.
 */
export function withViewTransition(update: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!document.startViewTransition || reduceMotion) {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}

/** Shared name for a template's tile and its opened settings panel. */
export const templateTransitionName = (id: string) => `template-${id}`
