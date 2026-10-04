import { parseAbi } from 'viem'

export const canvasAbi = parseAbi([
  'function SIZE() view returns (uint256)',
  'function currentSeason() view returns (uint256)',
  'function seasonEndsAt() view returns (uint64)',
  'function cooldown() view returns (uint64)',
  'function skipCooldownCost() view returns (uint256)',
  'function protectCost() view returns (uint256)',
  'function teamCount() view returns (uint256)',
  'function getTeam(uint8 teamId) view returns (address token, uint96 minShares, string ticker)',
  'function getCanvas(uint256 season) view returns (bytes)',
  'function teamPixels(uint256 season) view returns (uint32[16])',
  'function seasonWinner(uint256 season) view returns (uint8)',
  'function protectedUntil(uint256 season, uint256 index) view returns (uint64)',
  'function nextPlaceAt(address painter) view returns (uint64)',
  'function sharesOf(address account, uint8 teamId) view returns (uint256)',
  'function isHolder(address account, uint8 teamId) view returns (bool)',
  'function place(uint256 x, uint256 y, uint8 color, uint8 teamId)',
  'function placeBoosted(uint256 x, uint256 y, uint8 color, uint8 teamId, uint256 maxCost)',
  'function protect(uint256 x, uint256 y, uint256 maxCost)',
  'function rollSeason()',
  'event PixelPlaced(uint256 indexed season, uint256 x, uint256 y, uint8 color, uint8 indexed teamId, address indexed painter, bool boosted)',
  'event PixelProtected(uint256 indexed season, uint256 x, uint256 y, uint64 until, address indexed by)',
  'error OutOfBounds()',
  'error InvalidColor()',
  'error InvalidTeam()',
  'error NotAHolder(uint8 teamId)',
  'error CooldownActive(uint64 readyAt)',
  'error PixelIsProtected(uint64 until)',
  'error AlreadyProtected(uint64 until)',
  'error EmptyPixel()',
  'error SeasonNotOver()',
  'error CostAboveMax(uint256 cost, uint256 maxCost)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
])

export const placeTokenAbi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

export const snapshotAbi = parseAbi([
  'function mint(uint256 season, uint256 maxCost) returns (uint256)',
  'function mintCost() view returns (uint256)',
  'function mintedPerSeason(uint256 season) view returns (uint256)',
  'error SeasonNotFinished()',
  'error CostAboveMax(uint256 cost, uint256 maxCost)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
])

export const mockStockAbi = parseAbi([
  'function faucet()',
  'function nextFaucetAt(address account) view returns (uint256)',
  'error FaucetCooldown(uint256 readyAt)',
])

export const placeFaucetAbi = parseAbi([
  'function drip()',
  'function nextDripAt(address account) view returns (uint256)',
  'error DripCooldown(uint256 readyAt)',
])
