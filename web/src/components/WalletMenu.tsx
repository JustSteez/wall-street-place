import { useEffect, useRef, useState } from 'react'
import type { WalletState } from '../hooks/useWallet'
import { shortAddress } from '../lib/format'
import type { WalletOption } from '../lib/wallets'

/** Other parts of the page (e.g. the order desk) can open the wallet menu with this event. */
export const OPEN_WALLET_EVENT = 'wsp:open-wallet'

export function openWalletMenu(): void {
  window.dispatchEvent(new Event(OPEN_WALLET_EVENT))
}

function WalletIcon({ option }: { option: WalletOption }) {
  if (option.icon) return <img src={option.icon} alt="" width={28} height={28} />
  if (option.kind === 'walletconnect') {
    return (
      <svg viewBox="0 0 28 28" width={28} height={28} aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="#3B99FC" />
        <path
          d="M8.6 11.2c3-2.9 7.8-2.9 10.8 0l.4.3a.4.4 0 0 1 0 .5l-1.2 1.2a.2.2 0 0 1-.3 0l-.5-.5c-2.1-2-5.5-2-7.6 0l-.5.5a.2.2 0 0 1-.3 0l-1.2-1.2a.4.4 0 0 1 0-.5l.4-.3Zm13.4 2.5 1.1 1a.4.4 0 0 1 0 .6l-4.8 4.7a.4.4 0 0 1-.6 0l-3.4-3.3a.1.1 0 0 0-.2 0l-3.4 3.3a.4.4 0 0 1-.6 0L5.3 15.3a.4.4 0 0 1 0-.6l1-1a.4.4 0 0 1 .6 0l3.4 3.3a.1.1 0 0 0 .2 0l3.4-3.3a.4.4 0 0 1 .6 0l3.4 3.3a.1.1 0 0 0 .2 0l3.4-3.3a.4.4 0 0 1 .5 0Z"
          fill="#fff"
        />
      </svg>
    )
  }
  return <span className="wm-fallback" aria-hidden="true">👛</span>
}

export function WalletMenu({ wallet }: { wallet: WalletState }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_WALLET_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WALLET_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = async (option: WalletOption) => {
    setError(null)
    try {
      await wallet.connect(option)
      setOpen(false)
    } catch (e) {
      const code = (e as { code?: number }).code
      setError(code === 4001 ? 'You cancelled the request.' : 'Could not connect. Try again.')
      console.error('Wallet connect failed', e)
    }
  }

  let label = 'Connect wallet'
  let tone = 'pill-lime'
  if (wallet.account && !wallet.onRightChain && wallet.chainId !== null) {
    label = 'Switch network'
    tone = 'pill-red'
  } else if (wallet.account) {
    label = shortAddress(wallet.account)
    tone = 'pill-ghost'
  } else if (wallet.connecting) {
    label = 'Connecting…'
  }

  const onButton = () => {
    if (wallet.account && !wallet.onRightChain && wallet.chainId !== null) {
      wallet.switchChain().catch(console.error)
      return
    }
    setOpen((v) => !v)
  }

  return (
    <div className="wm" ref={ref}>
      <button className={`pill ${tone}`} onClick={onButton} aria-haspopup="menu" aria-expanded={open}>
        {label}
      </button>
      {open && (
        <div className="wm-panel" role="menu">
          {wallet.account ? (
            <>
              <p className="wm-title">Connected{wallet.walletName ? ` · ${wallet.walletName}` : ''}</p>
              <p className="wm-address">{wallet.account}</p>
              <button
                className="wm-item"
                role="menuitem"
                onClick={() => {
                  wallet.disconnect().catch(console.error)
                  setOpen(false)
                }}
              >
                <span className="wm-fallback" aria-hidden="true">⏏</span>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <p className="wm-title">Connect a wallet</p>
              {wallet.options.length === 0 && (
                <p className="wm-empty">
                  No wallet found.{' '}
                  <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get MetaMask</a> or open this
                  page in your wallet app's browser.
                </p>
              )}
              {wallet.options.map((option) => (
                <button
                  key={option.id}
                  className="wm-item"
                  role="menuitem"
                  disabled={wallet.connecting}
                  onClick={() => pick(option)}
                >
                  <WalletIcon option={option} />
                  <span>
                    {option.name}
                    {option.kind === 'walletconnect' && <small>Scan with a mobile wallet</small>}
                  </span>
                </button>
              ))}
              {error && <p className="wm-error">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
