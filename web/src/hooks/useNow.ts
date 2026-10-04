import { useEffect, useState } from 'react'

/** Current unix time in seconds, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now() / 1000)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() / 1000), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
