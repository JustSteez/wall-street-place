import { useCallback, useEffect, useState } from 'react'
import { type Address, getAddress } from 'viem'
import { CHAIN } from '../config/network'
import { ensureChain } from '../lib/client'
import {
  connectWallet,
  disconnectWallet,
  getActiveProvider,
  getActiveWallet,
  HAS_WALLETCONNECT,
  injectedWallets,
  onActiveChange,
  onWalletsDiscovered,
  restoreWallet,
  WALLETCONNECT_OPTION,
  type WalletOption,
} from '../lib/wallets'

export interface WalletState {
  account: Address | null
  chainId: number | null
  walletName: string | null
  options: WalletOption[]
  canConnect: boolean
  onRightChain: boolean
  connecting: boolean
  connect: (option?: WalletOption) => Promise<void>
  disconnect: () => Promise<void>
  switchChain: () => Promise<void>
}

function walletOptions(): WalletOption[] {
  return HAS_WALLETCONNECT ? [...injectedWallets(), WALLETCONNECT_OPTION] : injectedWallets()
}

export function useWallet(): WalletState {
  const [account, setAccount] = useState<Address | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [options, setOptions] = useState<WalletOption[]>(walletOptions)
  const [walletName, setWalletName] = useState<string | null>(null)
  const [provider, setProvider] = useState(getActiveProvider)

  useEffect(() => onWalletsDiscovered(() => setOptions(walletOptions())), [])

  useEffect(
    () =>
      onActiveChange(() => {
        setProvider(getActiveProvider())
        setWalletName(getActiveWallet()?.name ?? null)
      }),
    [],
  )

  // Restore the last-used wallet without popups (wait a tick for EIP-6963 announcements).
  useEffect(() => {
    const t = window.setTimeout(() => {
      restoreWallet().catch((error) => console.error('Wallet restore failed', error))
    }, 300)
    return () => window.clearTimeout(t)
  }, [])

  // Track the active provider's account and chain.
  useEffect(() => {
    if (!provider) {
      setAccount(null)
      setChainId(null)
      return
    }
    const onAccounts = (accounts: readonly string[]) => setAccount(accounts[0] ? getAddress(accounts[0]) : null)
    const onChain = (id: string | number) => setChainId(Number(id))
    provider.request({ method: 'eth_accounts' }).then(onAccounts).catch(() => setAccount(null))
    provider.request({ method: 'eth_chainId' }).then(onChain).catch(() => setChainId(null))
    provider.on('accountsChanged', onAccounts)
    provider.on('chainChanged', onChain)
    return () => {
      provider.removeListener('accountsChanged', onAccounts)
      provider.removeListener('chainChanged', onChain)
    }
  }, [provider])

  const connect = useCallback(async (option?: WalletOption) => {
    const choice = option ?? walletOptions()[0]
    if (!choice) return
    setConnecting(true)
    try {
      const accounts = await connectWallet(choice)
      setAccount(accounts[0] ? getAddress(accounts[0]) : null)
      const active = getActiveProvider()
      if (active && choice.kind === 'injected') await ensureChain(active)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectWallet()
    setAccount(null)
  }, [])

  const switchChain = useCallback(async () => {
    const active = getActiveProvider()
    if (active) await ensureChain(active)
  }, [])

  return {
    account,
    chainId,
    walletName,
    options,
    canConnect: options.length > 0,
    onRightChain: chainId === CHAIN.id,
    connecting,
    connect,
    disconnect,
    switchChain,
  }
}
