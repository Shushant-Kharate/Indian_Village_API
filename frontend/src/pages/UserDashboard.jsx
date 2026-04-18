import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Copy, Eye, EyeOff, Trash2, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleSecrets, setVisibleSecrets] = useState(new Set());
  const [newKeySecret, setNewKeySecret] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [userRes, keysRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/user/profile`, { headers }),
        axios.get(`${API_URL}/api/v1/user/api-keys`, { headers }),
        axios.get(`${API_URL}/api/v1/user/usage`, { headers })
      ]);

      setUser(userRes.data.data);
      setApiKeys(keysRes.data.data);
      setUsageStats(statsRes.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createNewKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a key name');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `${API_URL}/api/v1/user/api-keys`,
        { name: newKeyName },
        { headers }
      );

      setApiKeys([res.data.data, ...apiKeys]);
      setNewKeyName('');
      setShowNewKeyForm(false);
      if (res.data.data.secret) {
        setNewKeySecret({ name: res.data.data.name, secret: res.data.data.secret, key: res.data.data.key });
      }
    } catch (err) {
      alert('Failed to create API key');
    }
  };

  const deleteKey = async (keyId) => {
    if (!window.confirm('Are you sure? This will immediately revoke the key.')) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/v1/user/api-keys/${keyId}`, { headers });
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
    } catch (err) {
      alert('Failed to delete API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const toggleSecretVisibility = (keyId) => {
    const newSet = new Set(visibleSecrets);
    if (newSet.has(keyId)) {
      newSet.delete(keyId);
    } else {
      newSet.add(keyId);
    }
    setVisibleSecrets(newSet);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const usagePercentage = usageStats 
    ? (usageStats.requestsUsedToday / (usageStats.dailyLimit || 1)) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user?.businessName}</h1>
              <p className="text-gray-600 mt-1">{user?.email}</p>
            </div>
            <div className="text-right">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-gray-600">Current Plan</p>
                <p className="text-xl font-bold text-blue-600 capitalize">{user?.plan}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {newKeySecret && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-bold text-green-800 mb-2">API Key Created Successfully!</h2>
            <p className="text-green-700 mb-4">
              Please copy your API Secret right now. <strong>It will never be shown again!</strong>
            </p>
            <div className="bg-white p-4 rounded border border-green-200 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">API Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 p-2 rounded text-sm text-gray-800">{newKeySecret.key}</code>
                  <button onClick={() => copyToClipboard(newKeySecret.key)} className="p-2 text-gray-500 hover:text-gray-700" title="Copy Key">
                    <Copy size={20} />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-red-500 uppercase tracking-wider font-semibold mb-1">API Secret</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-red-50 p-2 rounded text-sm text-red-800 border border-red-100">{newKeySecret.secret}</code>
                  <button onClick={() => copyToClipboard(newKeySecret.secret)} className="p-2 text-gray-500 hover:text-gray-700" title="Copy Secret">
                    <Copy size={20} />
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setNewKeySecret(null)}
              className="mt-4 text-green-700 font-medium hover:text-green-900 underline"
            >
              I have securely saved my secret
            </button>
          </div>
        )}

        {/* Usage Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Daily Usage */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Daily Usage</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {usageStats?.requestsUsedToday || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              of {usageStats?.dailyLimit} requests
            </p>
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usagePercentage >= 95
                    ? 'bg-red-500'
                    : usagePercentage >= 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Active Keys */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Active API Keys</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{apiKeys.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total generated keys</p>
          </div>

          {/* Burst Limit */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Burst Limit</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {usageStats?.burstLimit || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">requests per minute</p>
          </div>

          {/* State Access */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">State Access</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {usageStats?.stateAccessCount || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              of {usageStats?.maxStateAccess} states
            </p>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
              <button
                onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                New Key
              </button>
            </div>
          </div>

          {/* New Key Form */}
          {showNewKeyForm && (
            <div className="border-b border-gray-200 p-6 bg-blue-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g., Production, Staging)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={createNewKey}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewKeyForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Keys List */}
          <div className="divide-y divide-gray-200">
            {apiKeys.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No API keys yet. Create one to get started.
              </div>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteKey(key.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* API Key */}
                    <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">API Key</p>
                        <p className="font-mono text-sm text-gray-900 break-all">{key.key}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="ml-2 text-gray-600 hover:text-gray-900"
                      >
                        <Copy size={18} />
                      </button>
                    </div>

                    {/* API Secret */}
                    <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">API Secret (keep private!)</p>
                        <p className="font-mono text-sm text-gray-900 break-all">
                          {visibleSecrets.has(key.id) ? key.secret : '•'.repeat(32)}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSecretVisibility(key.id)}
                        className="mx-2 text-gray-600 hover:text-gray-900"
                      >
                        {visibleSecrets.has(key.id) ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(key.secret)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Usage for this key */}
                  {key.lastUsed && (
                    <p className="text-xs text-gray-500 mt-3">
                      Last used {new Date(key.lastUsed).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Documentation Link */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Getting Started</h3>
          <p className="text-gray-700 mb-4">
            Check out our API documentation to start using the Village API.
          </p>
          <a
            href="/docs"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            View Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
