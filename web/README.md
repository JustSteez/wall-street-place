# Wall Street Place: web

Static Vite + React + viem site. See the root README for setup.

```bash
npm install
npm run sync   # copy ../contracts/deployments/*.json
npm run dev    # VITE_NETWORK=testnet (default) | mainnet | local
npm test
```

## Email & social login (Privy)

Players without a wallet can log in with email, Google or X and get an embedded wallet. It's off until you set an app ID:

1. Create an app at [dashboard.privy.io](https://dashboard.privy.io), enable Email, Google and Twitter login, and add your site's domain (and `http://localhost:5173`) under allowed origins.
2. Put the app ID in `web/.env.local` as `VITE_PRIVY_APP_ID=...`, and for GitHub Pages add it as a repository variable `VITE_PRIVY_APP_ID`. It's a public ID, like the WalletConnect one.

The SDK loads in its own chunk beside the app, so the canvas never waits on it, and a Privy failure only disables that login option. New embedded wallets start with no ETH; the desk points them to the testnet gas faucet.

`.npmrc` sets `legacy-peer-deps` because one of Privy's optional peers (`permissionless`) pins an older `ox` than viem uses.
