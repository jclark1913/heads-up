# Import a word bank

Open **Create deck**. Paste a list or choose **Import file (.txt, .csv, .json)**. A selected file fills the source text box and selects its format from the extension. You can edit the source or change the format explicitly. Nothing is uploaded.

Choose **Preview cards**, correct or remove entries, give the deck a name, and select **Save deck & play**. The deck is saved in this browser on this device and appears under **My decks** after reload. Save failures keep the draft open for retry or TXT export.

## Plain text

Lines is the default, keeping phrases together:

```text
New York
Playing football
قِطَّة
```

Commas splits ordinary and Arabic commas plus line breaks. For example, `cat, dog، New York` produces three cards. Tabs and line breaks preserves spaces inside phrases. All whitespace splits at every space, tab, or line break, so `New York` becomes two cards.

Text delimiter settings apply to pasted text and TXT files. Commas mode does not interpret CSV quotes; choose CSV for quoted cells or Lines to keep literal commas.

## CSV

Select **CSV** as the input format, or choose a CSV file. Pick **Card column** and explicitly check **First row is a header** if appropriate. The header toggle starts off. Only the selected column becomes cards.

```csv
number,word
1,"New York, NY"
2,"say ""hello"""
3,قِطَّة
```

For this example, select Column 2 and enable the header checkbox. Comma is the default CSV separator; Semicolon and Tab are also available. Quoted separators and escaped quotes stay in their cells. Numbers such as `001` stay text.

Inconsistent record widths and malformed quotes must be corrected in the source before preview. CSV supports up to 100 columns; export a smaller set of columns if needed. Source entry numbers in the preview refer to CSV records, including the header, rather than physical lines inside quoted multiline cells.

## JSON

Select **JSON**, or choose a JSON file. Use a string list:

```json
["cat", "New York", "قِطَّة"]
```

Or an object with `words` and an optional `title`:

```json
{
  "title": "Lesson 1",
  "words": ["cat", "New York", "قِطَّة"]
}
```

A supplied title fills the deck name unless you have already edited that name. Extra object fields and unsupported shapes are rejected. Numbers, objects, arrays, booleans, and nulls within the word list appear as flagged blank cards to correct or remove; they are never converted to text automatically. Malformed JSON must be corrected in the source first.

## Preview and limits

- Files must use UTF-8, with or without a BOM. Invalid encoding is rejected, preserving the previous source and draft.
- Maximum input: 1 MiB. Maximum deck: 2,000 distinct cards, 120 Unicode code points per card, and an 80-code-point name.
- Empty entries and duplicates are counted and removed. Duplicate comparison trims and uses Unicode NFC; the first spelling is retained, including Arabic diacritics and joining characters.
- Embedded CSV/JSON line breaks become spaces, with a count and note in the preview.
- Overlong cards remain available to correct or remove. Saving stays disabled until every remaining card and the name are valid.
- Rebuilding a preview after card edits asks before replacing those edits. Canceling saves nothing. A late file read cannot change a closed or newly opened draft.
- HTML-like text stays literal. Importing through Create deck creates a new deck. Replacing an existing deck requires the explicit management flow below.

## Manage saved decks

Open **My decks → Manage deck**. Edit the name or individual cards, use **Add card** or a card’s remove button, then **Save changes**. Empty/invalid cards must be corrected or removed before saving. Cancel asks before discarding edits.

**Export words (.txt)** downloads the current preview as UTF-8 text, one card per line. It preserves spelling, Arabic diacritics, and order. Re-import with Lines selected to preserve phrases and commas. TXT contains the words, not the deck identity or other metadata; keep exports as backups because clearing browser storage removes local decks.

**Replace cards from text or file** uses the same parsing and preview controls. The existing deck name stays unless edited. **Save replacement** asks for confirmation, preserves the deck identity, and increments its version. Ordinary Create deck imports always create a separate deck.

**Delete deck** asks for confirmation and removes that local copy only. Cancelling changes nothing. Updates/deletes appear in other open tabs through refresh messages, with a refresh on focus as a fallback. Each write also checks the stored version within its transaction: an outdated editor cannot overwrite a newer deck or recreate a deleted one. Its draft remains available to export, reload (discarding edits only after confirmation), or **Save as new deck**.

A save/delete failure keeps the editor open and leaves committed data unchanged. Active rounds and their results retain the deck name/cards captured at Start. If their source deck is deleted, Play again returns to the library.

The app currently needs an online launch. Sharing and offline launch remain later steps. On the Pixel 10a and iPhone 17 Pro, check file selection, editing with the software keyboard, TXT downloads/re-import, and a short motion round.

## Parser implementation

[Papa Parse](https://www.papaparse.com/docs) 5.7.0 handles CSV quoting, delimiters, and records. Dynamic typing and downloads are disabled. Plain text and JSON use local parsers; strict UTF-8 decoding happens before parsing. All formats feed the same card validation, editable preview, and committed IndexedDB save.

## Share without files

Saved decks also support **My decks → Share deck** for QR/link transfer without accounts. Recipients preview and save an independent copy. Large lists use the file export/import flow above. See [sharing instructions](SHARING.md).
