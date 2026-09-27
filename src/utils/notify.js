// Desktop notifications + a short chime for new orders.

export const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window

export const notificationPermission = () => (notificationsSupported ? Notification.permission : 'unsupported')

/** Must be called from a click (browsers ignore permission requests that aren't user-initiated). */
export async function requestNotificationPermission() {
  if (!notificationsSupported) return 'unsupported'
  return Notification.requestPermission()
}

/** Shows a desktop notification. Returns false if notifications aren't allowed. */
export function showDesktopNotification(title, { body, tag, onClick } = {}) {
  if (notificationPermission() !== 'granted') return false
  try {
    const n = new Notification(title, { body, tag, icon: '/favicon.svg', requireInteraction: true })
    n.onclick = () => {
      window.focus()
      onClick?.()
      n.close()
    }
    return true
  } catch {
    return false // e.g. some mobile browsers only allow notifications from a service worker
  }
}

let audioCtx = null

/** Two-tone chime generated with Web Audio (no sound file needed). */
export function playChime() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
    const t = audioCtx.currentTime
    ;[[880, 0], [1320, 0.18]].forEach(([freq, delay]) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t + delay)
      gain.gain.exponentialRampToValueAtTime(0.3, t + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.35)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(t + delay)
      osc.stop(t + delay + 0.4)
    })
  } catch {
    // Audio blocked until the admin interacts with the page — the notification still shows.
  }
}

/** Browsers block audio until the page has been clicked once; call this on the first click. */
export function unlockAudio() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {
    /* ignore */
  }
}
