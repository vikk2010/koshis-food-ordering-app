import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AdminLogin() {
  const { isAdmin, login } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAdmin) return <Navigate to="/admin" replace />

  const handleSubmit = (e) => {
    e.preventDefault()
    if (login(password)) navigate('/admin')
    else setError('Incorrect password')
  }

  return (
    <form className="center-card form" onSubmit={handleSubmit}>
      <h1>Admin Login</h1>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit">Login</button>
      <p className="muted small">Demo password: admin123</p>
    </form>
  )
}
