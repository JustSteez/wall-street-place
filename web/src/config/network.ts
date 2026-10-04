import { type Address, type Chain, defineChain } from 'viem'
import { robinhood, robinhoodTestnet } from 'viem/chains'
import testnetDeployment from './deployments/testnet.json'
import mainnetDeployment from './deployments/mainnet.json'

export interface Deployment {
  chainId: number
  placeToken: Address
  canvas: Address
  snapshot: Address
  placeFaucet: Address
  teamTokens: Address[]
}

export type NetworkName = 'testnet' | 'mainnet' | 'local'

const ZERO = '0x0000000000000000000000000000000000000000'

const localChain = defineChain({
  ...robinhoodTestnet,
  name: 'Local (anvil)',
  rpcUrls: { default: { http: [import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8546'] } },
  contracts: {},
})

const NETWORKS: Record<NetworkName, { chain: Chain; deployment: Deployment | null; explorer: string }> = {
  testnet: {
    chain: robinhoodTestnet,
    deployment: testnetDeployment as Deployment | null,
    explorer: 'https://explorer.testnet.chain.robinhood.com',
  },
  mainnet: {
    chain: robinhood,
    deployment: mainnetDeployment as Deployment | null,
    explorer: 'https://robinhoodchain.blockscout.com',
  },
  local: {
    chain: localChain,
    deployment: testnetDeployment as Deployment | null,
    explorer: '',
  },
}

export const NETWORK_NAME = (import.meta.env.VITE_NETWORK ?? 'testnet') as NetworkName
export const NETWORK = NETWORKS[NETWORK_NAME] ?? NETWORKS.testnet
export const CHAIN = NETWORK.chain
export const DEPLOYMENT = NETWORK.deployment
export const IS_TESTNET = NETWORK_NAME !== 'mainnet'
export const HAS_FAUCET = Boolean(DEPLOYMENT && DEPLOYMENT.placeFaucet !== ZERO)

export function explorerTx(hash: string): string | null {
  return NETWORK.explorer ? `${NETWORK.explorer}/tx/${hash}` : null
}

export function explorerAddress(address: string): string | null {
  return NETWORK.explorer ? `${NETWORK.explorer}/address/${address}` : null
}
