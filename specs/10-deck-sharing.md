# Backend-free deck sharing

Status: approved September 29, 2026. This replaces the earlier creator-account/Supabase proposal. Sharing uses only the static PWA; no accounts, database, email sender, paid service, or idle backend is required.

Related: [product scope](01-product.md), [architecture](04-architecture.md), [decisions](06-decisions.md), and [user guide](../docs/SHARING.md).

## User experience

**S-01 — Review a saved deck.** My decks → Share deck captures the saved title and ordered cards. Show the name, count, and an expandable preview before Create share link. Unsaved editor changes are not shared. Explain that anyone holding the link can read/save its cards and that the link contains a fixed copy.

**S-02 — QR, link, and file.** Create the link entirely on the device. Offer a QR where the resulting matrix fits the scanning limit, Copy link, Download QR, and the native share sheet where supported. If clipboard access fails, retain the selectable link. Cancelling the share sheet keeps all controls available. The app never sends a message itself.

A large deck may fit a link but not a comfortable QR. Explain this and offer copy/file export. If it exceeds the link limit, offer file export or splitting into smaller decks. Never silently drop cards. TXT export is always available. Recipients import the file with Create deck and name the deck themselves.

**S-03 — Preview and save a copy.** Opening/scanning a link or pasting it into Open deck link shows the title, count, and literal cards. Arabic uses automatic text direction. Save a copy & play creates fresh local bank/prompt IDs, waits for the IndexedDB transaction to commit, and enters setup. It does not start a round automatically.

A failed save retains the preview, retry, and TXT export. Invalid or unsupported links give an actionable error without affecting local banks. Incoming links wait until a round ends, including preparation and interruption, and until any open editor/dialog closes. The latest incoming link is retained while waiting; it never replaces an unsaved draft.

**S-04 — Independent snapshots.** Later edits/deletion do not alter a previously shared link. Received banks retain an optional SHA-256 content fingerprint solely to recognize a previously saved copy. Reopening identical content offers Open saved copy or Save another copy; never overwrite edits. Saving another copy creates fresh IDs. Identical content from different senders is intentionally treated as the same snapshot, not proof of authorship.

**S-05 — Availability and privacy.** There is no hosted publication, creator identity, short code, management account, revocation, or automatic synchronization. Anyone can forward a link. Deleting a local deck cannot recall it. Retain the link or exported file as a backup; the app does not keep a separate online library.

The fragment is handled by the browser rather than sent in the HTTP request. Cards remain readable to anyone/app with the complete link; this is not encryption. The app loads from its web host as usual. Keep results, preferences, local IDs, timestamps, diagnostics, and source files out of the shared payload. [URI fragments](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment).

**S-06 — Static hosting and compatibility.** Build links from the currently opened app URL, preserving the Pages repository path and replacing any query/fragment. No rewrite routes or secrets are required. Localhost links only work on their originating computer; temporary tunnel links stop working when their host stops. Generate lasting links from the permanent site. First launch still needs connectivity until offline caching is implemented. Once the app is loaded, encoding/decoding is local.

## Portable format and limits

- URL: app entry path followed by `#deck=1.<payload>`.
- Payload: UTF-8 JSON compressed with gzip, then unpadded base64url.
- JSON: `{ "v": 1, "title": "Lesson", "words": ["قِطَّة", "New York"], "language": "ar" }`. Language is optional and limited to en/ar; per-card direction remains automatic.
- Reject unknown fields/versions, malformed encoding/compression/UTF-8/JSON, non-string cards, duplicate cards under NFC comparison, blank/untrimmed text, or invalid limits. Preserve displayed spelling and diacritics.
- Content limits: 80 Unicode code points for title, 120 per prompt, 1–2,000 cards; at most 1 MiB after decompression. Stop reading the stream when the byte ceiling is exceeded.
- Maximum entire link: 8,192 characters. Actual capacity varies with the words and host/path length.
- QR: local qrcode package, error correction M, four-module quiet zone, at most version 20. PNG is generated at 512 pixels and displayed up to 320 CSS pixels. Larger matrices use link/file fallback; word count alone does not determine QR eligibility.
- CompressionStream/DecompressionStream support is checked at use. Missing capability offers file transfer. [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API).
- Fingerprint: SHA-256 of validated canonical JSON; no publisher identity or secret is implied.

## Implementation and verification

`src/sharing/links.ts` owns validation, encoding, bounded decoding, fingerprints, and fresh copies. `qr.ts` generates PNGs. `SharingDialog.tsx` handles sender/recipient controls. `useSharing.ts` captures/defer links without coupling sharing to the game engine. Received custom-bank provenance is an optional field, requiring no database migration.

Unit tests cover malformed/oversized data, Arabic/phrases, snapshot identity, fresh IDs, bounded decompression, unsupported APIs, Pages path preservation, and actual QR decoding. Browser tests exercise generated QR → separate recipient browser → preview/save/play, duplicate imports, storage failures, clipboard/share cancellation, and links arriving during games/edits.

Physical camera scanning on Pixel 10a and iPhone 17 Pro, native downloads/share sheets, installed/tab handoff, and final Pages deployment remain device checks. Browser automation cannot certify those interactions.
