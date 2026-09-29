import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppSnapshot } from '../app/controller'
import type { GameController } from '../app/controller'
import type { CustomBank } from '../content/decks'
import { isCustomBank } from '../content/decks'
import { exportWords } from '../content/export'
import {
  createShareLink,
  readShareLink,
  receivedCopy,
  snapshotDeck,
} from './links'
import type { ReceivedDeck, SharedDeck } from './links'
import { makeQrImage } from './qr'
import type { ShareRequest } from './useSharing'

function Frame({
  title,
  busy,
  close,
  children,
  opener,
}: {
  title: string
  busy: boolean
  close: () => void
  opener?: HTMLElement
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const focusTarget = opener ?? (document.activeElement as HTMLElement | null)
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true })
    }
  }, [opener])
  return (
    <dialog
      ref={dialog}
      className="app-dialog share-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) close()
      }}
    >
      <div className="dialog-header">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close sharing"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </div>
      <div className="dialog-body share-body">{children}</div>
    </dialog>
  )
}
function Cards({ deck }: { deck: SharedDeck }) {
  return (
    <section className="shared-preview" aria-label="Deck preview">
      <h3 dir="auto" lang={deck.language}>
        {deck.title}
      </h3>
      <p>{deck.words.length} cards</p>
      <details>
        <summary>View all cards</summary>
        <ol className="shared-cards">
          {deck.words.map((word, index) => (
            <li key={index} dir="auto" lang={deck.language}>
              {word}
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}
function Export({ deck }: { deck: SharedDeck }) {
  return (
    <button
      className="button secondary"
      onClick={() => exportWords(deck.title, deck.words)}
    >
      Export words (.txt)
    </button>
  )
}
function Send({
  bank,
  close,
  opener,
}: {
  bank: CustomBank
  close: () => void
  opener?: HTMLElement
}) {
  const linkId = useId()
  const [deck] = useState(() => snapshotDeck(bank))
  const [link, setLink] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const qrImage = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (qr) qrImage.current?.scrollIntoView({ block: 'center' })
  }, [qr])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  async function generate() {
    setBusy(true)
    setError('')
    try {
      const next = await createShareLink(deck, location.href)
      const png = await makeQrImage(next)
      if (alive.current) {
        setLink(next)
        setQr(png)
      }
    } catch (problem) {
      if (alive.current) setError((problem as Error).message)
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      if (alive.current) setNotice('Link copied.')
    } catch {
      if (alive.current)
        setNotice('Select and copy the link below, or export the words.')
    }
  }
  async function share() {
    try {
      await navigator.share({ title: deck.title, url: link })
    } catch (problem) {
      if (alive.current)
        setNotice(
          (problem as Error).name === 'AbortError'
            ? 'Sharing cancelled. Your link is still ready.'
            : 'Sharing is unavailable here. Copy the link or export the words.',
        )
    }
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
  return (
    <Frame title="Share deck" busy={busy} close={close} opener={opener}>
      <Cards deck={deck} />
      <p>
        Anyone with this link can view and save these cards. It is a fixed copy:
        later edits stay on your device. Shared links cannot be recalled.
      </p>
      {local && (
        <p className="share-notice">
          For sharing between phones, open the published site first. This local
          preview address only works on this computer.
        </p>
      )}
      {location.hostname.endsWith('.trycloudflare.com') && (
        <p className="share-notice">
          This temporary preview address expires when the preview stops. Use the
          published site for lasting links.
        </p>
      )}
      {!link && (
        <button
          className="button primary"
          onClick={() => void generate()}
          disabled={busy}
        >
          {busy ? 'Creating link…' : 'Create share link'}
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {link && (
        <>
          {qr ? (
            <div className="qr-panel">
              <img
                ref={qrImage}
                src={qr}
                width="512"
                height="512"
                alt={'QR code for ' + deck.title}
              />
              <p>Scan with your phone’s camera.</p>
            </div>
          ) : (
            <p className="share-notice">
              A QR code is unavailable for this list. Copy the link, or export
              the words to send as a file.
            </p>
          )}
          <div className="share-actions">
            <button className="button primary" onClick={() => void copy()}>
              Copy link
            </button>
            {typeof navigator.share === 'function' && (
              <button className="button secondary" onClick={() => void share()}>
                Share link
              </button>
            )}
            {qr && (
              <a
                className="button secondary"
                href={qr}
                download="heads-up-deck-qr.png"
              >
                Download QR
              </a>
            )}
          </div>
          <div className="share-link-field">
            <label htmlFor={linkId}>Deck link</label>
            <textarea
              id={linkId}
              readOnly
              value={link}
              dir="ltr"
              onFocus={(event) => event.target.select()}
            />
          </div>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      <Export deck={deck} />
      <p className="fine-print">
        No account needed. The cards travel inside the link. For a large list,
        send the exported file and import it with Create deck.
      </p>
    </Frame>
  )
}
function Receive({
  initialLink,
  opener,
  controller,
  state,
  close,
}: {
  initialLink?: string
  opener?: HTMLElement
  controller: GameController
  state: AppSnapshot
  close: () => void
}) {
  const inputId = useId()
  const [input, setInput] = useState(initialLink ?? '')
  const [received, setReceived] = useState<ReceivedDeck | null>(null)
  const [reading, setReading] = useState(Boolean(initialLink))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef({ value: 0 })
  useEffect(() => {
    const sequence = generation.current
    if (!initialLink)
      return () => {
        sequence.value++
      }
    const attempt = ++sequence.value
    readShareLink(initialLink)
      .then((value) => {
        if (attempt === sequence.value) setReceived(value)
      })
      .catch((problem) => {
        if (attempt === sequence.value) setError((problem as Error).message)
      })
      .finally(() => {
        if (attempt === sequence.value) setReading(false)
      })
    return () => {
      sequence.value++
    }
  }, [initialLink])
  async function preview() {
    const attempt = ++generation.current.value
    setReading(true)
    setError('')
    setReceived(null)
    try {
      const value = await readShareLink(input)
      if (attempt === generation.current.value) setReceived(value)
    } catch (problem) {
      if (attempt === generation.current.value)
        setError((problem as Error).message)
    } finally {
      if (attempt === generation.current.value) setReading(false)
    }
  }
  async function save() {
    if (!received) return
    setSaving(true)
    setError('')
    try {
      await controller.saveBank(receivedCopy(received))
      close()
    } catch (problem) {
      setError((problem as Error).message)
      setSaving(false)
    }
  }
  const prior =
    received &&
    state.banks.find(
      (bank) => isCustomBank(bank) && bank.sharedFrom === received.fingerprint,
    )
  return (
    <Frame title="Open shared deck" busy={saving} close={close} opener={opener}>
      {!received && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void preview()
          }}
        >
          <div className="share-link-field">
            <label htmlFor={inputId}>Paste deck link</label>
            <textarea
              id={inputId}
              value={input}
              disabled={reading}
              dir="ltr"
              onChange={(event) => setInput(event.target.value)}
            />
          </div>
          <button
            className="button primary"
            disabled={reading || !input.trim()}
            type="submit"
          >
            {reading ? 'Reading deck…' : 'Preview shared deck'}
          </button>
        </form>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {received && (
        <>
          <Cards deck={received.deck} />
          <p>
            Save your own copy to play or edit. Changes stay on your device.
          </p>
          {prior && (
            <p className="share-notice">
              You already saved a copy of this shared deck. Your edits are kept
              when you open it.
            </p>
          )}
          {state.libraryStatus === 'loading' && (
            <p role="status">Checking saved decks…</p>
          )}
          <div className="share-actions">
            {prior && (
              <button
                className="button primary"
                disabled={saving}
                onClick={() => {
                  controller.chooseBank(prior.id)
                  close()
                }}
              >
                Open saved copy
              </button>
            )}
            <button
              className={'button ' + (prior ? 'secondary' : 'primary')}
              disabled={saving || state.libraryStatus === 'loading'}
              onClick={() => void save()}
            >
              {saving
                ? 'Saving…'
                : prior
                  ? 'Save another copy'
                  : 'Save a copy & play'}
            </button>
            <Export deck={received.deck} />
          </div>
        </>
      )}
    </Frame>
  )
}
export function SharingDialog({
  request,
  controller,
  state,
  close,
}: {
  request: ShareRequest
  controller: GameController
  state: AppSnapshot
  close: () => void
}) {
  return request.kind === 'send' ? (
    <Send bank={request.bank} close={close} opener={request.opener} />
  ) : (
    <Receive
      initialLink={request.link}
      opener={request.opener}
      controller={controller}
      state={state}
      close={close}
    />
  )
}
