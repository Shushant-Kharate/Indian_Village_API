import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import './App.css'

// Import admin components
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './components/AdminDashboard'
import UserManagement from './components/UserManagement'
import VillageMasterList from './components/VillageMasterList'
import ApiLogsViewer from './components/ApiLogsViewer'

// Import auth pages
import LoginRegister from './pages/LoginRegister'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Protected route component
function ProtectedRoute({ children, token }) {
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  // If not authenticated, show login/register pages
  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginRegister onLogin={handleLogin} />} />
          <Route path="/register" element={<LoginRegister onLogin={handleLogin} isRegister={true} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    )
  }

  // If authenticated, show admin dashboard with routing
  return (
    <Router>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute token={token}>
              <AdminLayout onLogout={handleLogout} token={token}>
                <Routes>
                  <Route path="/" element={<AdminDashboard token={token} />} />
                  <Route path="/dashboard" element={<AdminDashboard token={token} />} />
                  <Route path="/users" element={<UserManagement token={token} />} />
                  <Route path="/villages" element={<VillageMasterList token={token} />} />
                  <Route path="/logs" element={<ApiLogsViewer token={token} />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        {/* Redirect root to admin dashboard */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        {/* Redirect login to dashboard if already authenticated */}
        <Route path="/login" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default Appimport { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [stats, setStats] = useState({ villages: 0, states: 0, districts: 0 })
  const [states, setStates] = useState([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  // Fetch stats
  useEffect(() => {
    if (token) {
      fetchStats()
      fetchStates()
    }
  }, [token])

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setStats(response.data.data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchStates = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/states`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setStates(response.data.data)
    } catch (err) {
      console.error('Error fetching states:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name
      })
      // Auto-login after registration
      handleLogin({ email, password })
    } catch (err) {
      alert('Registration failed: ' + err.response?.data?.error)
    }
  }

  const handleLogin = async (credentials = { email, password }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password
      })
      localStorage.setItem('token', response.data.data.token)
      setToken(response.data.data.token)
      setEmail('')
      setPassword('')
    } catch (err) {
      alert('Login failed: ' + err.response?.data?.error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setStats({ villages: 0, states: 0, districts: 0 })
    setStates([])
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Indian Villages</h1>
          <p className="text-center text-gray-600 mb-8">Explore India's administrative divisions</p>
          
          <form onSubmit={isLogin ? () => handleLogin() : handleRegister} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {!isLogin && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🇮🇳 Indian Villages Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">Total States</h3>
            <p className="text-4xl font-bold text-blue-600">{stats.states}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">Total Districts</h3>
            <p className="text-4xl font-bold text-green-600">{stats.districts}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">Total Villages</h3>
            <p className="text-4xl font-bold text-purple-600">{stats.villages}</p>
          </div>
        </div>

        {/* States List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">States</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">State Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">State Name</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map((state) => (
                    <tr key={state.state_code} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-700">{state.state_code}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{state.state_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
