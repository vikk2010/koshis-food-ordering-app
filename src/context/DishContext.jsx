import { createContext, useContext, useEffect, useState } from 'react'
import { seedDishes } from '../data/seedDishes.js'
import { defaultSections } from '../data/defaultRestaurant.js'
import {
  cachedConfig, cachedDishes, catalogIsShared, saveConfig, saveDishes, subscribeConfig, subscribeDishes,
} from '../services/catalogStore.js'

const DishContext = createContext(null)

// Dishes saved before menu sections existed get the seed's section and tags (or none).
const seedById = Object.fromEntries(seedDishes.map((d) => [d.id, d]))
const migrate = (d) => ({
  ...d,
  sectionId: d.sectionId ?? seedById[d.id]?.sectionId ?? '',
  tags: d.tags ?? seedById[d.id]?.tags ?? [],
})
// Before anything is saved: the demo menu in demo mode, an empty menu in Firebase mode
// (the admin panel uploads the menu the first time an admin signs in).
const fallbackDishes = catalogIsShared ? [] : seedDishes
const strip = ({ id, ...data }) => data // eslint-disable-line no-unused-vars

// The menu: dishes (Firestore "dishes" collection) and sections (config/sections), shared live.
export function DishProvider({ children }) {
  const [stored, setStored] = useState(() => cachedDishes())
  const [storedSections, setStoredSections] = useState(() => cachedConfig('sections'))
  const [dishesLoaded, setDishesLoaded] = useState(() => cachedDishes() !== null)
  const [sectionsLoaded, setSectionsLoaded] = useState(() => cachedConfig('sections') !== null)
  const ready = dishesLoaded && sectionsLoaded
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    const unsubDishes = subscribeDishes(
      (list) => {
        setStored(list)
        setDishesLoaded(true)
      },
      () => {
        setDishesLoaded(true)
        setStorageError('Could not load the latest menu — check your internet connection.')
      },
    )
    const unsubSections = subscribeConfig(
      'sections',
      (v) => {
        setStoredSections(v)
        setSectionsLoaded(true)
      },
      () => setSectionsLoaded(true),
    )
    return () => {
      unsubDishes()
      unsubSections()
    }
  }, [])

  const dishes = (stored ?? fallbackDishes).map(migrate)
  const sections = storedSections ?? defaultSections

  /** Saves dish changes ([{ id, data | null }]) with an instant local update; rolls back on failure. */
  const apply = async (changes) => {
    const previous = stored
    let next = dishes
    for (const { id, data } of changes) {
      next = data === null
        ? next.filter((d) => d.id !== id)
        : next.some((d) => d.id === id) ? next.map((d) => (d.id === id ? { ...data, id } : d)) : [...next, { ...data, id }]
    }
    setStored(next)
    try {
      await saveDishes(changes)
      setStorageError('')
    } catch (err) {
      setStored(previous)
      setStorageError(err.message)
      throw err
    }
  }

  const addDish = (dish) => {
    const id = crypto.randomUUID()
    return apply([{ id, data: { ...strip(dish), createdAt: Date.now() } }])
  }
  const updateDish = (id, updates) => {
    const current = dishes.find((d) => d.id === id)
    return current ? apply([{ id, data: { ...strip(current), ...strip(updates) } }]) : Promise.resolve()
  }
  const deleteDish = (id) => apply([{ id, data: null }])
  const getDish = (id) => dishes.find((d) => d.id === id)

  // ----- Menu sections -----
  const commitSections = async (next) => {
    const previous = storedSections
    setStoredSections(next)
    try {
      await saveConfig('sections', next)
      setStorageError('')
    } catch (err) {
      setStoredSections(previous)
      setStorageError(err.message)
      throw err
    }
  }
  const addSection = (name) => commitSections([...sections, { id: crypto.randomUUID(), name }])
  const renameSection = (id, name) => commitSections(sections.map((s) => (s.id === id ? { ...s, name } : s)))
  const moveSection = (id, dir) => {
    const i = sections.findIndex((s) => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= sections.length) return Promise.resolve()
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    return commitSections(next)
  }
  /** Deletes a section; its dishes stay on the menu without a section. */
  const deleteSection = async (id) => {
    await commitSections(sections.filter((s) => s.id !== id))
    const affected = dishes.filter((d) => d.sectionId === id)
    if (affected.length) await apply(affected.map((d) => ({ id: d.id, data: { ...strip(d), sectionId: '' } })))
  }
  const sectionName = (id) => sections.find((s) => s.id === id)?.name ?? ''

  return (
    <DishContext.Provider
      value={{
        dishes, addDish, updateDish, deleteDish, getDish, storageError, ready,
        sections, addSection, renameSection, moveSection, deleteSection, sectionName,
      }}
    >
      {children}
    </DishContext.Provider>
  )
}

export const useDishes = () => useContext(DishContext)
