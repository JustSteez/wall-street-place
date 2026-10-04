import { useCallback, useEffect, useMemo, useState } from 'react'
import { maxUint256 } from 'viem'
import { ActivityFeed } from './components/ActivityFeed'
import { type Burst, CanvasBoard } from './components/CanvasBoard'
import { Credits } from './components/Credits'
import { FloorSoon } from './components/FloorSoon'
import { TraderCard } from './components/TraderCard'
import { Desk } from './components/Desk'
import { FaucetPanel } from './components/FaucetPanel'
import { Gallery } from './components/Gallery'
import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { Standings } from './components/Standings'
import { Story } from './components/Story'
import { TeamCards } from './components/TeamCards'
import { Toasts } from './components/Toasts'
import { DEPLOYMENT, explorerAddress, HAS_FAUCET, IS_PRELAUNCH } from './config/network'
import { PRELAUNCH_TEAMS } from './config/teams'
import { useActivity } from './hooks/useActivity'
import { type Team, useGame } from './hooks/useGame'
import { useNow } from './hooks/useNow'
import { usePlayer } from './hooks/usePlayer'
import { useTx } from './hooks/useTx'
import { useWallet } from './hooks/useWallet'
import { canvasAbi, mockStockAbi, placeFaucetAbi, placeTokenAbi, snapshotAbi } from './lib/abi'
import { indexOf } from './lib/canvas'
import { publicClient } from './lib/client'
import { bell, pop } from './lib/sound'

export default function App() {
  const wallet = useWallet()
  const { state: game, error, refresh: refreshGame } = useGame()
  const { player, refresh: refreshPlayer } = usePlayer(wallet.account, game?.teams)
  const trades = useActivity(game?.season)
  const wallNow = useNow()

  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [color, setColor] = useState(5)
  const [protectedUntil, setProtectedUntil] = useState(0)
  const [mintCost, setMintCost] = useState(0n)
  const [burst, setBurst] = useState<Burst | null>(null)

  // Block timestamps are only ~second-accurate, so ignore sub-2s skew.
  const offset = game && Math.abs(game.clockOffset) > 2 ? game.clockOffset : 0
  const now = wallNow + offset

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

  // Shared links like /#card: the section renders after load, so jump to it once mounted.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }), 150)
    return () => window.clearTimeout(t)
  }, [])

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
    if (!ok) return
    pop(color)
    setBurst({ id: Date.now(), x: selected.x, y: selected.y, color })
    await afterTx()
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
    const ok = await tx.send({
      address: DEPLOYMENT.canvas,
      abi: canvasAbi,
      functionName: 'rollSeason',
      label: 'Ringing the bell',
    })
    if (!ok) return
    bell()
    await afterTx()
  }

  const onStock = async (team: Team) => {
    const ok = await tx.send({
      address: team.token,
      abi: mockStockAbi,
      functionName: 'faucet',
      label: `Getting test ${team.ticker}`,
    })
    if (ok) await afterTx()
  }

  const onDrip = async () => {
    if (!DEPLOYMENT) return
    const ok = await tx.send({
      address: DEPLOYMENT.placeFaucet,
      abi: placeFaucetAbi,
      functionName: 'drip',
      label: 'Getting $PLACE',
    })
    if (ok) await afterTx()
  }

  const secondsLeft = game ? game.seasonEndsAt - now : undefined
  const seasonEnded = secondsLeft !== undefined && secondsLeft <= 0
  const teams = useMemo(() => game?.teams ?? (IS_PRELAUNCH ? PRELAUNCH_TEAMS : []), [game?.teams])
  const teamPixels = game?.teamPixels ?? []

  const pickTeam = (id: number) => {
    if (player?.holdings.find((h) => h.teamId === id)?.qualifies) setTeamId(id)
    document.getElementById('floor')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Nav wallet={wallet} />
      <Hero season={game?.season} secondsLeft={secondsLeft} teams={teams} teamPixels={teamPixels} />
      <Story secondsLeft={secondsLeft} />
      {teams.length > 0 && (
        <TeamCards teams={teams} teamPixels={teamPixels} player={player} selectedTeam={teamId} onPick={pickTeam} />
      )}
      <TraderCard teams={teams} player={player} defaultTeam={teamId} />

      <main className="floor-wrap" id="floor">
        <div className="floor-photo" style={{ backgroundImage: 'url(./img/nyse-wide.webp)' }} aria-hidden="true" />
        <div className="section-head section-head-light">
          <p className="eyebrow">{IS_PRELAUNCH ? 'Opening soon' : `Live · Season ${game?.season ?? '–'}`}</p>
          <h2>The trading floor</h2>
          <p className="section-sub">Click a pixel, pick your ink, place your order.</p>
        </div>
        {error && <p className="banner">{error}</p>}

        {IS_PRELAUNCH ? (
          <FloorSoon />
        ) : !game ? (
          <div className="loading">Opening the trading floor…</div>
        ) : (
          <div className="floor">
            <div className="billboard">
              <CanvasBoard
                canvas={game.canvas}
                teams={teams}
                selected={selected}
                previewColor={connected ? color : null}
                burst={burst}
                onSelect={(x, y) => setSelected({ x, y })}
              />
            </div>
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
      </main>

      <Credits canvasLink={DEPLOYMENT ? explorerAddress(DEPLOYMENT.canvas) : null} />
      <Toasts toasts={tx.toasts} onDismiss={tx.dismiss} />
    </>
  )
}
