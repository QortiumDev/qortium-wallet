# Qortium Wallet

A multi-coin wallet Q-App for the Qortium ecosystem. Supports QORT and all foreign chains available through the Qortium gateway. Includes send/receive, transaction history, and a QDN-backed encrypted address book.

Built to be forked — see [Naming](#naming) below.

## Currently Supported Coins

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

## Build

```
npm install
npm run build
```

Output is a single HTML file at `dist/index.html`, ready to publish as a Qortium APP.

## Home Display Settings

When launched from Qortium Home, the app reads display settings from render URL
params and live `postMessage` events: `theme`, `accent`, `textSize`, `lang`, and
`uiStyle`.

`uiStyle` supports `classic` and `modern`. Missing or unknown values default to
`classic`, matching Home's QDN app contract. Classic uses the bundled Lexend font,
Home-style green-tinted tokens, and wider layouts; Modern preserves the original
MUI/Inter-centered design.

When changing app styling, keep the existing `useIframeListener` -> global system
state -> theme/token provider path intact, and verify both styles with
`npm run build`.

## Naming

The name this app publishes under is set in `src/apps.ts`:

```ts
wallet: { qdn: 'Wallet', label: 'Wallet' },
```

Change `qdn` to whatever name you've registered on your network, then publish under that name. Update the same registry entry in any other apps that link to this one.
