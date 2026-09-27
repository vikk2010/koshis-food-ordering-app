import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDishes } from '../../context/DishContext.jsx'

// "Menu Sections" admin screen: add, rename, reorder and delete the sections dishes are grouped in.
export default function AdminSections() {
  const { sections, dishes, addSection, renameSection, moveSection, deleteSection } = useDishes()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // { id, name }
  const [confirmId, setConfirmId] = useState(null)

  const countIn = (id) => dishes.filter((d) => d.sectionId === id).length
  const unassigned = dishes.filter((d) => !d.sectionId).length
  const taken = (n, exceptId) => sections.some((s) => s.id !== exceptId && s.name.toLowerCase() === n.toLowerCase())

  const handleAdd = (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Enter a section name')
    if (taken(n)) return setError('A section with this name already exists')
    addSection(n)
    setName('')
    setError('')
  }

  const saveRename = () => {
    const n = editing.name.trim()
    if (!n) return setError('Section name cannot be empty')
    if (taken(n, editing.id)) return setError('A section with this name already exists')
    renameSection(editing.id, n)
    setEditing(null)
    setError('')
  }

  return (
    <section className="admin-settings">
      <div className="page-head">
        <div>
          <h1>Menu Sections</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Group dishes into sections like Starters or Desserts. Customers see them as filters on the menu, in this order.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Add a section</h2>
        <form className="form coupon-form" onSubmit={handleAdd}>
          <label>
            Section name
            <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} maxLength={30} placeholder="e.g. Thalis" />
          </label>
          <button className="btn" type="submit">+ Add Section</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th style={{ width: 90 }}>Order</th><th>Section</th><th>Dishes</th><th></th></tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <tr key={s.id}>
                <td className="row-actions">
                  <button type="button" className="icon-btn" onClick={() => moveSection(s.id, -1)} disabled={i === 0} aria-label={`Move ${s.name} up`}>↑</button>
                  <button type="button" className="icon-btn" onClick={() => moveSection(s.id, 1)} disabled={i === sections.length - 1} aria-label={`Move ${s.name} down`}>↓</button>
                </td>
                <td>
                  {editing?.id === s.id ? (
                    <input
                      className="inline-input"
                      value={editing.name}
                      maxLength={30}
                      autoFocus
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename()
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      aria-label="Section name"
                    />
                  ) : (
                    <strong>{s.name}</strong>
                  )}
                </td>
                <td className="muted">{countIn(s.id)}</td>
                <td className="row-actions" style={{ justifyContent: 'flex-end' }}>
                  {editing?.id === s.id ? (
                    <>
                      <button className="btn small" onClick={saveRename}>Save</button>
                      <button className="btn small secondary" onClick={() => { setEditing(null); setError('') }}>Cancel</button>
                    </>
                  ) : confirmId === s.id ? (
                    <>
                      <span className="muted small" style={{ alignSelf: 'center' }}>
                        {countIn(s.id) ? `${countIn(s.id)} dish(es) will have no section.` : 'Delete?'}
                      </span>
                      <button className="btn small danger" onClick={() => { deleteSection(s.id); setConfirmId(null) }}>Confirm</button>
                      <button className="btn small secondary" onClick={() => setConfirmId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn small secondary" onClick={() => setEditing({ id: s.id, name: s.name })}>Rename</button>
                      <button className="btn small danger" onClick={() => setConfirmId(s.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {sections.length === 0 && <tr><td colSpan="4" className="empty">No sections yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {unassigned > 0 && (
        <p className="muted small">
          {unassigned} dish{unassigned > 1 ? 'es have' : ' has'} no section — <Link to="/admin">assign one from Dishes</Link>.
        </p>
      )}
    </section>
  )
}
