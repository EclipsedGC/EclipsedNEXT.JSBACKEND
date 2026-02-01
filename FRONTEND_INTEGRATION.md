# 🎨 Frontend Integration Examples

This guide shows how to integrate the rank-based access control system with your React frontend.

---

## 1. Create Auth Utility Functions

Create `React FRONTEND/src/utils/auth.js`:

```javascript
const API_BASE = 'http://localhost:3001'

// Login
export async function login(username, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  
  const data = await response.json()
  
  if (data.success) {
    // Store token and user info
    localStorage.setItem('token', data.data.token)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    return { success: true, user: data.data.user }
  }
  
  return { success: false, message: data.message }
}

// Logout
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// Get current user
export function getCurrentUser() {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

// Get token
export function getToken() {
  return localStorage.getItem('token')
}

// Check if user is logged in
export function isAuthenticated() {
  return !!getToken()
}

// Permission checks (same logic as backend)
export function isGuildMaster(user) {
  return user?.rank === 'GUILD_MASTER'
}

export function isCouncilOrHigher(user) {
  return user?.rank === 'GUILD_MASTER' || user?.rank === 'COUNCIL'
}

export function canAccessTeam(user, teamId) {
  if (!user) return false
  
  if (user.rank === 'GUILD_MASTER' || user.rank === 'COUNCIL') {
    return true
  }
  
  if (user.rank === 'TEAM_LEAD') {
    return user.team_id === teamId
  }
  
  return false
}
```

---

## 2. Create API Client

Create `React FRONTEND/src/utils/api.js`:

```javascript
const API_BASE = 'http://localhost:3001'

// Helper to make authenticated requests
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token')
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  })
  
  const data = await response.json()
  
  // Handle 401 Unauthorized (token expired or invalid)
  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login' // Redirect to login
  }
  
  return { ...data, status: response.status }
}

// User API
export const userAPI = {
  getAll: () => fetchWithAuth('/api/users'),
  
  getById: (id) => fetchWithAuth(`/api/users/${id}`),
  
  create: (userData) => fetchWithAuth('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  update: (id, userData) => fetchWithAuth(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(userData)
  }),
  
  changePassword: (id, password) => fetchWithAuth(`/api/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password })
  }),
  
  delete: (id) => fetchWithAuth(`/api/users/${id}`, {
    method: 'DELETE'
  })
}

// Team API
export const teamAPI = {
  getAll: () => fetchWithAuth('/api/teams'),
  
  getById: (id) => fetchWithAuth(`/api/teams/${id}`),
  
  create: (teamData) => fetchWithAuth('/api/teams', {
    method: 'POST',
    body: JSON.stringify(teamData)
  }),
  
  update: (id, teamData) => fetchWithAuth(`/api/teams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(teamData)
  }),
  
  delete: (id) => fetchWithAuth(`/api/teams/${id}`, {
    method: 'DELETE'
  })
}
```

---

## 3. Create Login Component

Create `React FRONTEND/src/components/Login.jsx`:

```javascript
import { useState } from 'react'
import { login } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(username, password)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Login failed')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Eclipsed Guild Login
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

---

## 4. Protected Route Component

Create `React FRONTEND/src/components/ProtectedRoute.jsx`:

```javascript
import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'

export default function ProtectedRoute({ children, requiredRank }) {
  const user = getCurrentUser()

  // Not logged in
  if (!user) {
    return <Navigate to="/login" />
  }

  // Check rank if specified
  if (requiredRank) {
    if (requiredRank === 'GUILD_MASTER' && user.rank !== 'GUILD_MASTER') {
      return <Navigate to="/unauthorized" />
    }
    
    if (requiredRank === 'COUNCIL' && 
        user.rank !== 'GUILD_MASTER' && 
        user.rank !== 'COUNCIL') {
      return <Navigate to="/unauthorized" />
    }
  }

  return children
}
```

---

## 5. Account Manager Component (Example)

Create `React FRONTEND/src/components/AccountManager.jsx`:

```javascript
import { useState, useEffect } from 'react'
import { userAPI } from '../utils/api'
import { getCurrentUser } from '../utils/auth'

export default function AccountManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const currentUser = getCurrentUser()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const result = await userAPI.getAll()
    if (result.success) {
      setUsers(result.data)
    }
    setLoading(false)
  }

  const handleCreateUser = async (userData) => {
    const result = await userAPI.create(userData)
    if (result.success) {
      loadUsers() // Reload list
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-6">Account Manager</h1>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl text-white mb-4">Users</h2>
        
        <table className="w-full text-white">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2">Username</th>
              <th className="text-left py-2">Rank</th>
              <th className="text-left py-2">Team</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-700">
                <td className="py-2">{user.username}</td>
                <td className="py-2">{user.rank}</td>
                <td className="py-2">{user.team_id || '-'}</td>
                <td className="py-2">
                  <button className="text-blue-400 hover:text-blue-300 mr-2">
                    Edit
                  </button>
                  <button className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## 6. Team List Component (Example)

Create `React FRONTEND/src/components/TeamList.jsx`:

```javascript
import { useState, useEffect } from 'react'
import { teamAPI } from '../utils/api'
import { getCurrentUser, canAccessTeam } from '../utils/auth'

export default function TeamList() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const user = getCurrentUser()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    setLoading(true)
    const result = await teamAPI.getAll()
    if (result.success) {
      setTeams(result.data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="text-white">Loading teams...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-6">Teams</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-2">{team.name}</h3>
            <p className="text-gray-300 mb-4">{team.description}</p>
            
            {canAccessTeam(user, team.id) && (
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded">
                Manage Team
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 7. App Router Setup

Update your `React FRONTEND/src/App.jsx`:

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './utils/auth'
import Login from './components/Login'
import HomePage from './components/HomePage'
import AccountManager from './components/AccountManager'
import TeamList from './components/TeamList'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        
        <Route path="/teams" element={
          <ProtectedRoute>
            <TeamList />
          </ProtectedRoute>
        } />
        
        {/* Guild Master only */}
        <Route path="/account-manager" element={
          <ProtectedRoute requiredRank="GUILD_MASTER">
            <AccountManager />
          </ProtectedRoute>
        } />
        
        {/* Redirect to login if not authenticated */}
        <Route path="*" element={
          isAuthenticated() ? <Navigate to="/" /> : <Navigate to="/login" />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

---

## 8. Navigation Component with Rank-Based Links

```javascript
import { getCurrentUser, logout, isGuildMaster } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

export default function Navigation() {
  const user = getCurrentUser()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-gray-800 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex space-x-4">
          <a href="/" className="text-white">Home</a>
          <a href="/teams" className="text-white">Teams</a>
          
          {/* Show Account Manager only to Guild Master */}
          {isGuildMaster(user) && (
            <a href="/account-manager" className="text-white">Account Manager</a>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-gray-300">
            {user?.username} ({user?.rank})
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
```

---

## Important Notes

1. **Don't forget to install React Router:**
   ```bash
   npm install react-router-dom
   ```

2. **Token expiration:** Tokens expire after 7 days. The API client automatically redirects to login on 401 errors.

3. **Permission checks:** Always check permissions in the UI, but remember - the backend enforces them!

4. **CORS:** If you get CORS errors, you may need to configure your Next.js backend to allow requests from your frontend.

---

This gives you everything you need to integrate the auth system with your React frontend! 🚀
