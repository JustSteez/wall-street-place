import { useEffect, useState } from 'react'
import { isMuted, onMutedChange, setMuted } from '../lib/sound'

export function useMuted(): [boolean, (value: boolean) => void] {
  const [muted, setState] = useState(isMuted)
  useEffect(() => onMutedChange(setState), [])
  return [muted, setMuted]
}
