import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'
import { countdown } from './format'

/** Turn a viem/contract error into one short sentence a player can act on. */
export function friendlyError(error: unknown, tickerOf: (teamId: number) => string = (id) => `team ${id}`): string {
  if (!(error instanceof BaseError)) {
    return error instanceof Error ? error.message : 'Something went wrong.'
  }
  if (error.walk((e) => e instanceof UserRejectedRequestError)) return 'You cancelled the transaction.'

  const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
  if (revert instanceof ContractFunctionRevertedError && revert.data) {
    const args = revert.data.args ?? []
    const now = Date.now() / 1000
    switch (revert.data.errorName) {
      case 'NotAHolder':
        return `Hold some ${tickerOf(Number(args[0]))} in this wallet to paint for that team.`
      case 'CooldownActive':
        return `Cooling down — next pixel in ${countdown(Number(args[0]) - now)}. Boost to skip it.`
      case 'PixelIsProtected':
        return `That pixel is protected for another ${countdown(Number(args[0]) - now)}.`
      case 'AlreadyProtected':
        return 'That pixel is already protected.'
      case 'EmptyPixel':
        return 'Only painted pixels can be protected.'
      case 'InvalidTeam':
        return 'Pick a team first.'
      case 'SeasonNotFinished':
        return 'That season is still live — snapshots open when it ends.'
      case 'CostAboveMax':
        return 'The $PLACE cost just changed — refresh and try again.'
      case 'ERC20InsufficientBalance':
        return 'Not enough $PLACE for that.'
      case 'ERC20InsufficientAllowance':
        return 'Approve $PLACE first.'
      case 'FaucetCooldown':
      case 'DripCooldown':
        return `Faucet cooling down — try again in ${countdown(Number(args[0]) - now)}.`
      default:
        return `Transaction reverted (${revert.data.errorName}).`
    }
  }
  if (/insufficient funds/i.test(error.message)) return 'Not enough ETH for gas — grab some from the testnet faucet.'
  return error.shortMessage || 'Something went wrong.'
}
