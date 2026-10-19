import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import './styles/sections.css'
import './styles/floor.css'
import './styles/card.css'
import App from './App.tsx'
import { HAS_PRIVY } from './lib/wallets'

// Email/social login. Loaded beside the app, not around it, so the canvas never waits on the SDK.
const PrivyBridge = HAS_PRIVY ? lazy(() => import('./components/PrivyBridge')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {PrivyBridge && (
      <Suspense fallback={null}>
        <PrivyBridge />
      </Suspense>
    )}
  </StrictMode>,
)
