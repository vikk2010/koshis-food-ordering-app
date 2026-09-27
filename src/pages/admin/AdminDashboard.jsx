import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDishes } from '../../context/DishContext.jsx'
import VegIcon from '../../components/VegIcon.jsx'
import DishImage from '../../components/DishImage.jsx'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'veg', label: 'Veg' },
  { key: 'nonveg', label: 'Non-Veg' },
]

export default function AdminDashboard() {
  const { dishes, updateDish, deleteDish, storageError, sectionName, ready } = useDishes()
  const ignore = () => {} // failures are shown via storageError
  const [filter, setFilter] = useState('all')
  const [confirmId, setConfirmId] = useState(null)

  const visible = filter === 'all' ? dishes : dishes.filter((d) => d.category === filter)

  return (
    <section>
      <div className="page-head">
        <h1>Manage Dishes</h1>
        <Link className="btn" to="/admin/dishes/new">+ Add Dish</Link>
      </div>

      {storageError && <p className="error">{storageError}</p>}

      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f.key} className={`tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Section</th>
              <th>Type</th>
              <th>Price</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((dish) => (
              <tr key={dish.id}>
                <td><DishImage dish={dish} className="thumb" /></td>
                <td>
                  <strong>{dish.name}</strong>
                  <div className="muted small clamp">{dish.description}</div>
                </td>
                <td className="nowrap">{sectionName(dish.sectionId) || <span className="muted">—</span>}</td>
                <td className="nowrap"><VegIcon category={dish.category} /> {dish.category === 'veg' ? 'Veg' : 'Non-Veg'}</td>
                <td>₹{dish.price}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={dish.available}
                    onChange={(e) => updateDish(dish.id, { available: e.target.checked }).catch(ignore)}
                    aria-label={`Toggle availability of ${dish.name}`}
                  />
                </td>
                <td className="row-actions">
                  <Link className="btn small secondary" to={`/admin/dishes/${dish.id}/edit`}>Edit</Link>
                  {confirmId === dish.id ? (
                    <>
                      <button className="btn small danger" onClick={() => deleteDish(dish.id).catch(ignore)}>Confirm</button>
                      <button className="btn small secondary" onClick={() => setConfirmId(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn small danger" onClick={() => setConfirmId(dish.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan="7" className="empty">{ready ? 'No dishes yet.' : 'Loading…'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
