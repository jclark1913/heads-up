import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  createCustomBank,
  draftFromBank,
  reviseCustomBank,
  deckLimits,
  reviewCards,
  titleProblem,
} from './content/decks'
import type { DraftCard, CustomBank } from './content/decks'
import { parseText } from './content/textImport'
import type { TextDelimiter } from './content/textImport'
import {
  parseCsv,
  parseJson,
  readCsv,
  readWordFile,
} from './content/fileImport'
import type { ImportFormat, CsvDelimiter } from './content/fileImport'
import { DeckConflictError } from './content/repository'
import { exportWords } from './content/export'
import { FittedPrompt } from './FittedPrompt'

export function DeckCreator({
  save,
  editing,
}: {
  save: (bank: CustomBank) => Promise<void>
  editing?: {
    bank: CustomBank
    update: (bank: CustomBank, expectedVersion: number) => Promise<void>
    remove: (id: string, expectedVersion: number) => Promise<void>
    reload: (id: string) => Promise<CustomBank | null>
    onClose: () => void
  }
}) {
  const [original, setOriginal] = useState(() =>
    editing ? structuredClone(editing.bank) : null,
  )
  const [dirty, setDirty] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [conflict, setConflict] = useState(false)
  const isEditing = !!editing
  const newCard = useRef<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const heading = useId()
  useEffect(() => {
    if (isEditing) dialog.current?.showModal()
  }, [isEditing])
  const filePicker = useRef<HTMLInputElement>(null)
  const fileRead = useRef(0)
  const [reading, setReading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [format, setFormat] = useState<ImportFormat>('text')
  const [csvDelimiter, setCsvDelimiter] = useState<CsvDelimiter>(',')
  const [csvHeader, setCsvHeader] = useState(false)
  const [csvColumn, setCsvColumn] = useState(0)
  const [titleEdited, setTitleEdited] = useState(isEditing)
  useEffect(
    () => () => {
      fileRead.current++
    },
    [],
  )
  const [step, setStep] = useState<'paste' | 'preview'>(
    isEditing ? 'preview' : 'paste',
  )
  const [input, setInput] = useState('')
  const [delimiter, setDelimiter] = useState<TextDelimiter>('lines')
  const [title, setTitle] = useState(original?.title ?? '')
  const [cards, setCards] = useState<DraftCard[]>(() =>
    original ? draftFromBank(original) : [],
  )
  useEffect(() => {
    if (!newCard.current) return
    document.getElementById(heading + '-card-' + newCard.current)?.focus()
    newCard.current = null
  }, [cards, heading])
  const [counts, setCounts] = useState({
    emptyCount: 0,
    duplicateCount: 0,
    normalizedCount: 0,
  })
  const [selected, setSelected] = useState('')
  const [corrected, setCorrected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [exported, setExported] = useState(false)
  const csv = useMemo(() => {
    if (format !== 'csv' || !input.trim()) return null
    try {
      return { table: readCsv(input, csvDelimiter), error: '' }
    } catch (error) {
      return {
        table: null,
        error:
          error instanceof Error ? error.message : 'CSV could not be read.',
      }
    }
  }, [format, input, csvDelimiter])
  const review = reviewCards(cards)
  const nameProblem = titleProblem(title)
  const canSave =
    !nameProblem &&
    cards.length > 0 &&
    review.problems.size === 0 &&
    review.words.length <= deckLimits.cards &&
    !saving &&
    !reading
  const selectedCard = cards.find((card) => card.id === selected) ?? cards[0]

  async function chooseFile(file: File) {
    const request = ++fileRead.current
    setReading(true)
    setError('')
    try {
      const loaded = await readWordFile(file)
      if (request !== fileRead.current) return
      setInput(loaded.input)
      setFormat(loaded.format)
      setFileName(file.name)
      setDelimiter('lines')
      setCsvDelimiter(',')
      setCsvHeader(false)
      setCsvColumn(0)
    } catch (error) {
      if (request === fileRead.current)
        setError(
          error instanceof Error
            ? error.message
            : 'The file could not be read.',
        )
    } finally {
      if (request === fileRead.current) setReading(false)
    }
  }
  function close() {
    if (saving) return
    if (
      (isEditing
        ? dirty || input.trim()
        : input.trim() || fileName || title.trim() || cards.length) &&
      !window.confirm(
        isEditing
          ? 'Discard your unsaved changes?'
          : 'Discard this unsaved deck?',
      )
    )
      return
    dialog.current?.close()
  }
  function preview() {
    try {
      const parsed =
        format === 'json'
          ? parseJson(input)
          : format === 'csv'
            ? parseCsv(input, {
                delimiter: csvDelimiter,
                header: csvHeader,
                column: csvColumn,
              })
            : parseText(input, delimiter)
      if (!parsed.cards.length) {
        setError('Add at least one word or phrase before previewing.')
        return
      }
      if (
        corrected &&
        !window.confirm(
          'Rebuild the preview from your source text? This replaces your card corrections.',
        )
      ) {
        setStep('preview')
        return
      }
      if (!titleEdited) setTitle(parsed.title ?? '')
      setCards(parsed.cards)
      if (isEditing) {
        setDirty(true)
        setReplacing(true)
      }
      setCounts(parsed)
      setSelected(parsed.cards[0].id)
      setCorrected(false)
      setExported(false)
      setError('')
      setStep('preview')
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'The list could not be read.',
      )
    }
  }
  async function submit(asCopy = false) {
    if (!canSave) return
    if (
      editing &&
      replacing &&
      !asCopy &&
      !window.confirm(
        'Replace the saved cards in this deck? The name and cards in this preview will be saved.',
      )
    )
      return
    setSaving(true)
    setError('')
    try {
      if (editing && original && !asCopy)
        await editing.update(
          reviseCustomBank(original, title, cards),
          original.version,
        )
      else await save(createCustomBank(title, cards))
      dialog.current?.close()
    } catch (error) {
      if (error instanceof DeckConflictError) setConflict(true)
      setError(
        error instanceof Error
          ? error.message
          : 'Could not save. Retry or export your words.',
      )
    } finally {
      setSaving(false)
    }
  }
  async function reloadSaved() {
    if (!editing || !original || saving) return
    if (
      (dirty || input.trim()) &&
      !window.confirm('Discard your edits and reload the saved deck?')
    )
      return
    setSaving(true)
    setError('')
    try {
      const latest = await editing.reload(original.id)
      if (!latest) throw new DeckConflictError('missing')
      setOriginal(latest)
      setTitle(latest.title)
      setCards(draftFromBank(latest))
      setSelected(latest.prompts[0].id)
      setInput('')
      setFileName('')
      setCounts({ emptyCount: 0, duplicateCount: 0, normalizedCount: 0 })
      setCorrected(false)
      setDirty(false)
      setReplacing(false)
      setConflict(false)
      setExported(false)
      setStep('preview')
    } catch (error) {
      if (error instanceof DeckConflictError) setConflict(true)
      setError(
        error instanceof Error
          ? error.message
          : 'The saved deck could not be loaded.',
      )
    } finally {
      setSaving(false)
    }
  }
  async function removeSaved() {
    if (!editing || !original || saving) return
    if (
      !window.confirm(
        'Delete “' +
          original.title +
          '” from this device? This also discards any unsaved edits in this window.',
      )
    )
      return
    setSaving(true)
    setError('')
    try {
      await editing.remove(original.id, original.version)
      dialog.current?.close()
    } catch (error) {
      if (error instanceof DeckConflictError) setConflict(true)
      setError(
        error instanceof Error
          ? error.message
          : 'The deck could not be deleted.',
      )
    } finally {
      setSaving(false)
    }
  }
  function changeCard(id: string, text: string) {
    setCards((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, text, importProblem: undefined, normalized: false }
          : item,
      ),
    )
    setCorrected(true)
    setDirty(true)
    setExported(false)
  }
  return (
    <>
      {!editing && (
        <button
          ref={opener}
          className="button primary small"
          aria-haspopup="dialog"
          onClick={() => dialog.current?.showModal()}
        >
          + Create deck
        </button>
      )}
      <dialog
        ref={dialog}
        className="app-dialog deck-dialog"
        aria-labelledby={heading}
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
        onClose={() => {
          fileRead.current++
          setReading(false)
          setFileName('')
          setFormat('text')
          setCsvDelimiter(',')
          setCsvHeader(false)
          setCsvColumn(0)
          setTitleEdited(false)
          setStep('paste')
          setInput('')
          setTitle('')
          setCards([])
          setCorrected(false)
          setDelimiter('lines')
          setError('')
          setExported(false)
          opener.current?.focus({ preventScroll: true })
          editing?.onClose()
        }}
      >
        <div className="dialog-header">
          <h2 id={heading}>
            {isEditing
              ? step === 'paste'
                ? 'Replace deck cards'
                : 'Edit your deck'
              : step === 'paste'
                ? 'Create a deck'
                : 'Preview your deck'}
          </h2>
          <button
            className="icon-button"
            aria-label="Close deck creator"
            disabled={saving}
            onClick={close}
          >
            ×
          </button>
        </div>
        <div
          className="deck-content"
          inert={saving || reading}
          aria-busy={reading}
        >
          {step === 'paste' ? (
            <div className="paste-grid">
              <div className="paste-input">
                <input
                  ref={filePicker}
                  type="file"
                  hidden
                  aria-label="Word bank file"
                  accept=".txt,.csv,.json,text/plain,text/csv,application/json"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    event.currentTarget.value = ''
                    if (file) void chooseFile(file)
                  }}
                />
                <button
                  className="button secondary small"
                  onClick={() => filePicker.current?.click()}
                >
                  Import file (.txt, .csv, .json)
                </button>
                {fileName && (
                  <p className="deck-hint">
                    Loaded: <bdi>{fileName}</bdi>
                  </p>
                )}
                <label className="deck-field paste-field">
                  <span>Paste your words</span>
                  <textarea
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value)
                      setCsvColumn(0)
                      setError('')
                    }}
                    placeholder={'cat\ndog\nNew York'}
                    dir="auto"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-describedby={heading + '-paste-limits'}
                  />
                </label>
              </div>
              <div className="paste-options" tabIndex={0}>
                <label className="deck-field">
                  <span>Input format</span>
                  <select
                    value={format}
                    onChange={(event) => {
                      setFormat(event.target.value as ImportFormat)
                      setCsvColumn(0)
                      setError('')
                    }}
                  >
                    <option value="text">Plain text</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </label>
                {format === 'text' && (
                  <>
                    <label className="deck-field">
                      <span>Separate cards by</span>
                      <select
                        value={delimiter}
                        onChange={(event) =>
                          setDelimiter(event.target.value as TextDelimiter)
                        }
                      >
                        <option value="lines">Lines</option>
                        <option value="commas">Commas</option>
                        <option value="tabs">Tabs and line breaks</option>
                        <option value="whitespace">All whitespace</option>
                      </select>
                    </label>
                    <p className="deck-hint">
                      {delimiter === 'commas'
                        ? 'Use commas (, or ،) or line breaks. “New York” stays one card. To keep a comma inside a card, choose Lines. Quotes are treated as text.'
                        : delimiter === 'whitespace'
                          ? 'Every space, tab, or line break starts a card. “New York” becomes two cards.'
                          : delimiter === 'tabs'
                            ? 'Each tab or line break starts a card. Spaces inside phrases stay together.'
                            : 'One word or phrase per line. Spaces and commas inside a line stay together.'}
                    </p>
                  </>
                )}
                {format === 'csv' && (
                  <>
                    <label className="deck-field">
                      <span>Card column</span>
                      <select
                        value={csvColumn}
                        disabled={!csv?.table}
                        onChange={(event) =>
                          setCsvColumn(Number(event.target.value))
                        }
                      >
                        {Array.from(
                          { length: csv?.table?.columnCount ?? 1 },
                          (_, index) => {
                            const row = csv?.table?.rows[0]
                            const label = row?.[index]
                              ?.trim()
                              .replace(/[\r\n]/g, ' ')
                            return (
                              <option key={index} value={index}>
                                {'Column ' +
                                  (index + 1) +
                                  (label
                                    ? ' — ' + [...label].slice(0, 60).join('')
                                    : '')}
                              </option>
                            )
                          },
                        )}
                      </select>
                    </label>
                    <label className="csv-header-control">
                      <input
                        type="checkbox"
                        checked={csvHeader}
                        onChange={(event) => setCsvHeader(event.target.checked)}
                      />
                      First row is a header
                    </label>
                    <label className="deck-field">
                      <span>CSV separator</span>
                      <select
                        value={csvDelimiter}
                        onChange={(event) => {
                          setCsvDelimiter(event.target.value as CsvDelimiter)
                          setCsvColumn(0)
                          setError('')
                        }}
                      >
                        <option value=",">Comma</option>
                        <option value=";">Semicolon</option>
                        <option value={'\t'}>Tab</option>
                      </select>
                    </label>
                    <p className="deck-hint">
                      Only this column becomes cards. Quoted commas stay inside
                      a card.
                      {csvHeader
                        ? ' The first row will be skipped.'
                        : ' The first row will be included.'}
                    </p>
                    {csv?.error && <p className="field-error">{csv.error}</p>}
                  </>
                )}
                {format === 'json' && (
                  <p className="deck-hint">
                    Use a list like <code>["cat", "قِطَّة"]</code> or{' '}
                    <code>
                      {'{ "title": "Lesson 1", "words": ["cat", "قِطَّة"] }'}
                    </code>
                    . Each string becomes one card; spaces and commas stay
                    inside it.
                  </p>
                )}
                <p className="deck-hint" id={heading + '-paste-limits'}>
                  Up to 1 MiB of text, 2,000 cards, and 120 characters per card.
                </p>
                <p className="deck-hint">
                  Files are read on this device. Saved in this browser. No
                  account needed.
                </p>
              </div>
            </div>
          ) : (
            <div className="preview-grid">
              <div className="card-editor">
                <label className="deck-field">
                  <span>Deck name</span>
                  <input
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value)
                      setTitleEdited(true)
                      setDirty(true)
                      setExported(false)
                    }}
                    dir="auto"
                    aria-invalid={!!title && !!nameProblem}
                    aria-describedby={heading + '-name-help'}
                  />
                </label>
                <p className="deck-hint" id={heading + '-name-help'}>
                  {title && nameProblem
                    ? nameProblem
                    : 'Choose a name (up to 80 characters).'}
                </p>
                <p className="preview-summary" role="status">
                  {review.validCount} cards · {counts.emptyCount} empty entries
                  removed · {counts.duplicateCount} duplicates removed
                  {review.problems.size > 0 &&
                    ' · ' + review.problems.size + ' cards need correction'}
                  {counts.normalizedCount > 0 &&
                    ' · ' +
                      counts.normalizedCount +
                      ' entries had line breaks replaced with spaces'}
                  {review.duplicateIds.size > 0 &&
                    ' · ' +
                      review.duplicateIds.size +
                      ' edited duplicates will be removed on save'}
                </p>
                <ol className="draft-cards" aria-label="Preview cards">
                  {cards.map((card, index) => (
                    <li key={card.id}>
                      <span className="card-number">{index + 1}</span>
                      <div>
                        <input
                          id={heading + '-card-' + card.id}
                          aria-label={'Card ' + (index + 1)}
                          dir="auto"
                          value={card.text}
                          onFocus={() => setSelected(card.id)}
                          onChange={(event) =>
                            changeCard(card.id, event.target.value)
                          }
                          aria-invalid={review.problems.has(card.id)}
                          aria-describedby={heading + '-problem-' + card.id}
                        />
                        <small
                          id={heading + '-problem-' + card.id}
                          className={
                            review.problems.has(card.id)
                              ? 'field-error'
                              : 'deck-hint'
                          }
                        >
                          {review.problems.get(card.id) ??
                            (review.duplicateIds.has(card.id)
                              ? 'Duplicate — removed on save'
                              : 'Source entry ' +
                                card.source +
                                (card.normalized
                                  ? ' · Line breaks replaced with spaces'
                                  : ''))}
                        </small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={'Remove card ' + (index + 1)}
                        onClick={() => {
                          setCards((items) =>
                            items.filter((item) => item.id !== card.id),
                          )
                          setCorrected(true)
                          setDirty(true)
                          setExported(false)
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ol>
                {editing && (
                  <button
                    className="button secondary small"
                    disabled={cards.length >= deckLimits.cards}
                    onClick={() => {
                      const id = crypto.randomUUID()
                      newCard.current = id
                      setCards((items) => [
                        ...items,
                        { id, text: '', source: items.length + 1 },
                      ])
                      setCorrected(true)
                      setDirty(true)
                      setExported(false)
                    }}
                  >
                    Add card
                  </button>
                )}
                {cards.length === 0 && (
                  <p className="field-error">
                    {editing
                      ? 'No cards left. Add a card before saving.'
                      : 'No cards left. Go back to add more words.'}
                  </p>
                )}
              </div>
              <aside className="card-sample-panel" tabIndex={0}>
                {conflict && (
                  <div className="deck-conflict">
                    <p>
                      Your edits are still here. Reload the saved version, or
                      keep these words in a new deck.
                    </p>
                    <button
                      className="button secondary small"
                      disabled={saving}
                      onClick={() => void reloadSaved()}
                    >
                      Reload saved deck
                    </button>
                    <button
                      className="button secondary small"
                      disabled={!canSave}
                      onClick={() => void submit(true)}
                    >
                      Save as new deck
                    </button>
                  </div>
                )}
                <p className="deck-hint">
                  CARD PREVIEW · Select a word to see it here
                </p>
                <div className="card-sample">
                  <FittedPrompt
                    text={selectedCard?.text || 'Your card'}
                    hiddenFromReader={false}
                  />
                </div>
                <p className="deck-hint">
                  Short decks finish when every card has been played. Export
                  words to keep a backup; clearing browser data removes saved
                  decks.
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    try {
                      exportWords(title, review.words)
                      setExported(true)
                    } catch {
                      setError(
                        'Export could not start. Try again before closing your draft.',
                      )
                    }
                  }}
                  disabled={!cards.length || saving}
                >
                  Export words (.txt)
                </button>
                {editing && (
                  <div className="deck-management-actions">
                    <button
                      className="text-button"
                      onClick={() => {
                        setStep('paste')
                        setError('')
                      }}
                    >
                      Replace cards from text or file
                    </button>
                    <button
                      className="text-button danger-text"
                      disabled={saving}
                      onClick={() => void removeSaved()}
                    >
                      Delete deck
                    </button>
                  </div>
                )}
                {exported && (
                  <p className="deck-hint" role="status">
                    Words exported.
                  </p>
                )}
              </aside>
            </div>
          )}
        </div>
        <div className="deck-actions">
          {reading && (
            <p className="deck-hint" role="status">
              Reading file…
            </p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            {step === 'preview' ? (
              <>
                <button
                  className="button secondary"
                  disabled={saving}
                  onClick={() => {
                    if (isEditing) close()
                    else {
                      setStep('paste')
                      setError('')
                    }
                  }}
                >
                  {isEditing ? 'Cancel' : 'Back to text'}
                </button>
                <button
                  className="button primary"
                  disabled={!canSave || (isEditing && !dirty)}
                  onClick={() => void submit()}
                >
                  {saving
                    ? 'Saving…'
                    : isEditing
                      ? replacing
                        ? 'Save replacement'
                        : 'Save changes'
                      : 'Save deck & play'}
                </button>
              </>
            ) : (
              <>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (isEditing) {
                      if (
                        input.trim() &&
                        !window.confirm(
                          'Discard this replacement source and return to your deck?',
                        )
                      )
                        return
                      fileRead.current++
                      setReading(false)
                      setStep('preview')
                      setInput('')
                      setFileName('')
                      setError('')
                    } else close()
                  }}
                >
                  {isEditing ? 'Back to deck' : 'Cancel'}
                </button>
                <button
                  className="button primary"
                  onClick={preview}
                  disabled={reading}
                >
                  Preview cards
                </button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
