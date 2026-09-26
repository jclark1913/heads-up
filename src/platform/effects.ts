export class GameEffects {
  private audio: AudioContext | null = null
  private wake: WakeLockSentinel | null = null
  private wakeDesired = false
  private wakePending = false
  private wakeAttempted = false
  wakeStatus = 'Not requested'
  audioStatus = 'Tap to enable sound'
  sound = true

  unlockAudio() {
    if (!this.sound) return
    try {
      this.audio ??= new AudioContext()
      void this.audio
        .resume()
        .then(() => {
          this.audioStatus = 'Ready'
        })
        .catch(() => {
          this.audioStatus = 'Sound unavailable'
        })
    } catch {
      this.audioStatus = 'Sound unavailable'
    }
  }
  cue(kind: 'start' | 'correct' | 'passed' | 'end') {
    if (!this.sound || !this.audio || this.audio.state !== 'running') return
    try {
      const oscillator = this.audio.createOscillator()
      const gain = this.audio.createGain()
      oscillator.connect(gain)
      gain.connect(this.audio.destination)
      oscillator.type = 'sine'
      const frequencies = { start: 660, correct: 880, passed: 330, end: 440 }
      const now = this.audio.currentTime
      oscillator.frequency.setValueAtTime(frequencies[kind], now)
      oscillator.frequency.exponentialRampToValueAtTime(
        frequencies[kind] * (kind === 'passed' ? 0.7 : 1.25),
        now + 0.16,
      )
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      oscillator.start(now)
      oscillator.stop(now + 0.24)
    } catch {
      this.audioStatus = 'Sound unavailable'
    }
  }
  async keepAwake(wanted: boolean) {
    if (!wanted) {
      this.wakeDesired = false
      this.wakeAttempted = false
      const lock = this.wake
      this.wake = null
      if (lock) {
        try {
          await lock.release()
        } catch {
          /* Optional capability. */
        }
      }
      return
    }
    this.wakeDesired = true
    if (this.wake || this.wakePending || this.wakeAttempted) return
    this.wakeAttempted = true
    if (!('wakeLock' in navigator)) {
      this.wakeStatus = 'Not supported'
      return
    }
    this.wakePending = true
    try {
      const lock = await navigator.wakeLock.request('screen')
      if (!this.wakeDesired) {
        await lock.release()
        return
      }
      this.wake = lock
      this.wakeStatus = 'Keeping screen awake'
      lock.addEventListener('release', () => {
        if (this.wake === lock) this.wake = null
        this.wakeStatus = 'Released — check screen timeout'
      })
    } catch {
      this.wakeStatus = 'Unavailable — check screen timeout'
    } finally {
      this.wakePending = false
    }
  }
  dispose() {
    void this.keepAwake(false)
    if (this.audio) void this.audio.close().catch(() => {})
    this.audio = null
  }
}
