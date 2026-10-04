import {
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  type EIP1193Provider,
  http,
  numberToHex,
  type WalletClient,
} from 'viem'
import { CHAIN } from '../config/network'

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(undefined, { batch: true, retryCount: 2 }),
  batch: { multicall: Boolean(CHAIN.contracts?.multicall3) },
})

declare global {
  interface Window {
    ethereum?: EIP1193Provider
  }
}

export function getInjected(): EIP1193Provider | null {
  return typeof window !== 'undefined' && window.ethereum ? window.ethereum : null
}

export function walletClientFor(provider: EIP1193Provider, account: Address): WalletClient {
  return createWalletClient({ account, chain: CHAIN, transport: custom(provider) })
}

/** Switch the wallet to our chain, adding it first if the wallet does not know it. */
export async function ensureChain(provider: EIP1193Provider): Promise<void> {
  const chainId = numberToHex(CHAIN.id)
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code !== 4902 && code !== -32603) throw error
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId,
          chainName: CHAIN.name,
          nativeCurrency: CHAIN.nativeCurrency,
          rpcUrls: [...CHAIN.rpcUrls.default.http],
          blockExplorerUrls: CHAIN.blockExplorers ? [CHAIN.blockExplorers.default.url] : undefined,
        },
      ],
    })
  }
}
