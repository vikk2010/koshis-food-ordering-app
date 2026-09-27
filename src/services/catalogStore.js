// Where the restaurant's shared data lives: profile & hours, charges, coupons, menu sections, dishes.
//
// - Firebase configured: Firestore. Anyone can read (the storefront needs it); only admins can
//   write (see firestore.rules). Every open page updates live when the admin saves.
//     config/restaurant   restaurant profile, hours, UPI ID, "accepting orders"
//     config/settings     delivery time and charges
//     config/coupons      { items: Coupon[] }
//     config/sections     { items: Section[] }  (array order = menu order)
//     config/meta         { initializedAt } — set once the data has been uploaded
//     dishes/{id}         one document per dish (image stored as a small data URL)
//   The last copy read is cached in localStorage so pages paint instantly on the next visit.
//
// - Demo mode: everything stays in this browser's localStorage, as before.
import { getFirestoreDb, isFirebaseConfigured } from './firebase.js'
import { load, save } from '../utils/storage.js'
import { defaultRestaurant, defaultSections } from '../data/defaultRestaurant.js'
import { defaultCoupons, defaultSettings } from '../data/defaultSettings.js'
import { seedDishes } from '../data/seedDishes.js'

export const catalogIsShared = isFirebaseConfigured

// localStorage keys used by earlier versions (and still by demo mode).
const LOCAL_KEYS = {
  restaurant: 'foodapp.restaurant',
  settings: 'foodapp.settings',
  coupons: 'foodapp.coupons',
  sections: 'foodapp.sections',
  dishes: 'foodapp.dishes',
}
const DEFAULTS = {
  restaurant: defaultRestaurant,
  settings: defaultSettings,
  coupons: defaultCoupons,
  sections: defaultSections,
}
const LISTS = new Set(['coupons', 'sections']) // stored as { items: [...] }
const LOCAL_EVENT = 'foodapp:catalog-changed'
const cacheKey = (name) => `foodapp.cache.${name}`

const toDoc = (name, value) => (LISTS.has(name) ? { items: value } : value)
const fromDoc = (name, data) => (LISTS.has(name) ? data.items ?? [] : data)

function listenLocal(emit) {
  const onStorage = (e) => Object.values(LOCAL_KEYS).includes(e.key) && emit()
  emit()
  window.addEventListener('storage', onStorage) // changes from other tabs
  window.addEventListener(LOCAL_EVENT, emit) // changes from this tab
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(LOCAL_EVENT, emit)
  }
}

/** Runs `start(db, fs)` once Firestore has loaded; returns an unsubscribe for what it returns. */
function withFirestore(start, onError) {
  let unsubscribe = () => {}
  let cancelled = false
  getFirestoreDb()
    .then(({ db, fs }) => {
      if (!cancelled) unsubscribe = start(db, fs)
    })
    .catch((err) => onError?.(err))
  return () => {
    cancelled = true
    unsubscribe()
  }
}

// ---------------------------------------------------------------- config documents

/** Last known value (cache in Firebase mode, the saved value in demo mode), or null. */
export function cachedConfig(name) {
  return load(catalogIsShared ? cacheKey(name) : LOCAL_KEYS[name], null)
}

/**
 * Calls onChange(value | null) with the current value now and on every change.
 * null = nothing saved yet (use the defaults).
 */
export function subscribeConfig(name, onChange, onError) {
  if (!catalogIsShared) return listenLocal(() => onChange(load(LOCAL_KEYS[name], null)))
  return withFirestore(
    (db, fs) =>
      fs.onSnapshot(
        fs.doc(db, 'config', name),
        (snap) => {
          const value = snap.exists() ? fromDoc(name, snap.data()) : null
          if (value !== null) save(cacheKey(name), value)
          onChange(value)
        },
        (err) => {
          console.error(`Could not load ${name}:`, err)
          onError?.(err)
        },
      ),
    onError,
  )
}

/** Admin: saves a config value. Rejects with a user-facing message. */
export async function saveConfig(name, value) {
  if (!catalogIsShared) {
    if (!save(LOCAL_KEYS[name], value)) throw new Error('Browser storage is full — try a smaller image.')
    window.dispatchEvent(new Event(LOCAL_EVENT))
    return
  }
  try {
    const { db, fs } = await getFirestoreDb('admin')
    await fs.setDoc(fs.doc(db, 'config', name), toDoc(name, value))
    save(cacheKey(name), value)
  } catch (err) {
    throw new Error(friendlyError(err))
  }
}

// ---------------------------------------------------------------- dishes

const byMenuOrder = (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.name.localeCompare(b.name)

export function cachedDishes() {
  return load(catalogIsShared ? cacheKey('dishes') : LOCAL_KEYS.dishes, null)
}

/** Calls onChange(dishes | null) now and whenever the menu changes. */
export function subscribeDishes(onChange, onError) {
  if (!catalogIsShared) return listenLocal(() => onChange(load(LOCAL_KEYS.dishes, null)))
  return withFirestore(
    (db, fs) =>
      fs.onSnapshot(
        fs.collection(db, 'dishes'),
        (snap) => {
          const list = snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort(byMenuOrder)
          save(cacheKey('dishes'), list) // may fail if images are large — the cache is optional
          onChange(list)
        },
        (err) => {
          console.error('Could not load the menu:', err)
          onError?.(err)
        },
      ),
    onError,
  )
}

/**
 * Admin: applies dish changes in one go. `changes` = [{ id, data }] where data = the full dish
 * to save, or null to delete it. Rejects with a user-facing message.
 */
export async function saveDishes(changes) {
  if (!catalogIsShared) {
    let list = load(LOCAL_KEYS.dishes, seedDishes)
    for (const { id, data } of changes) {
      list = data === null
        ? list.filter((d) => d.id !== id)
        : list.some((d) => d.id === id) ? list.map((d) => (d.id === id ? { ...data, id } : d)) : [...list, { ...data, id }]
    }
    if (!save(LOCAL_KEYS.dishes, list)) throw new Error('Browser storage is full — try smaller images.')
    window.dispatchEvent(new Event(LOCAL_EVENT))
    return
  }
  try {
    const { db, fs } = await getFirestoreDb('admin')
    const batch = fs.writeBatch(db)
    for (const { id, data } of changes) {
      const ref = fs.doc(db, 'dishes', id)
      if (data === null) batch.delete(ref)
      else batch.set(ref, { ...data, id })
    }
    await batch.commit()
  } catch (err) {
    throw new Error(friendlyError(err))
  }
}

// ---------------------------------------------------------------- first-time upload

/**
 * Admin: the first time an admin opens the panel, uploads the menu and details — the ones saved in
 * this browser by the earlier version of the app, or the defaults — so every customer sees them.
 * Does nothing once the data is in Firestore. Resolves true if it uploaded something.
 */
export async function initializeCatalog() {
  if (!catalogIsShared) return false
  const { db, fs } = await getFirestoreDb('admin')
  const metaRef = fs.doc(db, 'config', 'meta')
  if ((await fs.getDoc(metaRef)).exists()) return false

  const batch = fs.writeBatch(db)
  for (const name of Object.keys(DEFAULTS)) {
    const ref = fs.doc(db, 'config', name)
    if ((await fs.getDoc(ref)).exists()) continue
    batch.set(ref, toDoc(name, load(LOCAL_KEYS[name], null) ?? DEFAULTS[name]))
  }
  const existing = await fs.getDocs(fs.query(fs.collection(db, 'dishes'), fs.limit(1)))
  if (existing.empty) {
    const now = Date.now()
    load(LOCAL_KEYS.dishes, seedDishes).forEach((d, i) => {
      batch.set(fs.doc(db, 'dishes', d.id), { tags: [], sectionId: '', ...d, createdAt: d.createdAt ?? now + i })
    })
  }
  batch.set(metaRef, { initializedAt: Date.now() })
  await batch.commit()
  return true
}

function friendlyError(err) {
  console.error(err)
  if (err?.code === 'permission-denied') return 'Not allowed — sign in again as an admin.'
  if (err?.code === 'invalid-argument' || /exceeds the maximum/i.test(err?.message)) {
    return 'Too large to save — try a smaller image.'
  }
  return 'Could not save — check your internet connection and try again.'
}
