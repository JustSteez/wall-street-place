/** Tiny synthesized sound effects (no audio files). Muted state persists per browser. */

const STORAGE_KEY = 'wsp:muted'
let ctx: AudioContext | null = null
let muted = readMuted()
const listeners = new Set<(muted: boolean) => void>()

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // storage unavailable (private mode) — keep the in-memory value
  }
  listeners.forEach((fn) => fn(value))
}

export function onMutedChange(fn: (muted: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, duration: number, type: OscillatorType, gain: number, delay = 0) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const amp = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  amp.gain.setValueAtTime(gain, t)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(amp).connect(a.destination)
  osc.start(t)
  osc.stop(t + duration)
}

/** The closing bell: two bright partials with a long tail. */
export function bell(): void {
  tone(880, 1.4, 'sine', 0.18)
  tone(1320, 1.1, 'sine', 0.08)
  tone(2640, 0.5, 'sine', 0.03)
}

/** A satisfying pixel "pop" — pitch varies with the colour index. */
export function pop(color = 5): void {
  tone(420 + color * 38, 0.12, 'triangle', 0.16)
  tone(840 + color * 76, 0.08, 'sine', 0.06, 0.03)
}

/** Denied: low buzz for cooldowns and errors. */
export function buzz(): void {
  tone(110, 0.18, 'square', 0.06)
  tone(98, 0.18, 'square', 0.05, 0.09)
}

/** The bull snorts: a short filtered noise burst. */
export function snort(): void {
  const a = audio()
  if (!a) return
  const length = Math.floor(a.sampleRate * 0.35)
  const buffer = a.createBuffer(1, length, a.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  const src = a.createBufferSource()
  const filter = a.createBiquadFilter()
  const amp = a.createGain()
  src.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.value = 900
  amp.gain.value = 0.35
  src.connect(filter).connect(amp).connect(a.destination)
  src.start()
}
