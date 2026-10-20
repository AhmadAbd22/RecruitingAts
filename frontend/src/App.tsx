import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getHealth,
  getMe,
  login,
  logout,
  register,
  type UserDto,
} from './api/client'
import './App.css'

function App() {
  const [health, setHealth] = useState<string>('checking…')
  const [user, setUser] = useState<UserDto | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('recruiter@demo.local')
  const [password, setPassword] = useState('Pass123!')
  const [fullName, setFullName] = useState('Demo Recruiter')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getHealth()
      .then((h) => setHealth(`${h.status} — ${h.service}`))
      .catch(() => setHealth('unreachable (is the API running?)'))

    getMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const next =
        mode === 'login'
          ? await login(email, password)
          : await register(email, password, fullName)
      setUser(next)
    } catch {
      setError(mode === 'login' ? 'Login failed.' : 'Register failed.')
    } finally {
      setBusy(false)
    }
  }

  async function onLogout() {
    await logout()
    setUser(null)
  }

  return (
    <main className="shell">
      <header>
        <h1>Recruiting ATS</h1>
        <p className="muted">API health: {health}</p>
      </header>

      {user ? (
        <section className="card">
          <h2>Signed in</h2>
          <p>
            <strong>{user.fullName}</strong>
            <br />
            {user.email}
          </p>
          <p className="muted">
            Cookie auth is working (httpOnly session via Vite <code>/api</code> proxy).
          </p>
          <button type="button" onClick={onLogout}>
            Log out
          </button>
        </section>
      ) : (
        <section className="card">
          <div className="tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={onSubmit}>
            {mode === 'register' && (
              <label>
                Full name
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </section>
      )}
    </main>
  )
}

export default App
