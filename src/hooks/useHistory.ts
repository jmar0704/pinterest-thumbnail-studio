import { useCallback, useRef, useState } from "react"

const limit = 100

type History<T> = { past: T[]; present: T; future: T[] }

/**
 * Undo/redo over immutable snapshots.
 * - `commit` records one undo step.
 * - `preview` updates the present without recording (e.g. every pointer move
 *   of a drag); call `commit` with the start snapshot's updater at the end,
 *   or `settle(start)` to record the whole gesture as one step.
 * `onDiscard` receives snapshots that fall out of history for good.
 */
export default function useHistory<T>(
  initial: T,
  onDiscard?: (dropped: T[], retained: T[]) => void,
) {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
  })
  const discardRef = useRef(onDiscard)
  discardRef.current = onDiscard

  const record = useCallback((current: History<T>, start: T, next: T): History<T> => {
    if (Object.is(start, next)) return { ...current, present: next }
    const past = [...current.past, start]
    const dropped = past.length > limit ? past.splice(0, past.length - limit) : []
    dropped.push(...current.future)
    const result = { past, present: next, future: [] }
    if (dropped.length) {
      queueMicrotask(() =>
        discardRef.current?.(dropped, [...result.past, result.present]),
      )
    }
    return result
  }, [])

  const commit = useCallback(
    (update: (present: T) => T) =>
      setHistory((current) => record(current, current.present, update(current.present))),
    [record],
  )

  const preview = useCallback(
    (update: (present: T) => T) =>
      setHistory((current) => ({ ...current, present: update(current.present) })),
    [],
  )

  const settle = useCallback(
    (start: T) => setHistory((current) => record(current, start, current.present)),
    [record],
  )

  const undo = useCallback(
    () =>
      setHistory((current) => {
        if (!current.past.length) return current
        const previous = current.past[current.past.length - 1]
        return {
          past: current.past.slice(0, -1),
          present: previous,
          future: [current.present, ...current.future],
        }
      }),
    [],
  )

  const redo = useCallback(
    () =>
      setHistory((current) => {
        if (!current.future.length) return current
        const [next, ...future] = current.future
        return { past: [...current.past, current.present], present: next, future }
      }),
    [],
  )

  return {
    state: history.present,
    commit,
    preview,
    settle,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
