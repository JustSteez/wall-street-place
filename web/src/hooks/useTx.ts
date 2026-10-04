import { useCallback, useState } from 'react'
import type { Abi, Address } from 'viem'
import { explorerTx } from '../config/network'
import { ensureChain, getInjected, publicClient, walletClientFor } from '../lib/client'
import { friendlyError } from '../lib/errors'

export interface Toast {
  id: number
  kind: 'pending' | 'success' | 'error'
  message: string
  link?: string | null
}

export interface TxRequest {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
  label: string
}

let nextToastId = 1

/**
 * Sends transactions from the injected wallet: switches chain, simulates first (so reverts
 * surface as readable errors before the wallet pops up), then waits for the receipt.
 */
export function useTx(account: Address | null, tickerOf: (teamId: number) => string) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextToastId++
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }])
    if (toast.kind !== 'pending') {
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 7000)
    }
    return id
  }, [])

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  const send = useCallback(
    async (req: TxRequest): Promise<boolean> => {
      const provider = getInjected()
      if (!provider || !account) {
        push({ kind: 'error', message: 'Connect a wallet first.' })
        return false
      }
      setBusy(req.label)
      let pendingId: number | null = null
      try {
        await ensureChain(provider)
        const { request } = await publicClient.simulateContract({
          account,
          address: req.address,
          abi: req.abi,
          functionName: req.functionName,
          args: req.args ?? [],
        } as never)
        const hash = await walletClientFor(provider, account).writeContract(request as never)
        pendingId = push({ kind: 'pending', message: `${req.label}…`, link: explorerTx(hash) })
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        dismiss(pendingId)
        if (receipt.status !== 'success') throw new Error(`${req.label} failed on-chain.`)
        push({ kind: 'success', message: `${req.label} — done.`, link: explorerTx(hash) })
        return true
      } catch (error) {
        if (pendingId !== null) dismiss(pendingId)
        push({ kind: 'error', message: friendlyError(error, tickerOf) })
        return false
      } finally {
        setBusy(null)
      }
    },
    [account, push, dismiss, tickerOf],
  )

  return { send, busy, toasts, dismiss, notify: push }
}
