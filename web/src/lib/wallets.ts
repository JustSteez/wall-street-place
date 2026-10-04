import type { EIP1193Provider } from 'viem'
import { CHAIN } from '../config/network'

/**
 * Wallet connections: every installed browser wallet (EIP-6963 discovery, with a
 * window.ethereum fallback) plus WalletConnect for mobile wallets via QR code.
 * One provider is "active" at a time; the rest of the app talks to it through getActiveProvider().
 */

export interface WalletOption {
  id: string
  name: string
  icon?: string
  kind: 'injected' | 'walletconnect'
  provider?: EIP1193Provider
}

interface Eip6963Detail {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: EIP1193Provider
}

const LAST_WALLET_KEY = 'wsp:wallet'
// Reown (WalletConnect) project ID — a public identifier, safe to ship in client code.
export const WC_PROJECT_ID: string = import.meta.env.VITE_WC_PROJECT_ID ?? '6137e7f021220c6659af9433cd1c3497'
export const HAS_WALLETCONNECT = WC_PROJECT_ID.length > 0

let active: { option: WalletOption; provider: EIP1193Provider } | null = null
const activeListeners = new Set<() => void>()
const discovered = new Map<string, WalletOption>()
const discoveryListeners = new Set<() => void>()

// ---------------------------------------------------------------- discovery

function announce(event: Event) {
  const { info, provider } = (event as CustomEvent<Eip6963Detail>).detail
  if (discovered.has(info.rdns)) return
  discovered.set(info.rdns, { id: info.rdns, name: info.name, icon: info.icon, kind: 'injected', provider })
  discoveryListeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', announce)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

/** Installed browser wallets, falling back to a generic window.ethereum entry. */
export function injectedWallets(): WalletOption[] {
  const list = [...discovered.values()]
  if (list.length === 0 && typeof window !== 'undefined' && window.ethereum) {
    list.push({ id: 'injected', name: 'Browser wallet', kind: 'injected', provider: window.ethereum })
  }
  return list
}

export function onWalletsDiscovered(fn: () => void): () => void {
  discoveryListeners.add(fn)
  return () => discoveryListeners.delete(fn)
}

// ---------------------------------------------------------------- active provider

export function getActiveProvider(): EIP1193Provider | null {
  return active?.provider ?? null
}

export function getActiveWallet(): WalletOption | null {
  return active?.option ?? null
}

export function onActiveChange(fn: () => void): () => void {
  activeListeners.add(fn)
  return () => activeListeners.delete(fn)
}

function setActive(next: typeof active) {
  active = next
  try {
    if (next) localStorage.setItem(LAST_WALLET_KEY, next.option.id)
    else localStorage.removeItem(LAST_WALLET_KEY)
  } catch {
    // storage unavailable — reconnect-on-reload just won't happen
  }
  activeListeners.forEach((fn) => fn())
}

export function lastWalletId(): string | null {
  try {
    return localStorage.getItem(LAST_WALLET_KEY)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- walletconnect

type WcProvider = EIP1193Provider & {
  session?: unknown
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}
let wcProvider: Promise<WcProvider> | null = null

/** Lazy-load WalletConnect only when someone chooses it (keeps the first page load small). */
function loadWalletConnect(): Promise<WcProvider> {
  wcProvider ??= import('@walletconnect/ethereum-provider').then(
    ({ EthereumProvider }) =>
      EthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [CHAIN.id],
        rpcMap: { [CHAIN.id]: CHAIN.rpcUrls.default.http[0] },
        showQrModal: true,
        metadata: {
          name: 'Wall Street Place',
          description: 'A 10,000-pixel canvas on Robinhood Chain where every stock is a team.',
          url: window.location.origin,
          icons: [`${window.location.origin}${window.location.pathname}favicon.svg`],
        },
      }) as unknown as Promise<WcProvider>,
  )
  return wcProvider
}

export const WALLETCONNECT_OPTION: WalletOption = { id: 'walletconnect', name: 'WalletConnect', kind: 'walletconnect' }

// ---------------------------------------------------------------- connect / disconnect

/** Ask the wallet for accounts. Returns the connected address list. */
export async function connectWallet(option: WalletOption): Promise<readonly string[]> {
  if (option.kind === 'walletconnect') {
    const provider = await loadWalletConnect()
    if (!provider.session) await provider.connect()
    const accounts = await provider.request({ method: 'eth_accounts' })
    setActive({ option, provider })
    return accounts
  }
  const provider = option.provider!
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  setActive({ option, provider })
  return accounts
}

/** Silently restore the last wallet after a reload (no popups). */
export async function restoreWallet(): Promise<readonly string[]> {
  const id = lastWalletId()
  if (!id) return []
  if (id === 'walletconnect') {
    if (!HAS_WALLETCONNECT) return []
    const provider = await loadWalletConnect()
    if (!provider.session) return []
    setActive({ option: WALLETCONNECT_OPTION, provider })
    return provider.request({ method: 'eth_accounts' })
  }
  const option = injectedWallets().find((w) => w.id === id)
  if (!option?.provider) return []
  const accounts = await option.provider.request({ method: 'eth_accounts' })
  if (accounts.length) setActive({ option, provider: option.provider })
  return accounts
}

export async function disconnectWallet(): Promise<void> {
  if (active?.option.kind === 'walletconnect') {
    try {
      await (active.provider as WcProvider).disconnect()
    } catch (error) {
      console.error('WalletConnect disconnect failed', error)
    }
  }
  setActive(null)
}
