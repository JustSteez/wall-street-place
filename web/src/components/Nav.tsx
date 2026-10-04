import { IS_PRELAUNCH, IS_TESTNET, NETWORK_NAME } from '../config/network'
import { useScrollY } from '../hooks/useInView'
import { useMuted } from '../hooks/useSound'
import type { WalletState } from '../hooks/useWallet'
import { WalletMenu } from './WalletMenu'

export function Nav({ wallet }: { wallet: WalletState }) {
  const scrolled = useScrollY() > 40
  const [muted, setMuted] = useMuted()

  return (
    <nav className={`nav ${scrolled ? 'nav-solid' : ''}`} aria-label="Main">
      <a href="#top" className="nav-logo">
        <span className="nav-mark" aria-hidden="true">
          <i style={{ background: '#3DDC84' }} />
          <i style={{ background: '#FF3B30' }} />
          <i style={{ background: '#FFD23F' }} />
          <i style={{ background: '#5B2EFF' }} />
        </span>
        <span>Wall Street Place</span>
        {IS_TESTNET && <span className="nav-net">{NETWORK_NAME}</span>}
      </a>
      <div className="nav-links">
        <a href="#how">How it works</a>
        <a href="#teams">Teams</a>
        <a href="#card">Trader card</a>
        <a href="#floor">Trading floor</a>
      </div>
      <div className="nav-actions">
        <button
          className="icon-btn"
          onClick={() => setMuted(!muted)}
          aria-pressed={!muted}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          title={muted ? 'Sound off' : 'Sound on'}
        >
          {muted ? '🔇' : '🔔'}
        </button>
        {IS_PRELAUNCH && (
          <a className="pill pill-ghost nav-card-link" href="#card">
            Get your card
          </a>
        )}
        <WalletMenu wallet={wallet} />
      </div>
    </nav>
  )
}
