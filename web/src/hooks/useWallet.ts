import { useCallback, useEffect, useState } from 'react'
import { type Address, getAddress } from 'viem'
import { CHAIN } from '../config/network'
import { ensureChain, getInjected } from '../lib/client'

export interface WalletState {
  account: Address | null
  chainId: number | null
  hasProvider: boolean
  onRightChain: boolean
  connecting: boolean
  connect: () => Promise<void>
  switchChain: () => Promise<void>
}

export function useWallet(): WalletState {
  const provider = getInjected()
  const [account, setAccount] = useState<Address | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!provider) return
    const onAccounts = (accounts: readonly string[]) => setAccount(accounts[0] ? getAddress(accounts[0]) : null)
    const onChain = (id: string) => setChainId(Number(id))

    provider.request({ method: 'eth_accounts' }).then(onAccounts).catch(() => setAccount(null))
    provider.request({ method: 'eth_chainId' }).then(onChain).catch(() => setChainId(null))
    provider.on('accountsChanged', onAccounts)
    provider.on('chainChanged', onChain)
    return () => {
      provider.removeListener('accountsChanged', onAccounts)
      provider.removeListener('chainChanged', onChain)
    }
  }, [provider])

  const connect = useCallback(async () => {
    if (!provider) return
    setConnecting(true)
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0] ? getAddress(accounts[0]) : null)
      await ensureChain(provider)
    } finally {
      setConnecting(false)
    }
  }, [provider])

  const switchChain = useCallback(async () => {
    if (provider) await ensureChain(provider)
  }, [provider])

  return {
    account,
    chainId,
    hasProvider: Boolean(provider),
    onRightChain: chainId === CHAIN.id,
    connecting,
    connect,
    switchChain,
  }
}
