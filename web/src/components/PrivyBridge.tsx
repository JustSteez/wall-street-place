import { PrivyProvider, useLogin, useLogout, usePrivy, useWallets } from '@privy-io/react-auth'
import { Component, type ReactNode, useEffect, useRef } from 'react'
import type { EIP1193Provider } from 'viem'
import { CHAIN } from '../config/network'
import { PRIVY_APP_ID, registerPrivy, restorePrivy } from '../lib/wallets'

type Pending = {
  resolve: (wallet: { address: string; provider: EIP1193Provider }) => void
  reject: (error: unknown) => void
}

/** Hands Privy's embedded wallet to lib/wallets so the rest of the app treats it like any other wallet. */
function Bridge() {
  const { ready, authenticated } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { logout } = useLogout()
  const pending = useRef<Pending | null>(null)
  const { login } = useLogin({
    onError: (error) => {
      // Closing the modal maps to the wallet-rejection code the menu already shows as "You cancelled".
      const code = error === 'exited_auth_flow' ? 4001 : undefined
      pending.current?.reject(Object.assign(new Error(`Privy login failed: ${error}`), { code }))
      pending.current = null
    },
  })
  const embedded = wallets.find((w) => w.walletClientType === 'privy')

  // Put the embedded wallet on our chain and hand it to whoever is waiting (a login, or a reload restore).
  const handOver = useRef<() => void>(() => {})
  const signedIn = authenticated && walletsReady && Boolean(embedded)
  const signedInRef = useRef(signedIn)
  // Keep the latest wallet in reach of the controller registered below.
  useEffect(() => {
    signedInRef.current = signedIn
    handOver.current = () => {
      if (!embedded) return
      ;(async () => {
        await embedded.switchChain(CHAIN.id)
        const provider = (await embedded.getEthereumProvider()) as unknown as EIP1193Provider
        if (pending.current) {
          pending.current.resolve({ address: embedded.address, provider })
          pending.current = null
        } else {
          restorePrivy(provider)
        }
      })().catch((error) => {
        console.error('Privy wallet hand-over failed', error)
        pending.current?.reject(error)
        pending.current = null
      })
    }
  })

  useEffect(() => {
    if (!ready) return
    registerPrivy({
      login: () =>
        new Promise((resolve, reject) => {
          pending.current?.reject(new Error('Superseded by a new login'))
          pending.current = { resolve, reject }
          // Still signed in from earlier (e.g. they switched to another wallet and back): no modal needed.
          if (signedInRef.current) handOver.current()
          else login()
        }),
      logout,
    })
    return () => registerPrivy(null)
  }, [ready, login, logout])

  useEffect(() => {
    if (signedIn) handOver.current()
  }, [signedIn, embedded?.address])

  return null
}

/** If Privy fails (bad app ID, blocked domain, outage), email login fails cleanly and the rest of the page stays up. */
class Isolate extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Privy failed to load', error)
    const unavailable = () => Promise.reject(new Error('Email login is unavailable right now'))
    registerPrivy({ login: unavailable, logout: async () => {} })
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Lazy-loaded only when VITE_PRIVY_APP_ID is set. Renders no UI of its own besides Privy's modal. */
export default function PrivyBridge() {
  return (
    <Isolate>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ['email', 'google', 'twitter'],
          appearance: { theme: 'dark', accentColor: '#d4ff3a', landingHeader: 'Log in to paint' },
          embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' }, showWalletUIs: true },
          defaultChain: CHAIN,
          supportedChains: [CHAIN],
        }}
      >
        <Bridge />
      </PrivyProvider>
    </Isolate>
  )
}
