import { useCallback, useEffect, useMemo, useState } from 'react'
import { maxUint256 } from 'viem'
import { ActivityFeed } from './components/ActivityFeed'
import { CanvasBoard } from './components/CanvasBoard'
import { Desk } from './components/Desk'
import { FaucetPanel } from './components/FaucetPanel'
import { Gallery } from './components/Gallery'
import { Masthead } from './components/Masthead'
import { Standings } from './components/Standings'
import { TickerTape } from './components/TickerTape'
import { Toasts } from './components/Toasts'
import { DEPLOYMENT, explorerAddress, HAS_FAUCET } from './config/network'
import { useActivity } from './hooks/useActivity'
import { type Team, useGame } from './hooks/useGame'
import { useNow } from './hooks/useNow'
import { usePlayer } from './hooks/usePlayer'
import { useTx } from './hooks/useTx'
import { useWallet } from './hooks/useWallet'
import { canvasAbi, mockStockAbi, placeFaucetAbi, placeTokenAbi, snapshotAbi } from './lib/abi'
import { indexOf } from './lib/canvas'
import { publicClient } from './lib/client'

export default function App() {
  const wallet = useWallet()
  const { state: game, error, refresh: refreshGame } = useGame()
  const { player, refresh: refreshPlayer } = usePlayer(wallet.account, game?.teams)
  const trades = useActivity(game?.season)
  const now = useNow()

  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [color, setColor] = useState(5)
  const [protectedUntil, setProtectedUntil] = useState(0)
  const [mintCost, setMintCost] = useState(0n)

  const tickerOf = useCallback(
    (id: number) => game?.teams.find((t) => t.id === id)?.ticker ?? `team ${id}`,
    [game?.teams],
  )
  const tx = useTx(wallet.account, tickerOf)
  const connected = Boolean(wallet.account && wallet.onRightChain)

  // Auto-pick the first team the player qualifies for.
  useEffect(() => {
    if (!player) return
    const owned = player.holdings.filter((h) => h.qualifies).map((h) => h.teamId)
    if (teamId === null || !owned.includes(teamId)) setTeamId(owned[0] ?? null)
  }, [player, teamId])

  useEffect(() => {
    if (!DEPLOYMENT) return
    publicClient
      .readContract({ address: DEPLOYMENT.snapshot, abi: snapshotAbi, functionName: 'mintCost' })
      .then(setMintCost)
      .catch((e) => console.error('Failed to read mint cost', e))
  }, [])

  // Protection status of the selected pixel.
  useEffect(() => {
    if (!DEPLOYMENT || !selected || !game) return
    publicClient
      .readContract({
        address: DEPLOYMENT.canvas,
        abi: canvasAbi,
        functionName: 'protectedUntil',
        args: [BigInt(game.season), BigInt(indexOf(selected.x, selected.y))],
      })
      .then((v) => setProtectedUntil(Number(v)))
      .catch(() => setProtectedUntil(0))
  }, [selected, game])

  const afterTx = useCallback(async () => {
    await Promise.all([refreshGame(), refreshPlayer()])
  }, [refreshGame, refreshPlayer])

  const ensureAllowance = useCallback(
    async (spender: `0x${string}`, needed: bigint, current: bigint) => {
      if (!DEPLOYMENT || needed === 0n || current >= needed) return true
      return tx.send({
        address: DEPLOYMENT.placeToken,
        abi: placeTokenAbi,
        functionName: 'approve',
        args: [spender, maxUint256],
        label: 'Approving $PLACE',
      })
    },
    [tx],
  )

  const onPlace = async (boosted: boolean) => {
    if (!DEPLOYMENT || !game || !selected || teamId === null || !player) return
    if (boosted && !(await ensureAllowance(DEPLOYMENT.canvas, game.skipCooldownCost, player.canvasAllowance))) return
    const ok = await tx.send({
      address: DEPLOYMENT.canvas,
      abi: canvasAbi,
      functionName: boosted ? 'placeBoosted' : 'place',
      args: boosted
        ? [BigInt(selected.x), BigInt(selected.y), color, teamId, game.skipCooldownCost]
        : [BigInt(selected.x), BigInt(selected.y), color, teamId],
      label: boosted ? 'Boosting pixel' : 'Placing pixel',
    })
    if (ok) await afterTx()
  }

  const onProtect = async () => {
    if (!DEPLOYMENT || !game || !selected || !player) return
    if (!(await ensureAllowance(DEPLOYMENT.canvas, game.protectCost, player.canvasAllowance))) return
    const ok = await tx.send({
      address: DEPLOYMENT.canvas,
      abi: canvasAbi,
      functionName: 'protect',
      args: [BigInt(selected.x), BigInt(selected.y), game.protectCost],
      label: 'Protecting pixel',
    })
    if (ok) await afterTx()
  }

  const onMint = async (season: number) => {
    if (!DEPLOYMENT || !player) return
    if (!(await ensureAllowance(DEPLOYMENT.snapshot, mintCost, player.snapshotAllowance))) return
    const ok = await tx.send({
      address: DEPLOYMENT.snapshot,
      abi: snapshotAbi,
      functionName: 'mint',
      args: [BigInt(season), mintCost],
      label: `Minting season ${season}`,
    })
    if (ok) await afterTx()
  }

  const onRoll = async () => {
    if (!DEPLOYMENT) return
    const ok = await tx.send({ address: DEPLOYMENT.canvas, abi: canvasAbi, functionName: 'rollSeason', label: 'Ringing the bell' })
    if (ok) await afterTx()
  }

  const onStock = async (team: Team) => {
    const ok = await tx.send({ address: team.token, abi: mockStockAbi, functionName: 'faucet', label: `Getting test ${team.ticker}` })
    if (ok) await afterTx()
  }

  const onDrip = async () => {
    if (!DEPLOYMENT) return
    const ok = await tx.send({ address: DEPLOYMENT.placeFaucet, abi: placeFaucetAbi, functionName: 'drip', label: 'Getting $PLACE' })
    if (ok) await afterTx()
  }

  const secondsLeft = game ? game.seasonEndsAt - now : undefined
  const seasonEnded = secondsLeft !== undefined && secondsLeft <= 0
  const teams = useMemo(() => game?.teams ?? [], [game?.teams])

  if (!DEPLOYMENT) {
    return (
      <main className="page">
        <Masthead season={undefined} secondsLeft={undefined} wallet={wallet} />
        <p className="panel">This network has no deployment yet.</p>
      </main>
    )
  }

  return (
    <>
      <main className="page">
        <Masthead season={game?.season} secondsLeft={secondsLeft} wallet={wallet} />
        {game && <TickerTape teams={teams} teamPixels={game.teamPixels} />}
        {error && <p className="banner">{error}</p>}

        {!game ? (
          <div className="loading mono">Opening the trading floor…</div>
        ) : (
          <div className="floor">
            <CanvasBoard
              canvas={game.canvas}
              teams={teams}
              selected={selected}
              previewColor={connected ? color : null}
              onSelect={(x, y) => setSelected({ x, y })}
            />
            <div className="side">
              <Desk
                connected={connected}
                teams={teams}
                player={player}
                canvas={game.canvas}
                selected={selected}
                protectedUntil={protectedUntil}
                teamId={teamId}
                color={color}
                now={now}
                skipCost={game.skipCooldownCost}
                protectCost={game.protectCost}
                busy={tx.busy}
                onTeam={setTeamId}
                onColor={setColor}
                onPlace={onPlace}
                onProtect={onProtect}
                onConnect={() => (wallet.account ? wallet.switchChain() : wallet.connect()).catch(console.error)}
              />
              {HAS_FAUCET && connected && (
                <FaucetPanel teams={teams} player={player} now={now} busy={tx.busy} onStock={onStock} onDrip={onDrip} />
              )}
            </div>
            <Standings teams={teams} teamPixels={game.teamPixels} />
            <ActivityFeed trades={trades} teams={teams} now={now} onJump={(x, y) => setSelected({ x, y })} />
            <Gallery
              season={game.season}
              seasonEnded={seasonEnded}
              teams={teams}
              mintCost={mintCost}
              busy={tx.busy}
              connected={connected}
              onMint={onMint}
              onRoll={onRoll}
            />
          </div>
        )}

        <footer className="colophon">
          <p>
            Your stock tokens are only read, never moved. $PLACE is only ever burned.{' '}
            {explorerAddress(DEPLOYMENT.canvas) && (
              <a href={explorerAddress(DEPLOYMENT.canvas)!} target="_blank" rel="noreferrer">Canvas contract</a>
            )}
            {' · '}
            <a href="https://github.com/JustSteez/wall-street-place" target="_blank" rel="noreferrer">Source</a>
          </p>
          <p className="muted small">An experiment on Robinhood Chain. Not affiliated with Robinhood. Not financial advice.</p>
        </footer>
      </main>
      <Toasts toasts={tx.toasts} onDismiss={tx.dismiss} />
    </>
  )
}
