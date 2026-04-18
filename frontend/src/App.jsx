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

// Import B2B components
import UserDashboard from './pages/UserDashboard'

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

  // If authenticated, show dashboard with routing
  return (
    <Router>
      <Routes>
        {/* B2B User Portal */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute token={token}>
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Portal */}
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
        {/* Redirect root to B2B dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* Redirect login to dashboard if already authenticated */}
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
