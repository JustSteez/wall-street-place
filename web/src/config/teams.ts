import type { Team } from '../hooks/useGame'
import { teamColor } from '../lib/palette'

/**
 * The launch roster (mirrors contracts/config/teams.mainnet.json). Used to show teams and
 * trader cards before the contracts are deployed; live data replaces it after launch.
 */
const ROSTER: [string, `0x${string}`][] = [
  ['NVDA', '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC'],
  ['TSLA', '0x322F0929c4625eD5bAd873c95208D54E1c003b2d'],
  ['AAPL', '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9'],
  ['AMZN', '0x12f190a9F9d7D37a250758b26824B97CE941bF54'],
  ['MSFT', '0xe93237C50D904957Cf27E7B1133b510C669c2e74'],
  ['GOOGL', '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3'],
  ['META', '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35'],
  ['SPY', '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C'],
]

export const PRELAUNCH_TEAMS: Team[] = ROSTER.map(([ticker, token], i) => ({
  id: i + 1,
  token,
  ticker,
  minShares: 10n ** 16n,
  color: teamColor(ticker, i + 1),
}))
