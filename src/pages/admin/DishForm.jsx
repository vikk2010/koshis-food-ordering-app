import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDishes } from '../../context/DishContext.jsx'
import { fileToResizedDataUrl } from '../../utils/image.js'
import { DISH_TAGS } from '../../data/defaultRestaurant.js'

const EMPTY = { name: '', category: 'veg', sectionId: '', tags: [], price: '', description: '', image: '', available: true }

export default function DishForm() {
  const { id } = useParams()
  const { getDish, addDish, updateDish, sections } = useDishes()
  const navigate = useNavigate()
  const existing = id ? getDish(id) : null

  const [form, setForm] = useState(existing ?? EMPTY)
  const [error, setError] = useState('')

  if (id && !existing) {
    return (
      <section className="center-card">
        <h1>Dish not found</h1>
        <Link className="btn" to="/admin">Back</Link>
      </section>
    )
  }

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const toggleTag = (key) =>
    setForm((f) => ({ ...f, tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key] }))

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      setForm((f) => ({ ...f, image: dataUrl }))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const price = Number(form.price)
    if (!form.name.trim()) return setError('Name is required')
    if (!(price > 0)) return setError('Price must be greater than 0')

    const dish = { ...form, name: form.name.trim(), description: form.description.trim(), price }
    if (existing) updateDish(existing.id, dish)
    else addDish(dish)
    navigate('/admin')
  }

  return (
    <form className="form dish-form" onSubmit={handleSubmit}>
      <h1>{existing ? 'Edit Dish' : 'Add New Dish'}</h1>

      <label>
        Dish name
        <input value={form.name} onChange={set('name')} required />
      </label>

      <div className="form-row">
        <label>
          Category
          <select value={form.category} onChange={set('category')}>
            <option value="veg">Veg</option>
            <option value="nonveg">Non-Veg</option>
          </select>
        </label>
        <label>
          Price (₹)
          <input type="number" min="1" step="1" value={form.price} onChange={set('price')} required />
        </label>
      </div>

      <label>
        Menu section
        <select value={form.sectionId} onChange={set('sectionId')}>
          <option value="">— No section —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <span className="hint">
          Manage sections in <Link to="/admin/sections">Menu Sections</Link>
        </span>
      </label>

      <fieldset className="tag-field">
        <legend>Labels</legend>
        <div className="chips">
          {DISH_TAGS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`chip ${form.tags.includes(t.key) ? 'active' : ''}`}
              aria-pressed={form.tags.includes(t.key)}
              onClick={() => toggleTag(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label>
        Description
        <textarea rows="4" value={form.description} onChange={set('description')} />
      </label>

      <label>
        Upload image
        <input type="file" accept="image/*" onChange={handleImage} />
      </label>
      <label>
        …or paste an image URL
        <input
          type="url"
          placeholder="https://example.com/dish.jpg"
          value={form.image.startsWith('data:') ? '' : form.image}
          onChange={set('image')}
        />
      </label>

      {form.image && (
        <div className="preview">
          <img src={form.image} alt="Preview" />
          <button type="button" className="btn small secondary" onClick={() => setForm((f) => ({ ...f, image: '' }))}>
            Remove image
          </button>
        </div>
      )}

      <label className="checkbox">
        <input type="checkbox" checked={form.available} onChange={set('available')} />
        Available for ordering
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <Link className="btn secondary" to="/admin">Cancel</Link>
        <button className="btn" type="submit">{existing ? 'Save Changes' : 'Add Dish'}</button>
      </div>
    </form>
  )
}
