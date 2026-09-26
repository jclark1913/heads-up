# Word banks and Arabic card display

Status: English and Arabic cards, custom word-bank import, and party/classroom use are confirmed requirements. The owner's ingestion direction is CSV, JSON, and plain text, including whitespace-delimited lists. Supported shapes, delimiter defaults, and limits below are proposed implementation details.

## Keep one game

**W-01 — One prompt per card.** A card contains a single word, name, or short phrase. It can be English or Arabic. Do not add translation pairs, bilingual cards, automatic translation, a language-learning mode, or a translated interface. The existing interface can remain English. A teacher supplies vocabulary for the target language and uses the same round, timer, scoring, and optional manual controls as a party host.

**W-02 — Starter categories.** Start with Famous People, Animals, Everyday Objects, and Actions. Supply English and Arabic banks with clear names, such as Animals — English and Animals — Arabic. Treat their contents as independently curated lists, not mandatory one-to-one translations. Include culturally relevant famous people; avoid assuming everyone knows the same celebrities. The proposed target is at least 50 reviewed prompts per starter bank. The final lists still need editorial review.

## Custom word-bank workflow

**W-03 — Add a bank from text or a file.** Offer Paste and Import file under My word banks. Both lead to the same parsing options, card preview, validation, and save flow. Support these input formats:

- Plain text: one nonempty line per card by default, preserving spaces inside names and phrases. Offer explicit delimiter choices: Lines, Tabs and line breaks, or All whitespace (spaces, tabs, and line breaks). The last option supports lists such as "cat dog bird" but splits "New York" into two cards; show that effect in preview before saving. Collapse consecutive delimiters and discard empty entries. Do not treat Arabic vowel marks or joining characters as delimiters.
- CSV: use a real CSV parser, then let the user select the card-text column and indicate whether the first row is a header. Show the selection in preview before ignoring other columns; they are not translation fields. CSV is useful for spreadsheet exports, but is not the required format for all banks.
- JSON: accept an array of strings, such as `["cat", "New York", "قطة"]`, or a simple bank object, such as `{"title": "Lesson 1", "words": ["قطة", "كلب"]}`. A supplied title pre-fills the editable bank name. Report non-string entries and unsupported shapes; do not stringify objects/numbers, recursively guess fields, or silently convert unrelated metadata into cards.

For files, use .txt, .csv, or .json to suggest the format; for pasted content, default to Text and allow CSV or JSON selection. Always show the selected format and applicable delimiter/column controls. Never silently switch parsers or split phrases based on content guesses. TXT, CSV, and JSON files use UTF-8. Direct .xlsx, PDF, Word, image, and URL ingestion are deferred; no document extraction or AI processing is needed for this scope.

Use the normal browser file picker, including on iPhone; drag-and-drop can be an optional desktop convenience. Read selected files on the device. No server upload or account is required. [Browser File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications).

**W-04 — Preview, then save.** The flow is Paste or choose file → Confirm format and parsing options → Preview/correct cards and name the bank → Save bank. Show the playable count, ignored empty-entry count, duplicate count, and any invalid entries with their source line, CSV record, or JSON array index where available. Changing parsing options regenerates the preview from the original input; if corrections would be lost, require confirmation before discarding them. Let the user correct/remove entries before saving. Include a sample at gameplay size so Arabic direction and long phrases can be checked. Cancel makes no saved changes. Do not start a round until a bank has at least one valid card.

Parse CSV with a proper parser, including quoted commas and escaped quotes; whitespace splitting never applies inside CSV cells or JSON strings. Recognize UTF-8 with or without a byte-order mark and common line endings. Flatten embedded line breaks inside a selected CSV cell or JSON string into spaces for its single card, with the normalized text visible in preview. Malformed JSON or CSV requires correction before saving; valid JSON with invalid entries identifies those entries for correction/removal. If decoding fails, request a UTF-8 file rather than saving garbled Arabic. Do not silently retry an invalid JSON/CSV file as plain text.

Proposed limits: 1 MiB per import, 2,000 playable entries per bank, and 120 Unicode code points per prompt. Display these limits before import and identify violations without silently truncating. Validate names and prompts as plain text; imported text never becomes HTML or executable code.

For duplicate comparison, trim surrounding whitespace and use Unicode NFC. Preview the removal of exact duplicates before saving. Preserve the displayed spelling, Arabic letter forms, and diacritics; vowel-mark differences can distinguish vocabulary. Do not merge different Arabic words through aggressive text normalization. Very short banks are allowed and end with the existing deck-exhausted rule.

**W-05 — Manage and share a file.** Save custom banks under My word banks. Support rename, basic prompt corrections/add/remove, delete with confirmation, and Export words as UTF-8 .txt (one card per line). A teacher can prepare a list on a laptop and import that file on the playing phone. Export preserves prompt text/order; the receiver supplies a bank name on import. Link sharing, shared editing, cloud sync, and public bank publishing are deferred. Imported banks are private to that browser's storage.

Editing or deleting a bank cannot alter a round already in progress: the round retains its content snapshot. Creating a bank never modifies a bundled bank. Re-import creates a new bank unless the user explicitly selects an existing custom bank to replace; replacement increments its version.

**W-06 — Offline storage.** Store custom banks in IndexedDB separately from the service-worker cache. A successful Save requires a completed database write; on failure, keep the draft visible and offer Export words instead of claiming it was saved. Once the app shell is cached and the bank is saved, it is playable offline. App updates must preserve custom banks and migrate their schema without destructive resets. [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

Browser data can be cleared or evicted, and it does not automatically sync between devices or browsers. Make Export words easy to find and describe it as a backup. Request persistent storage where supported as an enhancement; do not promise permanent storage based on that request. [Browser storage lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Arabic rendering

**W-07 — Direction belongs to the card text.** Render each prompt and editable prompt field with appropriate bidirectional isolation and `dir="auto"`, letting Arabic content flow right to left and English content left to right. Do not reverse characters, mirror the entire game UI, or reverse Correct/Pass gestures. Bank titles also need safe direction handling when inserted into English labels. If language metadata is known, use it for `lang`; direction must not depend on a translated UI. [W3C direction guidance](https://www.w3.org/International/questions/qa-html-dir).

Use fonts and line heights that render joined Arabic letters and vowel marks clearly. If a web font is required, include its Arabic glyphs in the offline assets. Test mixed Arabic/English names, punctuation, digits, diacritics, and long phrases in both landscape directions. Prompt text must remain complete and legible; never truncate the answer with an ellipsis.

## Classroom use without extra product machinery

**W-08 — Use the bank as the lesson.** A teacher can name a bank for a lesson, import its target-language vocabulary, and choose the existing round duration. Results show the played prompts and Correct/Pass outcomes for a group debrief. A pass is a game outcome, not a measure of language proficiency. A short class list may end before the timer, which should be explained in setup.

No student accounts, grades, proficiency scoring, translation fields, or speech recognition are needed. Classroom trials should check whether learners can read the prompts, understand the gesture instructions, and use a teacher's prepared bank without extra assistance. Arabic dialect and spelling choices remain part of the supplied word bank.
