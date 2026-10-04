// Copies Foundry deployment outputs into the web app so the site knows contract addresses.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const from = resolve(here, '../../contracts/deployments')
const to = resolve(here, '../src/config/deployments')

for (const network of ['testnet', 'mainnet']) {
  const src = resolve(from, `${network}.json`)
  const dst = resolve(to, `${network}.json`)
  if (existsSync(src)) {
    copyFileSync(src, dst)
    console.log(`synced ${network}.json`)
  } else if (!existsSync(dst)) {
    writeFileSync(dst, 'null\n')
    console.log(`no ${network} deployment yet (wrote null)`)
  }
}
