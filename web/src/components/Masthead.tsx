import { IS_TESTNET, NETWORK_NAME } from '../config/network'
import type { WalletState } from '../hooks/useWallet'
import { countdown, shortAddress } from '../lib/format'

interface Props {
  season: number | undefined
  secondsLeft: number | undefined
  wallet: WalletState
}

export function Masthead({ season, secondsLeft, wallet }: Props) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <header className="masthead">
      <div className="masthead-rail mono">
        <span>{today}</span>
        <span>Robinhood Chain {IS_TESTNET ? `· ${NETWORK_NAME}` : ''}</span>
        <span>{season ? `Season ${season}` : 'Loading season…'}</span>
      </div>
      <div className="masthead-main">
        <h1>
          Wall Street <em>Place</em>
        </h1>
        <div className="masthead-actions">
          {secondsLeft !== undefined && (
            <div className="bell" title="Time until the closing bell">
              <span className="bell-label mono">Closing bell</span>
              <span className="bell-time mono">{countdown(secondsLeft)}</span>
            </div>
          )}
          <WalletButton wallet={wallet} />
        </div>
      </div>
      <p className="deck">
        One canvas. Every stock a team. Paint only for the stocks you hold — your shares never leave your wallet.
      </p>
    </header>
  )
}

function WalletButton({ wallet }: { wallet: WalletState }) {
  if (!wallet.hasProvider) {
    return (
      <a className="btn btn-ink" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
        Install a wallet
      </a>
    )
  }
  if (!wallet.account) {
    return (
      <button className="btn btn-ink" onClick={() => wallet.connect().catch(console.error)} disabled={wallet.connecting}>
        {wallet.connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    )
  }
  if (!wallet.onRightChain) {
    return (
      <button className="btn btn-alert" onClick={() => wallet.switchChain().catch(console.error)}>
        Switch network
      </button>
    )
  }
  return <span className="btn btn-quiet mono">{shortAddress(wallet.account)}</span>
}
