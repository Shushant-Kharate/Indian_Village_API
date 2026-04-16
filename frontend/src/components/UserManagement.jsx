import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchEmail, setSearchEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const token = localStorage.getItem('token');

  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetchUsers();
  }, [page, searchEmail, filterStatus, filterPlan]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        email: searchEmail,
        status: filterStatus,
        plan: filterPlan
      });

      const response = await axios.get(`${API_URL}/admin/api/users?${params}`, { headers });
      setUsers(response.data.data);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      setActionLoading(true);
      await axios.patch(
        `${API_URL}/admin/api/users/${userId}/status`,
        { status, reason: `Status changed to ${status} by admin` },
        { headers }
      );
      fetchUsers();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const updateUserPlan = async (userId, plan) => {
    try {
      setActionLoading(true);
      await axios.patch(
        `${API_URL}/admin/api/users/${userId}/plan`,
        { plan },
        { headers }
      );
      fetchUsers();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="email"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => {
              setSearchEmail(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={filterPlan}
            onChange={(e) => {
              setFilterPlan(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="unlimited">Unlimited</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 rounded text-white text-xs font-semibold" style={{
                        backgroundColor: {
                          free: '#6B7280',
                          premium: '#3B82F6',
                          pro: '#8B5CF6',
                          unlimited: '#F59E0B'
                        }[user.plan] || '#6B7280'
                      }}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 rounded text-white text-xs font-semibold" style={{
                        backgroundColor: {
                          active: '#10B981',
                          suspended: '#EF4444',
                          pending_approval: '#F59E0B'
                        }[user.status] || '#6B7280'
                      }}>
                        {user.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Email</label>
                  <p>{selectedUser.email}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Current Status</label>
                  <div className="space-x-2 mt-2">
                    {['active', 'suspended', 'pending_approval'].map(status => (
                      <button
                        key={status}
                        onClick={() => updateUserStatus(selectedUser.id, status)}
                        disabled={actionLoading || selectedUser.status === status}
                        className="px-4 py-2 rounded text-white text-sm font-semibold disabled:opacity-50" 
                        style={{
                          backgroundColor: selectedUser.status === status ? '#3B82F6' : '#6B7280',
                          cursor: selectedUser.status === status ? 'default' : 'pointer'
                        }}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Change Plan</label>
                  <div className="space-x-2 mt-2">
                    {['free', 'premium', 'pro', 'unlimited'].map(plan => (
                      <button
                        key={plan}
                        onClick={() => updateUserPlan(selectedUser.id, plan)}
                        disabled={actionLoading || selectedUser.plan === plan}
                        className="px-4 py-2 rounded text-white text-sm font-semibold disabled:opacity-50"
                        style={{
                          backgroundColor: selectedUser.plan === plan ? '#3B82F6' : '#6B7280',
                          cursor: selectedUser.plan === plan ? 'default' : 'pointer'
                        }}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Registered</label>
                  <p>{new Date(selectedUser.created_at).toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
