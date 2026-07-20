# Changelog

All notable changes to Qortium Wallet will be documented in this file.

## Unreleased

### Fixed

- QORT transaction history now loads. It was empty for two reasons: the history query used `FETCH_NODE_API`, which targets the Qortium node instead of the Qortal chain the QORT payments live on, and the bridge's result envelope was never unwrapped (the transaction array is in `.data`). The query now uses Home's new `SEARCH_QORTAL_TRANSACTIONS` action, which searches the Qortal chain and returns the transaction array directly; on Home builds without that action the list stays empty as before.

## [1.7.9] - 2026-07-10

### Added

- QORT (Qortal native coin) is now fully supported: balance via `GET_QORT_BALANCE`, send via `SEND_QORT`, address via `GET_USER_WALLET` with native asset (`assetId: 0`). QORT is always shown first in the coin list regardless of chain discovery state.

### Fixed

- Send button availability now checks `SEND_QORT` for QORT and `SEND_COIN` for all foreign coins, so QORT send is correctly gated on Qortal bridge availability rather than Qortium bridge availability.
- QORT wallet detail no longer shows "wallet unavailable" on public nodes - the foreign-wallet guard (`GET_WALLET_BALANCE`) is bypassed for native QORT since it does not apply.
- Fee input is hidden in the QORT send dialog since `SEND_QORT` computes the fee automatically.
- QORT name resolution in the address book now uses `GET_NAME_DATA` bridge action instead of a direct API fetch, which was broken inside the Q-App sandbox.

## [1.7.3] - 2026-07-09

### Added

- Coin icons loaded from QDN (THUMBNAIL service, `wallet-coin-{ticker}` identifiers) rather than bundled as static assets, allowing new icons to be published without a full app update.
- Placeholder icon (initial letter in a circle) shown for any coin without a published QDN image.

## Previously unreleased

### Added

- Apply Qortium Home text-size settings on app launch and when Home sends text-size changes, matching the existing theme and language bridge behavior.
- Added foreign-coin send-max support and prepared-transaction previews using Qortium Home's send result metadata.

### Changed

- Migrated Home bridge calls from legacy `qortalRequest` globals to `qdnRequest`.
- Limited visible wallet chains to Qortium Home-supported wallets: QORT, BTC, LTC, DOGE, DGB, RVN, DASH, NMC, and FIRO.
- Foreign sends now pass fee overrides as `feePerByte` strings and omit `amount` when send-max is enabled.

### Fixed

- Updated native wallet requests to use Home 1.3-compatible native asset forms and `GET_BALANCE`.
- Disabled encrypted QDN address-book sync when Home does not expose encryption bridge actions, while keeping local address books available.
- Foreign sends now only pass fee-per-byte values returned by `GET_FOREIGN_FEE`; when fee lookup fails, Home/Core defaults are used.
- Mapped `/crosschain/blockchains` support data from `supportsLocalChainTrades`.

## [1.3.2] - 2026-03-06

### Fixed

- QDN address book check: added `coinType` field to published QDN resources and dual validation in `fetchFromQDN` to discard resources returned by the Qortal node for a different coin identifier. Primary check uses the new top-level `coinType` field; secondary check uses entries' `coinType` field for backward compatibility with older published resources.
- TypeScript build errors for MUI v7 compatibility: replaced removed named exports (`SlideProps`, `TooltipProps`, `TransitionProps`, `SnackbarCloseReason`, `ToggleButtonGroupProps`) with `ComponentProps<typeof ...>` equivalents or local type definitions; added explicit `Theme` typing to `styled()` callbacks.
- `NumericFormat` forwarded MUI props no longer cause TypeScript errors.

### Tests

- Added 4 tests covering the QDN coinType mismatch scenario.

## [1.3.1] - 2026-02-27

### Fixed

- QDN address book sync: skip unnecessary publish when timestamps diverge but content is identical (hash comparison before publishing)
- QDN address book sync: re-align local timestamp to QDN after skipping publish, and sync forward after publishing, to avoid redundant evaluations on next startup

### Changed

- Release workflow now fails with a clear message if the release version already exists, instead of silently deleting it
- Removed push trigger from npm tests workflow

### Tests

- Added tests covering the QDN address book hash-comparison sync bugfix

## [1.3.0] - 2026-01-23

### Added

- Address book feature with QDN persistence
- QORT address search by name
- Double-click to copy address or add name to address book
- Validation functions for all coin addresses
- `maxSendable` functions for all supported coins (ARRR, BTC, DOGE, LTC, RVN, DGB)
- Tests for LTC validation
- New translations for address book
- Add CHANGELOG.md file
- Display changelog in a dialog

### Changed

- Updated qapp-core to version 1.0.75
- Improved I18N translations

## [1.2.1] - 2026-01-02

### Changed

- Improved send validation flow
- Updated GitHub Actions release workflow with simplified changelog template
- Added concurrency groups to GitHub Actions workflows
- Added condition to run workflows only on specific repository

### Fixed

- Send max button validation improvements

## [1.2.0] - 2025-12-27

### Changed

- Qortal Transaction table updates and improvements
- GitHub Actions parametrization of APP_NAME
- Improved release changelog diff with comparison links

## [1.1.3] - 2025-12-24

### Added

- GitHub Actions release workflow with automated changelog generation
- New contributors section in releases
- ASSET type transactions support

### Changed

- Improved API call for validating addresses (allows sending QORT to addresses with no transactions)
- Refactored wallet info loading with better async operations
- Added `useCallback` and `AbortController` for cleaner code

### Fixed

- Address validation for empty or malformed addresses

## [1.1.2] - 2025-11-28

### Added

- Font optimization with woff2 format and font-display swap
- Copy confirmation message
- Better precision for numeric values

### Changed

- Improved mobile responsiveness and layout
- Better loading states with LinearProgress
- Refactored embedded colors into theme
- Trimmed recipient address input
- More efficient async/await calls

### Fixed

- Mobile view for menu
- Modal reset after sending
- Address and amount validation
- Error reset when changing pages

## [1.1.1] - 2025-11-24

### Fixed

- Missing QORT import
- Duplicated check conditions
- Renamed methods for clarity
- Added EMPTY_STRING constant for consistency

## [1.1.0] - 2025-11-15

### Added

- Initial release of Walletium
- Support for multiple cryptocurrencies: QORT, BTC, LTC, DOGE, DGB, RVN, ARRR
- Transaction history with pagination
- Send functionality for all supported coins
- QR code generation for receiving addresses
- Internationalization (i18n) support
- Responsive design for mobile devices
- Transaction fee display
- Copy to clipboard functionality

### Changed

- Refactored time constants
- Improved lateral menu responsiveness
- Better layout adaptation for different devices
