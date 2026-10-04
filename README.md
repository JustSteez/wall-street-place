# Wall Street Place

**A shared on-chain pixel canvas on [Robinhood Chain](https://docs.robinhood.com/chain/) where every stock is a team.**

You can only paint for the stocks you hold. NVDA holders fight TSLA holders for territory, pixel by pixel. Your Stock Tokens never leave your wallet — the contract only *reads* your balance. When the closing bell rings, the team holding the most pixels wins the season, the canvas freezes forever on-chain, and anyone can mint it as a fully on-chain collectible.

- 100 × 100 canvas, 16 colours, one pixel per wallet every 30 seconds
- Teams = Robinhood Stock Tokens (NVDA, TSLA, AAPL, AMZN, MSFT, GOOGL, META, SPY)
- Holding is ERC-8056 aware: `shares = balanceOf × uiMultiplier / 1e18`, so splits and dividend accruals count correctly
- Weekly seasons; the winner is recorded on-chain
- No deposits, no custody, no servers — just contracts and a static site

## $PLACE

$PLACE is a fixed-supply (1,000,000,000) utility token with **no mint function**. It is only ever burned:

| Action | Cost | What it does |
|---|---|---|
| Boost | 10 $PLACE | Paint immediately, skipping your cooldown |
| Protect | 25 $PLACE | Lock a pixel for 1 hour (you must hold that pixel's team stock) |
| Snapshot | 100 $PLACE | Mint a finished season's canvas as an on-chain NFT |

Costs are owner-adjustable within hard caps set in the contract.

## Repository

```
contracts/   Foundry: WallStreetPlace, PlaceToken, SeasonSnapshot, CanvasRenderer (+ testnet mocks/faucets)
web/         Vite + React + viem static site (deployed to GitHub Pages)
```

### Contracts

```bash
cd contracts
forge install          # submodules: forge-std, openzeppelin-contracts
forge test
```

Deploy to **testnet** (mock stock tokens + faucets so anyone can play):

```bash
cp .env.example .env   # PRIVATE_KEY of a funded testnet wallet
source .env
forge script script/Deploy.s.sol --sig "testnet()" --rpc-url robinhood_testnet --broadcast
```

Deploy to **mainnet** with the real Stock Token addresses in `config/teams.mainnet.json` (verified on-chain):

```bash
forge script script/Deploy.s.sol --sig "mainnet()" --rpc-url robinhood --broadcast
```

The deployer becomes the owner and receives the full $PLACE supply. Addresses are written to `contracts/deployments/<network>.json`.

### Web

```bash
cd web
npm install
npm run sync           # copy contracts/deployments/*.json into the app
npm run dev            # testnet by default; VITE_NETWORK=mainnet for mainnet
npm test
```

## Network

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 46630 | 4663 |
| RPC | https://rpc.testnet.chain.robinhood.com | https://rpc.mainnet.chain.robinhood.com |
| Explorer | https://explorer.testnet.chain.robinhood.com | https://robinhoodchain.blockscout.com |

## Known limitations

- Cooldowns are per wallet. Someone can move stock between wallets to get extra paint slots. It's a game, not a financial primitive, so this is accepted; boosts and protection still cost $PLACE.
- Stock Token availability depends on jurisdiction. Robinhood Stock Tokens give economic exposure, not shareholder rights.
- A fee-free burn-only token still deserves legal review before any mainnet launch.

Not affiliated with Robinhood. Not financial advice.

## Photo credits

Photos from Wikimedia Commons, used under their licenses (also credited in the site footer):

- *New York Stock Exchange August 2017 02* and *04*: Arild Vågen, CC BY-SA 4.0
- *Wall Street Sign*: Alex Proimos, CC BY 2.0
- *New York City, Wall Street, 2012*: Dietmar Rabich, CC BY-SA 4.0

The pixel bull mascot is original art drawn in code.

## License

MIT
