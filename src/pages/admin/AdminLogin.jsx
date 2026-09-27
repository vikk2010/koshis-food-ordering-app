import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { adminUsesGoogle, useAuth } from '../../context/AuthContext.jsx'

export default function AdminLogin() {
  const { isAdmin, ready, login } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pendingUid, setPendingUid] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && isAdmin) return <Navigate to="/admin/orders" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setPendingUid('')
    try {
      await login(password)
      navigate('/admin/orders')
    } catch (err) {
      setError(err.message)
      setPendingUid(err.uid || '')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="center-card form" onSubmit={handleSubmit}>
      <h1>Admin Login</h1>
      {adminUsesGoogle ? (
        <>
          <p className="muted small">Sign in with the Google account that has admin access.</p>
          <button className="btn google-btn" type="submit" disabled={busy}>
            {busy ? 'Opening Google…' : 'Sign in with Google'}
          </button>
        </>
      ) : (
        <>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
          </label>
          <button className="btn" type="submit" disabled={busy}>Login</button>
          <p className="muted small">Demo password: admin123</p>
        </>
      )}
      {error && <p className="error">{error}</p>}
      {pendingUid && (
        <p className="demo-note">
          To make this account an admin, add a document with ID <code className="uid">{pendingUid}</code> to the
          Firestore <strong>admins</strong> collection, then sign in again.
        </p>
      )}
    </form>
  )
}
