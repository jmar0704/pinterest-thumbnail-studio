import { flushSync } from "react-dom"

/**
 * Run a state update inside a View Transition so matching
 * `view-transition-name`s morph between the old and new UI. Falls back to an
 * instant update when the browser lacks support, the page is hidden, or the
 * user prefers reduced motion. The update always runs exactly once, even if
 * the browser skips or aborts the transition.
 */
export function withViewTransition(update: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (
    !document.startViewTransition ||
    reduceMotion ||
    document.visibilityState !== "visible"
  ) {
    update()
    return
  }
  let ran = false
  const run = () => {
    if (ran) return
    ran = true
    flushSync(update)
  }
  try {
    const transition = document.startViewTransition(run)
    // A skipped transition rejects `ready`; make sure the update still lands.
    transition.ready.catch(run)
    transition.finished.catch(run)
  } catch {
    run()
  }
}

/** Shared name for a template's tile and its opened settings panel. */
export const templateTransitionName = (id: string) => `template-${id}`
