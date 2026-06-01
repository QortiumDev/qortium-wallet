# Walletium

**Multi-coin wallet Q-App for the Qortium ecosystem**

Walletium is a clean, modern wallet interface built as a Qortal Q-App. It runs inside the Qortal or Qortium UI as an iframe-sandboxed application, communicating with the node exclusively via `qortalRequest` — no external HTTP. The entire app compiles to a single self-contained `index.html` for publishing to QDN.

---

## Supported Coins

On a **Qortium** node, all available coins are discovered automatically at runtime via `/crosschain/blockchains`:

| Coin | Ticker | Notes |
|---|---|---|
| Qortal | QORT | Native chain |
| Bitcoin | BTC | |
| Litecoin | LTC | |
| Dogecoin | DOGE | |
| DigiByte | DGB | |
| Ravencoin | RVN | |
| Pirate Chain | ARRR | Requires shielded sync on first use |
| Bitcoin Cash | BCH | |
| Dash | DASH | |
| Namecoin | NMC | |
| Peercoin | PPC | 6 decimal places |
| Firo | FIRO | |
| Komodo | KMD | |
| VerusCoin | VRSC | |
| Zcash | ZEC | |
| LBRY Credits | LBC | |
| Verge | XVG | 6 decimal places |

On **plain Qortal** (no Qortium core), the app falls back to the 7 default coins: QORT, BTC, LTC, DOGE, DGB, RVN, ARRR.

---

## Features

### Coin Grid (home screen)
- Tile-based grid of all supported coins with live balances
- **7 zoom levels** — from large tiles (~220px) to dense micro-tiles (~38px)
- **Sort modes** — custom drag-and-drop order, name A→Z / Z→A, balance high→low / low→high
- Hover reveals copy-address and send shortcuts, plus truncated address preview
- All preferences (zoom, sort, tile order) persist across sessions via localStorage

### Coin Detail
- Large balance display with QR code
- Click-to-copy address bar
- **Transaction history** — expandable rows showing hash, counterparty address, fee, and timestamp
- Balances and transactions auto-refresh every 3 minutes

### Send
- Send dialog with live fee fetch (`GET_FOREIGN_FEE`) and hardcoded fallbacks
- **Send Max** — calculates balance minus fee
- Editable fee field (user override always takes priority)
- QORT fee: 0.01 QORT per transaction
- ARRR: fee handled internally by the Hub (field is display-only)

### Pirate Chain (ARRR) Initialization
ARRR uses a Zcash-based shielded chain that must sync before the wallet can load balances or send. On first visit to the ARRR detail page:
1. A sync overlay replaces the normal UI
2. `GET_ARRR_SYNC_STATUS` is polled every 5 seconds (up to ~8 minutes total)
3. Progress is shown as a percentage during the "Initializing wallet..." phase
4. On failure: Retry button and a server selection dialog (`GET_CROSSCHAIN_SERVER_INFO` / `SET_CURRENT_FOREIGN_SERVER`)
5. Send button stays disabled until fully synced

### Top Bar
- Copy all wallet addresses to clipboard in one click
- Zoom in / zoom out controls (home screen only)
- Sort mode picker (home screen only)
- Dark / light mode toggle

---

## Tech Stack

- **React 19** + TypeScript
- **Vite** + `vite-plugin-singlefile` — compiles everything into one `index.html`
- **MUI v7** — used structurally; default MUI aesthetics are overridden throughout
- **Jotai** (`atomWithStorage`) — global persisted state
- **@dnd-kit** — drag-and-drop tile reordering
- **react-router-dom** with `createHashRouter` — required for QDN file-based routing
- **react-qr-code**, **react-number-format**

---

## Development

### Prerequisites
Node.js 18+ and npm.

### Install
```bash
npm install
```

### Dev server (with full mock wallet)
```bash
npm run dev
```
Opens at `http://localhost:5173`. A dev mock is injected automatically — no Qortal node needed. All 17 coins appear with fake balances and transaction history.

### Production build (for QDN upload)
```bash
npm run build
```
Output: `dist/index.html` (~2.77 MB single file)

Zip for upload:
```bash
# Windows
Compress-Archive -Path dist\* -DestinationPath walletium.zip -Force
```
Publish `walletium.zip` to QDN as service type **APP**.

### Demo build (standalone, no server required)
```bash
npm run build:demo
```
Output: `dist-demo/index.html` — a fully self-contained demo with mocks baked in. Open directly in any browser from a USB drive or local disk. Shows all 17 coins with fake balances and transaction history. No Qortal node required.

---

## Project Structure

```
src/
  assets/              Coin icons (SVG/PNG), inlined at build time
  components/
    layout/TopBar.tsx  Fixed top bar
    wallet/
      CoinGrid.tsx     Home screen tile grid
      CoinDetail.tsx   Per-coin balance, history, and send
  config/chains.ts     ChainConfig definitions, DEFAULT_CHAINS, KNOWN_CHAINS
  hooks/
    useSupportedChains.ts  Dynamic chain discovery
  state/global/system.ts   Jotai atoms (theme, sort, zoom, order)
  theme/
    tokens.ts              Color palettes (light + dark), typography, shape constants
    ColorTokensContext.tsx useColors() hook
  styles/theme/theme.ts    MUI theme built from tokens
  routes/Routes.tsx        Hash router
```

---

## Design Notes

The design language is documented separately in the project memory for use across sister apps. Key points:

- **Dark-first** — dark mode is the default
- **No gradients** — depth expressed through color contrast between `bg` (#111318) and `surface` (#1C1F28)
- **Font:** Inter (self-hosted, bundled inline)
- **Border radius:** 8px on cards, 0 on dialogs, 50px on pill buttons
- **Border width:** 1.5px
- **Accent (dark):** #4D6478 — a muted steel blue
- Transitions: 0.15s ease on color/opacity; none during drag

---

## Known Limitations / Pending Work

- Theme preference (dark/light) resets on page reload — `themeAtom` is not yet persisted
- Settings button is visible in the top bar but not yet wired to any UI
- Address book components exist in the codebase but are not integrated into the current UI
- Transaction history is capped at the last 20 entries with no pagination
- ARRR initialization has not been tested on a live Qortium node with real lightwallet servers
- Balances are shown in native coin units only — no fiat conversion
