import { createContext, useContext, useState } from 'react'
import { seedDishes } from '../data/seedDishes.js'
import { defaultSections } from '../data/defaultRestaurant.js'
import { load, save } from '../utils/storage.js'

const STORAGE_KEY = 'foodapp.dishes'
const SECTIONS_KEY = 'foodapp.sections'
const DishContext = createContext(null)

// Dishes saved before menu sections existed get the seed's section and tags (or none).
const seedById = Object.fromEntries(seedDishes.map((d) => [d.id, d]))
const migrate = (d) => ({
  ...d,
  sectionId: d.sectionId ?? seedById[d.id]?.sectionId ?? '',
  tags: d.tags ?? seedById[d.id]?.tags ?? [],
})

export function DishProvider({ children }) {
  const [dishes, setDishes] = useState(() => load(STORAGE_KEY, seedDishes).map(migrate))
  const [sections, setSections] = useState(() => load(SECTIONS_KEY, defaultSections))
  const [storageError, setStorageError] = useState('')

  const commit = (next) => {
    setDishes(next)
    setStorageError(save(STORAGE_KEY, next) ? '' : 'Storage is full — changes will be lost on reload. Try smaller images.')
  }

  const addDish = (dish) => commit([...dishes, { ...dish, id: crypto.randomUUID() }])
  const updateDish = (id, updates) => commit(dishes.map((d) => (d.id === id ? { ...d, ...updates } : d)))
  const deleteDish = (id) => commit(dishes.filter((d) => d.id !== id))
  const getDish = (id) => dishes.find((d) => d.id === id)

  // ----- Menu sections -----
  const commitSections = (next) => {
    setSections(next)
    save(SECTIONS_KEY, next)
  }
  const addSection = (name) => commitSections([...sections, { id: crypto.randomUUID(), name }])
  const renameSection = (id, name) => commitSections(sections.map((s) => (s.id === id ? { ...s, name } : s)))
  const moveSection = (id, dir) => {
    const i = sections.findIndex((s) => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    commitSections(next)
  }
  /** Deletes a section; its dishes stay on the menu without a section. */
  const deleteSection = (id) => {
    commitSections(sections.filter((s) => s.id !== id))
    if (dishes.some((d) => d.sectionId === id)) {
      commit(dishes.map((d) => (d.sectionId === id ? { ...d, sectionId: '' } : d)))
    }
  }
  const sectionName = (id) => sections.find((s) => s.id === id)?.name ?? ''

  return (
    <DishContext.Provider
      value={{
        dishes, addDish, updateDish, deleteDish, getDish, storageError,
        sections, addSection, renameSection, moveSection, deleteSection, sectionName,
      }}
    >
      {children}
    </DishContext.Provider>
  )
}

export const useDishes = () => useContext(DishContext)
