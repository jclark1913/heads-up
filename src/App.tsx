import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { GameController } from './app/controller'
import type { AppSnapshot, MotionStatus } from './app/controller'
import { isCustomBank } from './content/decks'
import type { CustomBank } from './content/decks'
import { DeckCreator } from './DeckCreator'
import { SharingDialog } from './sharing/SharingDialog'
import { useSharing } from './sharing/useSharing'
import { FittedPrompt } from './FittedPrompt'
import { remaining } from './game/engine'
import { stageLayout } from './platform/layout'

type IconName =
  | 'arrow'
  | 'check'
  | 'down'
  | 'up'
  | 'pause'
  | 'settings'
  | 'close'
  | 'download'
  | 'sound'
  | 'spark'
const paths: Record<IconName, ReactNode> = {
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  down: <path d="M12 4v16m-6-6 6 6 6-6" />,
  up: <path d="M12 20V4m-6 6 6-6 6 6" />,
  pause: <path d="M8 5v14M16 5v14" />,
  settings: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="3" />
      <circle cx="15" cy="17" r="3" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />,
  sound: <path d="m4 9 4 0 5-4v14l-5-4H4zM17 8q5 4 0 8" />,
  spark: <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />,
}
function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        h<span>u</span>
        <i />
      </span>
      <span>
        heads up<span className="brand-dot">.</span>
      </span>
    </div>
  )
}
function PhoneSketch() {
  return (
    <div className="phone-scene" aria-hidden="true">
      <span className="little-star star-one">✳</span>
      <span className="little-star star-two">✳</span>
      <div className="floating-note">Your friends do the clues.</div>
      <div className="illustrated-phone">
        <span className="phone-camera" />
        <span className="phone-time">:42</span>
        <span className="phone-word">Penguin</span>
        <span className="phone-sub">THE ANIMAL KINGDOM</span>
      </div>
      <div className="sketch-arrow">
        <svg viewBox="0 0 140 55">
          <path d="M4 7q72 72 124 4m-2 0-18 8m18-8 1 21" />
        </svg>
        <span>You do the guessing.</span>
      </div>
      <div className="tilt-tag correct-tag">
        <Icon name="down" size={18} /> Got it!
      </div>
      <div className="tilt-tag pass-tag">
        <Icon name="up" size={18} /> Pass
      </div>
    </div>
  )
}
function InstallHelp() {
  return (
    <details className="help-details">
      <summary>Add to your Home Screen</summary>
      <p>
        <strong>iPhone:</strong> open in Safari, tap Share, then Add to Home
        Screen.
      </p>
      <p>
        <strong>Android:</strong> open Chrome’s menu, then Install app or Add to
        Home screen.
      </p>
      <p>
        This first test build needs an internet connection. Use the same link
        and check the build number when reporting a test.
      </p>
    </details>
  )
}
function Diagnostics({
  controller,
  state,
}: {
  controller: GameController
  state: AppSnapshot
}) {
  const [message, setMessage] = useState('')
  function download() {
    const url = URL.createObjectURL(
      new Blob([controller.report()], { type: 'application/json' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download =
      'heads-up-trial-' +
      new Date().toISOString().replace(/[:.]/g, '-') +
      '.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage(
      'Report downloaded. Add what you intended to do and what happened.',
    )
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(controller.report())
      setMessage('Report copied.')
    } catch {
      setMessage('Copy is unavailable here. Download the report instead.')
    }
  }
  return (
    <details className="help-details diagnostics">
      <summary>Device testing & diagnostics</summary>
      <label className="setting">
        <span>
          <strong>Record a local sensor trace</strong>
          <small>For this visit only. Nothing is uploaded.</small>
        </span>
        <input
          type="checkbox"
          checked={state.diagnostics}
          onChange={(e) => controller.setDiagnostics(e.target.checked)}
        />
      </label>
      <dl className="diagnostic-values">
        <div>
          <dt>Movement</dt>
          <dd>{state.motion}</dd>
        </div>
        <div>
          <dt>Detector</dt>
          <dd>{state.detector.state}</dd>
        </div>
        <div>
          <dt>Tilt</dt>
          <dd>
            {state.detector.elevation === null
              ? '—'
              : state.detector.elevation.toFixed(1) + '°'}
          </dd>
        </div>
        <div>
          <dt>Trace entries</dt>
          <dd>{state.traceCount}</dd>
        </div>
        <div>
          <dt>Screen awake</dt>
          <dd>{state.wakeStatus}</dd>
        </div>
      </dl>
      <p>{state.detector.reason}</p>
      <div className="button-row">
        <button className="button secondary small" onClick={download}>
          <Icon name="download" size={17} /> Download report
        </button>
        <button className="text-button" onClick={() => void copy()}>
          Copy report
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <p className="fine-print">
        Record your phone/OS, rotation lock, intended flips, misses, double
        counts, and comfort alongside this report. A sensor trace cannot tell us
        which gesture you intended.
      </p>
    </details>
  )
}
function Settings({
  controller,
  state,
}: {
  controller: GameController
  state: AppSnapshot
}) {
  return (
    <section className="settings-panel" aria-label="Game settings">
      <label className="setting">
        <span>
          <strong>Round length</strong>
          <small>
            {state.scene === 'game'
              ? 'Choose the length between rounds.'
              : 'Time starts when the first card appears.'}
          </small>
        </span>
        <select
          value={state.durationSeconds}
          disabled={state.scene === 'game'}
          onChange={(event) =>
            controller.setDuration(Number(event.target.value))
          }
        >
          <option value={30}>30 seconds</option>
          <option value={60}>60 seconds</option>
          <option value={90}>90 seconds</option>
        </select>
      </label>
      <label className="setting">
        <span>
          <strong>Use buttons instead of motion</strong>
          <small>A friend taps Correct or Pass. Works in portrait, too.</small>
        </span>
        <input
          type="checkbox"
          checked={state.mode === 'manual'}
          onChange={(e) =>
            controller.setMode(e.target.checked ? 'manual' : 'motion')
          }
        />
      </label>
      <label className="setting">
        <span>
          <strong>Sound cues</strong>
          <small>A little feedback for every answer.</small>
        </span>
        <input
          type="checkbox"
          checked={state.sound}
          onChange={(e) => controller.setSound(e.target.checked)}
        />
      </label>
      <button className="text-button" onClick={controller.testSound}>
        <Icon name="sound" size={18} /> Test sound
      </button>
      {state.storageNotice && (
        <p className="fine-print" role="status">
          {state.storageNotice}
        </p>
      )}
    </section>
  )
}
function Footer() {
  return (
    <footer className="site-footer">
      <span>Made for good company.</span>
      <span className="build-id">Test build {__BUILD_ID__}</span>
    </footer>
  )
}
function HowTo() {
  return (
    <section className="how-to" aria-label="How to play">
      <div>
        <span className="step-number">01</span>
        <p>
          <strong>Phone up.</strong>
          <br />
          Screen out, at your forehead.
        </p>
      </div>
      <div>
        <span className="step-number">02</span>
        <p>
          <strong>Friends give clues.</strong>
          <br />
          Act it out. Talk it through.
        </p>
      </div>
      <div>
        <span className="step-number">03</span>
        <p>
          <strong>Take your best guess.</strong>
          <br />
          Tilt down for correct. Up to pass.
        </p>
      </div>
    </section>
  )
}
function ScreenTools({
  controller,
  state,
}: {
  controller: GameController
  state: AppSnapshot
}) {
  const [panel, setPanel] = useState<'settings' | 'help' | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (panel && !element.open) element.showModal()
    else if (!panel && element.open) element.close()
  }, [panel])
  return (
    <div className="screen-tools">
      <button
        className="tool-button"
        aria-haspopup="dialog"
        aria-label="How to play"
        onClick={(event) => {
          opener.current = event.currentTarget
          setPanel('help')
        }}
      >
        Help
      </button>
      <button
        className="icon-button"
        aria-label="Game settings"
        aria-haspopup="dialog"
        onClick={(event) => {
          opener.current = event.currentTarget
          setPanel('settings')
        }}
      >
        <Icon name="settings" />
      </button>
      <dialog
        ref={dialog}
        className="app-dialog"
        aria-labelledby={titleId}
        onClose={() => {
          setPanel(null)
          opener.current?.focus({ preventScroll: true })
        }}
      >
        <div className="dialog-header">
          <h2 id={titleId}>
            {panel === 'settings' ? 'Game settings' : 'How to play'}
          </h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => setPanel(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="dialog-body">
          {panel === 'settings' ? (
            <Settings controller={controller} state={state} />
          ) : (
            <>
              <HowTo />
              <InstallHelp />
              <Diagnostics controller={controller} state={state} />
              <Footer />
            </>
          )}
        </div>
      </dialog>
    </div>
  )
}
function Home({
  controller,
  state,
  share,
  openLink,
}: {
  controller: GameController
  state: AppSnapshot
  share: (bank: CustomBank, opener: HTMLElement) => void
  openLink: (opener: HTMLElement) => void
}) {
  const [collection, setCollection] = useState(
    () =>
      state.banks.find((bank) => bank.id === state.bankId)?.source ?? 'builtin',
  )
  const [managed, setManaged] = useState<CustomBank | null>(null)
  const managerOpener = useRef<HTMLButtonElement | null>(null)
  const collectionButton = useRef<HTMLButtonElement>(null)
  const visibleBanks = state.banks.filter((bank) => bank.source === collection)
  return (
    <div className="page-shell home-shell">
      <header className="site-header">
        <Brand />
        <ScreenTools controller={controller} state={state} />
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> THE FOREHEAD GUESSING GAME
            </p>
            <h1>
              Good company.
              <br />
              <em>Wild guesses.</em>
            </h1>
            <p className="intro">
              A phone on your forehead. A room full of clues.
              <br className="desktop-break" /> How many can you guess before
              time runs out?
            </p>
            <div className="hero-facts">
              <span>{state.durationSeconds} seconds</span>
              <span>2+ players</span>
              <span>Endless bad impressions</span>
            </div>
          </div>
          <PhoneSketch />
        </section>
        <section className="bank-section" aria-labelledby="choose-deck">
          <div className="section-heading">
            <h2 id="choose-deck">Pick your cards</h2>
            <DeckCreator save={controller.saveBank} />
          </div>
          <div
            className="library-switch"
            role="group"
            aria-label="Library navigation"
          >
            <button
              className="tool-button"
              aria-pressed={collection === 'builtin'}
              onClick={() => setCollection('builtin')}
            >
              Starter decks
            </button>
            <button
              className="tool-button"
              ref={collectionButton}
              aria-pressed={collection === 'custom'}
              onClick={() => setCollection('custom')}
            >
              My decks (
              {state.banks.filter((bank) => bank.source === 'custom').length})
            </button>
            <button
              className="tool-button"
              onClick={(event) => openLink(event.currentTarget)}
            >
              Open deck link
            </button>
            {state.latestResult && (
              <button
                className="tool-button latest-result-button"
                onClick={controller.viewLatestResult}
              >
                View latest result
              </button>
            )}
          </div>
          {state.resultNotice && (
            <p className="library-notice" role="status">
              {state.resultNotice}
            </p>
          )}
          {collection === 'custom' && state.libraryStatus === 'loading' && (
            <p className="library-notice" role="status">
              Loading saved decks…
            </p>
          )}
          {state.libraryNotice && (
            <p className="library-notice" role="status">
              {state.libraryNotice}{' '}
              <button
                className="text-button"
                disabled={state.libraryStatus === 'loading'}
                onClick={() => void controller.loadLibrary()}
              >
                Retry
              </button>
            </p>
          )}
          <div className="bank-grid">
            {visibleBanks.length === 0 && state.libraryStatus !== 'loading' && (
              <p className="empty-library">
                Your words belong here. Create a deck from text or a file to get
                started.
              </p>
            )}
            {visibleBanks.map((bank) => (
              <div className="bank-tile" key={bank.id}>
                <button
                  className={'bank-card ' + (bank.language ?? 'custom')}
                  onClick={() => controller.chooseBank(bank.id)}
                >
                  <div className="bank-top">
                    <span className="language-label">
                      {bank.source === 'custom'
                        ? 'MY DECK'
                        : bank.language === 'en'
                          ? 'ENGLISH'
                          : 'ARABIC · العربية'}
                    </span>
                    <span className="bank-doodle" aria-hidden="true">
                      {bank.language === 'ar' ? 'ا ب' : '✳'}
                    </span>
                  </div>
                  <div>
                    <h3 dir="auto" lang={bank.language}>
                      {bank.title}
                    </h3>
                    <p>{bank.description}</p>
                  </div>
                  <div className="bank-bottom">
                    <span>
                      {bank.prompts.length} cards <span>·</span>{' '}
                      {bank.source === 'custom'
                        ? 'On this device'
                        : 'Test deck'}
                    </span>
                    <span className="round-arrow">
                      <Icon name="arrow" />
                    </span>
                  </div>
                </button>
                {isCustomBank(bank) && (
                  <div className="bank-actions">
                    <button
                      className="button secondary small manage-deck"
                      aria-label={'Manage ' + bank.title}
                      onClick={(event) => {
                        managerOpener.current = event.currentTarget
                        setManaged(structuredClone(bank))
                      }}
                    >
                      Manage deck
                    </button>
                    <button
                      className="button secondary small"
                      aria-label={'Share ' + bank.title}
                      onClick={(event) =>
                        share(structuredClone(bank), event.currentTarget)
                      }
                    >
                      Share deck
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {managed && (
            <DeckCreator
              key={managed.id}
              save={controller.saveBank}
              editing={{
                bank: managed,
                update: controller.updateBank,
                remove: controller.deleteBank,
                reload: controller.reloadBank,
                onClose: () => {
                  setManaged(null)
                  const target = managerOpener.current?.isConnected
                    ? managerOpener.current
                    : collectionButton.current
                  target?.focus({ preventScroll: true })
                },
              }}
            />
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
const motionMessages: Record<MotionStatus, string> = {
  idle: 'Enable movement to try a couple of practice tilts.',
  checking: 'Allow movement if asked, then hold the phone upright.',
  ready: 'Movement connected. Try a down tilt and an up tilt.',
  denied:
    'Movement permission was not granted. Retry when ready, or enable buttons.',
  unavailable:
    'No usable movement readings arrived. Retry on your phone, or enable buttons.',
  'insecure-context':
    'Movement needs the HTTPS test link. Open that link on your phone, or enable buttons.',
}
function RotationHelp() {
  return (
    <div className="notice">
      <strong>Hold your phone sideways.</strong>
      <p>
        If the screen will not rotate, turn off Portrait Orientation Lock on
        iPhone, or enable Auto-rotate on Android, then try again.
      </p>
    </div>
  )
}
function Setup({
  controller,
  state,
}: {
  controller: GameController
  state: AppSnapshot
}) {
  const bank = state.banks.find((item) => item.id === state.bankId)!
  const motion = state.mode === 'motion'
  const failed = ['denied', 'unavailable', 'insecure-context'].includes(
    state.motion,
  )
  const canStart = !motion || (state.motion === 'ready' && state.view.landscape)
  const awaiting = state.detector.state === 'awaiting-neutral'
  return (
    <div className="page-shell setup-shell">
      <header className="site-header">
        <Brand />
        <div className="header-actions">
          <button className="tool-button" onClick={controller.backToBanks}>
            ← All decks
          </button>
          <ScreenTools controller={controller} state={state} />
        </div>
      </header>
      <main className="setup-main">
        <div className="setup-heading">
          <p className="eyebrow">LET’S GET YOU READY</p>
          <h1 dir="auto" lang={bank.language}>
            {bank.title}
          </h1>
          <p>
            {bank.prompts.length} cards · {state.durationSeconds} seconds
          </p>
        </div>
        <div className="setup-grid">
          <section
            className="practice-card"
            aria-label="Controls and practice"
            tabIndex={0}
          >
            <span className="pill">
              {motion ? 'TILT TO PLAY' : 'BUTTONS ARE ON'}
            </span>
            <h2>
              {motion ? 'A little practice?' : 'Let a friend take control.'}
            </h2>
            <p className="practice-intro">
              {motion
                ? 'Hold sideways, screen facing friends. Return upright between tilts.'
                : 'A friend taps the answers while you guess. No movement permission needed.'}
            </p>
            <div className="gesture-pair">
              <div>
                <span className="gesture-icon">
                  <Icon name="down" size={28} />
                </span>
                <strong>{motion ? 'Tilt down' : 'Correct'}</strong>
                <small>Got it right</small>
              </div>
              <div>
                <span className="gesture-icon">
                  <Icon name="up" size={28} />
                </span>
                <strong>{motion ? 'Tilt up' : 'Pass'}</strong>
                <small>Try the next one</small>
              </div>
            </div>
            {motion && (
              <>
                <p
                  className={'movement-status ' + (failed ? 'failed' : '')}
                  role="status"
                >
                  <span className={'status-dot ' + state.motion} />
                  {motionMessages[state.motion]}
                </p>
                {state.motion === 'ready' && (
                  <div className="practice-feedback" aria-live="polite">
                    <strong>
                      {awaiting && state.practice.last
                        ? state.practice.last === 'correct'
                          ? 'Correct! ↓'
                          : 'Pass! ↑'
                        : state.detector.neutral === null
                          ? 'Hold upright and steady…'
                          : 'Ready for a tilt'}
                    </strong>
                    <span>
                      {awaiting
                        ? 'Return to upright before the next one.'
                        : state.detector.reason}
                    </span>
                    <small>
                      {state.practice.correct} correct · {state.practice.passed}{' '}
                      passed in practice
                    </small>
                  </div>
                )}
                {state.motion !== 'ready' && (
                  <button
                    className="button secondary"
                    disabled={state.motion === 'checking'}
                    onClick={() => void controller.requestMotion()}
                  >
                    {state.motion === 'checking'
                      ? 'Waiting for movement…'
                      : failed
                        ? 'Retry movement'
                        : 'Enable movement'}
                  </button>
                )}
                {failed && (
                  <button
                    className="text-button"
                    onClick={() => controller.setMode('manual')}
                  >
                    Enable buttons
                  </button>
                )}
              </>
            )}
          </section>
          <section className="ready-card">
            <div tabIndex={0}>
              <p className="eyebrow">WHEN YOU’RE READY</p>
              <h2>
                <span>Forehead.</span> <span>Friends.</span> <em>Go.</em>
              </h2>
              <p>You’ll get a three-second countdown to get into position.</p>
              <span className="fine-print">
                {motion
                  ? 'Return upright after each answer to reveal the next card.'
                  : 'Buttons stay on until you turn them off in settings.'}
              </span>
            </div>
            {motion && !state.view.landscape && <RotationHelp />}
            <button
              className="button primary"
              disabled={!canStart}
              onClick={controller.start}
            >
              Start round <Icon name="arrow" />
            </button>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
function Interrupted({
  controller,
  state,
}: {
  controller: GameController
  state: AppSnapshot
}) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="page-shell pause-shell">
      <header className="site-header">
        <Brand />
      </header>
      <main className="pause-card">
        <span className="pause-symbol">
          <Icon name="pause" size={34} />
        </span>
        <p className="eyebrow">CATCH YOUR BREATH</p>
        <h1>Time out.</h1>
        <p>{state.round!.reason}</p>
        <p className="paused-time">
          {Math.ceil(state.round!.remainingMs / 1000)} seconds left ·{' '}
          {state.round!.answers.filter((a) => a.outcome === 'correct').length}{' '}
          correct
        </p>
        {state.mode === 'motion' && !state.view.landscape && <RotationHelp />}
        <button
          className="button primary"
          disabled={state.mode === 'motion' && !state.view.landscape}
          onClick={controller.resume}
        >
          Resume with countdown <Icon name="arrow" />
        </button>
        {state.mode === 'motion' && (
          <button
            className="button secondary"
            onClick={() => controller.setMode('manual')}
          >
            Enable buttons
          </button>
        )}
        <details className="help-details">
          <summary>Sound & controls</summary>
          <Settings controller={controller} state={state} />
        </details>
        {!confirm ? (
          <button className="text-button" onClick={() => setConfirm(true)}>
            End this round
          </button>
        ) : (
          <div className="notice">
            <p>End now and keep your answers?</p>
            <div className="button-row">
              <button
                className="button secondary small"
                onClick={controller.end}
              >
                End round
              </button>
              <button className="text-button" onClick={() => setConfirm(false)}>
                Keep playing
              </button>
            </div>
          </div>
        )}
        <Diagnostics controller={controller} state={state} />
      </main>
      <Footer />
    </div>
  )
}
function Game({
  controller,
  state,
}: {
  controller: GameController
  state: AppSnapshot
}) {
  const round = state.round!
  const bank = state.roundBank!
  if (round.phase === 'interrupted')
    return <Interrupted controller={controller} state={state} />
  const layout = stageLayout(state.view, state.lockedAngle)
  const style: CSSProperties = {
    width: layout.width,
    height: layout.height,
    transform: 'translate(-50%, -50%) rotate(' + layout.rotation + 'deg)',
  }
  const seconds = Math.ceil(remaining(round, state.now) / 1000)
  const preparing = round.phase === 'preparing'
  const feedback = round.phase === 'feedback'
  const count = Math.max(
    0,
    Math.ceil((round.prepareUntil - state.now.mono) / 1000),
  )
  return (
    <main
      className={
        'game-stage ' +
        (feedback ? round.lastAnswer : preparing ? 'preparing' : 'playing')
      }
      style={style}
    >
      <div className="game-top">
        <span className="game-deck">
          <bdi>{bank.title}</bdi>
        </span>
        <span
          className={
            'game-timer ' + (seconds <= 10 && !preparing ? 'urgent' : '')
          }
          role="timer"
          aria-label={seconds + ' seconds remaining'}
        >
          {preparing ? (
            'GET READY'
          ) : (
            <>
              {seconds}
              <small>sec</small>
            </>
          )}
        </span>
        <button
          className="icon-button"
          aria-label="Pause round"
          onClick={() => controller.pause()}
        >
          <Icon name="pause" />
        </button>
      </div>
      <div className="game-center">
        {preparing ? (
          <div className="prepare-content">
            <span className="countdown" aria-live="polite">
              {count > 0 ? count : 'Ready?'}
            </span>
            <h1>
              {state.mode === 'motion'
                ? 'At your forehead. Screen out.'
                : 'Get ready to guess.'}
            </h1>
            <p>
              {state.mode === 'motion'
                ? state.detector.isNeutral
                  ? ''
                  : 'Hold the phone upright and steady.'
                : 'Your friend is in charge of the buttons.'}
            </p>
          </div>
        ) : feedback ? (
          <div className="answer-feedback" role="status">
            <Icon
              name={round.lastAnswer === 'correct' ? 'check' : 'up'}
              size={72}
            />
            <h1>{round.lastAnswer === 'correct' ? 'Got it!' : 'Next one!'}</h1>
            <p>
              {state.mode === 'motion'
                ? 'Return to upright'
                : 'Here comes your next card…'}
            </p>
          </div>
        ) : (
          <>
            <FittedPrompt
              text={round.prompts[round.index].text}
              language={bank.language}
              hiddenFromReader={state.mode === 'motion'}
            />
            {state.mode === 'motion' && (
              <span className="sr-only">
                A card is showing to your friends.
              </span>
            )}
          </>
        )}
      </div>
      <div className="game-bottom">
        {state.mode === 'manual' && !preparing ? (
          <div className="manual-buttons">
            <button
              className="button pass-button"
              disabled={feedback}
              onClick={() => controller.answer('passed')}
            >
              <Icon name="up" /> Pass
            </button>
            <button
              className="button correct-button"
              disabled={feedback}
              onClick={() => controller.answer('correct')}
            >
              <Icon name="check" /> Correct
            </button>
          </div>
        ) : (
          <>
            <span>
              <Icon name="down" size={18} /> CORRECT
            </span>
            <span>
              {preparing
                ? round.durationMs / 1000 + ' seconds of good guesses'
                : round.answers.filter((item) => item.outcome === 'correct')
                    .length + ' correct'}
            </span>
            <span>
              PASS <Icon name="up" size={18} />
            </span>
          </>
        )}
      </div>
    </main>
  )
}
function Results({
  controller,
  state,
}: {
  controller: GameController
  state: AppSnapshot
}) {
  const result = state.latestResult!
  const correct = result.answers.filter(
    (answer) => answer.outcome === 'correct',
  ).length
  const passed = result.answers.filter(
    (answer) => answer.outcome === 'passed',
  ).length
  const bank = result.deck
  const elapsedSeconds = Math.ceil(result.elapsedActiveMs / 1000)
  const source = state.banks.find((item) => item.id === bank.id)
  return (
    <div className="page-shell results-shell">
      <header className="site-header">
        <Brand />
        <span className="pill">
          {result.finishReason === 'ended-by-user'
            ? 'ROUND ENDED EARLY'
            : result.finishReason === 'deck-exhausted'
              ? 'ALL CARDS PLAYED'
              : 'TIME’S UP'}
        </span>
      </header>
      <main>
        <section className="results-hero">
          <p className="eyebrow">THAT WAS A GOOD ONE</p>
          <h1>Nice guessing.</h1>
          <div className="score-number">
            {correct}
            <span>{correct === 1 ? 'correct guess' : 'correct guesses'}</span>
            <Icon name="spark" size={48} />
          </div>
          <p>
            {passed} passed
            {result.answers.some((answer) => answer.outcome === 'unanswered')
              ? ' · 1 unanswered'
              : ''}{' '}
            · {result.answers.length}{' '}
            {result.answers.length === 1 ? 'card' : 'cards'} shown
          </p>
          <p className="result-details">
            {result.durationSeconds}-second round · {elapsedSeconds}{' '}
            {elapsedSeconds === 1 ? 'second' : 'seconds'} played
            {result.finishReason === 'ended-by-user' ? ' · Incomplete' : ''}
          </p>
          <p className="result-details">
            <time dateTime={result.finishedAt}>
              {new Date(result.finishedAt).toLocaleString()}
            </time>
          </p>
          {state.resultNotice && (
            <p className="result-save-notice" role="status">
              {state.resultNotice}
            </p>
          )}
          {!source && state.libraryStatus !== 'loading' && (
            <p>The source deck is unavailable. Your round is still here.</p>
          )}
          {source && source.version !== bank.version && (
            <p>This deck has changed. Play again uses its current cards.</p>
          )}
          <div className="button-row">
            {source && (
              <button className="button primary" onClick={controller.replay}>
                Play again <Icon name="arrow" />
              </button>
            )}
            <button className="button secondary" onClick={controller.home}>
              {source ? 'Change deck' : 'Back to decks'}
            </button>
          </div>
        </section>
        <section className="results-list" aria-labelledby="round-recap">
          <div className="section-heading">
            <h2 id="round-recap">Your round</h2>
            <span lang={bank.language} dir="auto">
              {bank.title}
            </span>
          </div>
          <ol>
            {result.answers.map((answer) => (
              <li key={answer.id}>
                <span dir="auto" lang={bank.language}>
                  {answer.text}
                </span>
                <span className={'outcome ' + answer.outcome}>
                  {answer.outcome === 'correct' ? (
                    <>
                      <Icon name="check" size={16} /> Correct
                    </>
                  ) : answer.outcome === 'passed' ? (
                    'Passed'
                  ) : (
                    'Unanswered'
                  )}
                </span>
              </li>
            ))}
          </ol>
          {result.answers.length === 0 && (
            <p>No cards were answered this time. Ready for another go?</p>
          )}
        </section>
        <Diagnostics controller={controller} state={state} />
      </main>
      <Footer />
    </div>
  )
}
export function App({ instance }: { instance?: GameController }) {
  const [controller] = useState(() => instance ?? new GameController())
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  )
  const sharing = useSharing(state.scene)
  useEffect(() => controller.connect(), [controller])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest('input, textarea, select, [contenteditable="true"]')
      )
        return
      if (
        state.scene === 'game' &&
        state.round?.phase === 'playing' &&
        state.mode === 'manual' &&
        ['ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        event.preventDefault()
        controller.answer(event.key === 'ArrowRight' ? 'correct' : 'passed')
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [controller, state.scene, state.round?.phase, state.mode])
  const screen =
    state.scene === 'setup' ? (
      <Setup controller={controller} state={state} />
    ) : state.scene === 'game' ? (
      <Game controller={controller} state={state} />
    ) : state.scene === 'results' ? (
      <Results controller={controller} state={state} />
    ) : (
      <Home
        controller={controller}
        state={state}
        share={(bank, opener) =>
          sharing.setRequest({ kind: 'send', bank, opener })
        }
        openLink={(opener) => sharing.setRequest({ kind: 'receive', opener })}
      />
    )
  return (
    <>
      {screen}
      {sharing.request && (
        <SharingDialog
          request={sharing.request}
          controller={controller}
          state={state}
          close={() => sharing.setRequest(null)}
        />
      )}
    </>
  )
}
