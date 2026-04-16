import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLayout({ children, onLogout, token }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('email') || 'Admin';

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Users', path: '/admin/users', icon: '👥' },
    { label: 'Villages', path: '/admin/villages', icon: '📍' },
    { label: 'API Logs', path: '/admin/logs', icon: '📋' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {sidebarOpen && <span className="font-bold text-lg">Admin Panel</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white"
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          {sidebarOpen ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Logged in as:</p>
              <p className="text-sm font-semibold truncate">{userEmail}</p>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-sm mt-3"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full px-2 py-2 bg-red-600 rounded hover:bg-red-700 text-xs"
              title="Logout"
            >
              🚪
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white shadow px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Village API Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">🟢 API Live</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
