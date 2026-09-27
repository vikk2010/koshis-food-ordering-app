import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToOrders } from '../services/orderStore.js'
import { load, save } from '../utils/storage.js'
import {
  notificationPermission,
  playChime,
  requestNotificationPermission,
  showDesktopNotification,
  unlockAudio,
} from '../utils/notify.js'
import { notificationText } from '../utils/orders.js'

const SEEN_KEY = 'foodapp.admin.seenOrders' // { since, ids }: orders before `since` count as seen
const SOUND_KEY = 'foodapp.admin.sound'
const AdminOrdersContext = createContext(null)

// Live order feed for the admin panel. Mounted around every admin page, so a new order
// triggers a desktop notification, a chime and a toast whichever admin page is open.
export function AdminOrdersProvider({ children }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seen, setSeen] = useState(() => load(SEEN_KEY, { since: Date.now(), ids: [] }))
  const [permission, setPermission] = useState(notificationPermission)
  const [sound, setSound] = useState(() => load(SOUND_KEY, true))
  const [toasts, setToasts] = useState([])
  const knownIds = useRef(null) // ids already shown; null until the first load
  const soundRef = useRef(sound)
  soundRef.current = sound

  useEffect(() => {
    const unsub = subscribeToOrders(
      (list) => {
        setOrders(list)
        setLoading(false)
        setError('')
        if (knownIds.current === null) {
          knownIds.current = new Set(list.map((o) => o.id)) // don't alert for orders that existed before
          return
        }
        const fresh = list.filter((o) => !knownIds.current.has(o.id))
        fresh.forEach((o) => knownIds.current.add(o.id))
        if (fresh.length) announce(fresh)
      },
      (msg) => {
        setError(msg)
        setLoading(false)
      },
    )
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Browsers only play sound after the page has been clicked once.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => window.removeEventListener('pointerdown', unlockAudio)
  }, [])

  const isNew = useCallback((o) => o.placedAt > seen.since && !seen.ids.includes(o.id), [seen])
  const newCount = orders.filter(isNew).length

  // Show the count in the browser tab title, e.g. "(2) New orders · Koshi's Admin".
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) New orders? · /, '')
    document.title = newCount ? `(${newCount}) New order${newCount > 1 ? 's' : ''} · ${base}` : base
    return () => {
      document.title = document.title.replace(/^\(\d+\) New orders? · /, '')
    }
  }, [newCount])

  function announce(fresh) {
    if (soundRef.current) playChime()
    for (const o of fresh) {
      const { title, body } = notificationText(o)
      showDesktopNotification(title, { body, tag: o.id, onClick: () => navigate(`/admin/orders/${o.id}`) })
      const toastId = o.id
      setToasts((t) => [...t.filter((x) => x.id !== toastId), { id: toastId, title, body }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toastId)), 10000)
    }
  }

  const commitSeen = (next) => {
    setSeen(next)
    save(SEEN_KEY, next)
  }
  const markSeen = useCallback((id) => {
    setSeen((s) => {
      if (s.ids.includes(id)) return s
      const next = { ...s, ids: [...s.ids, id].slice(-500) }
      save(SEEN_KEY, next)
      return next
    })
  }, [])
  const markAllSeen = () => commitSeen({ since: Date.now(), ids: [] })

  const enableNotifications = async () => {
    unlockAudio()
    setPermission(await requestNotificationPermission())
  }

  const toggleSound = () => {
    unlockAudio()
    setSound((s) => {
      save(SOUND_KEY, !s)
      return !s
    })
  }

  const sendTest = () => {
    unlockAudio()
    const sample = {
      number: 'TEST', phone: '+919876543210', customerName: 'Test customer',
      items: [{ qty: 1, name: 'Chicken Biryani' }], bill: { grandTotal: 299 },
    }
    const { title, body } = notificationText(sample)
    if (sound) playChime()
    if (!showDesktopNotification(title, { body, tag: 'test' })) {
      setToasts((t) => [...t, { id: 'test', title, body }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== 'test')), 6000)
    }
  }

  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id))

  return (
    <AdminOrdersContext.Provider
      value={{
        orders, loading, error, isNew, newCount, markSeen, markAllSeen,
        permission, enableNotifications, sound, toggleSound, sendTest,
        getOrder: (id) => orders.find((o) => o.id === id),
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <button
                type="button"
                className="toast-body"
                onClick={() => {
                  dismissToast(t.id)
                  if (t.id !== 'test') navigate(`/admin/orders/${t.id}`)
                }}
              >
                <strong>{t.title}</strong>
                <span>{t.body}</span>
              </button>
              <button type="button" className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>
      )}
    </AdminOrdersContext.Provider>
  )
}

export const useAdminOrders = () => useContext(AdminOrdersContext)
