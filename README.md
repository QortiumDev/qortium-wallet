# Walletium

**Multi-coin wallet Q-App for the Qortium ecosystem**

Walletium is a clean, modern wallet interface built for Qortium. It runs inside the Qortium UI as an iframe-sandboxed application, communicating with the node exclusively via `qortalRequest` - no external HTTP. The entire app compiles to a single self-contained `index.html` for publishing to QDN.

---

## Supported Coins

_Qortium?_

| Coin         | Ticker |
| ------------ | ------ |
| Qortal       | QORT   |
| Bitcoin      | BTC    |
| Litecoin     | LTC    |
| Dogecoin     | DOGE   |
| DigiByte     | DGB    |
| Ravencoin    | RVN    |
| Pirate Chain | ARRR   |
| Bitcoin Cash | BCH    |
| Dash         | DASH   |
| Namecoin     | NMC    |
| Peercoin     | PPC    |
| Firo         | FIRO   |
| Komodo       | KMD    |
| VerusCoin    | VRSC   |
| Zcash        | ZEC    |
| LBRY Credits | LBC    |
| Verge        | XVG    |

---

## Features

### Coin Grid (home screen)

- Tile-based grid of all supported coins with live balances
- **7 zoom levels** - from large tiles to dense micro-tiles
- **Sort modes** - custom drag-and-drop order, name A→Z / Z→A, balance high→low / low→high
- Hover reveals copy-address and send shortcuts, plus truncated address preview
- All preferences (zoom, sort, tile order) persist across sessions

### Coin Detail

- Large balance display with QR code
- Click-to-copy address bar
- **Transaction history** - expandable rows showing hash, counterparty address, fee, and timestamp
- Balances and transactions auto-refresh every 3 minutes

### Send

- Send dialog with live fee fetch and hardcoded fallbacks
- **Send Max** - calculates balance minus fee
- Editable fee field (user override always takes priority)
- QORT fee: 0.01 QORT per transaction
- ARRR: fee handled internally by the node (field is display-only)

### Pirate Chain (ARRR) Initialization

ARRR uses a Zcash-based shielded chain that must sync before the wallet can load balances or send. On first visit to the ARRR detail page:

1. A sync overlay replaces the normal UI
2. Sync status is polled every 5 seconds (up to ~8 minutes total)
3. Progress is shown as a percentage during the initializing phase
4. On failure: Retry button and a server selection dialog
5. Send button stays disabled until fully synced

### Top Bar

- Copy all wallet addresses to clipboard in one click
- Zoom in / zoom out controls (home screen only)
- Sort mode picker (home screen only)
- Dark / light mode toggle
