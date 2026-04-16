import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, Clock } from 'lucide-react';

export default function UserApprovalWorkflow() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [action, setAction] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        'http://localhost:3000/api/v1/admin/users?status=pending',
        { headers }
      );
      setPendingUsers(res.data.data);
    } catch (err) {
      console.error('Error fetching pending users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `http://localhost:3000/api/v1/admin/users/${userId}/approve`,
        { notes: actionReason },
        { headers }
      );
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      setSelectedUser(null);
      setActionReason('');
      setAction(null);
      alert('User approved successfully!');
    } catch (err) {
      alert('Error approving user');
    }
  };

  const handleReject = async (userId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `http://localhost:3000/api/v1/admin/users/${userId}/reject`,
        { reason: actionReason },
        { headers }
      );
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      setSelectedUser(null);
      setActionReason('');
      setAction(null);
      alert('User rejected');
    } catch (err) {
      alert('Error rejecting user');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending users...</div>;
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <Check className="inline text-green-600 mb-2" size={24} />
        <p className="text-green-800">No pending approvals!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Clock size={20} className="text-yellow-600" />
        Pending Approvals ({pendingUsers.length})
      </h3>

      <div className="space-y-3">
        {pendingUsers.map(user => (
          <div
            key={user.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{user.businessName}</h4>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Pending {Math.floor((Date.now() - new Date(user.created_at)) / 86400000)} days
              </span>
            </div>

            {user.gstNumber && (
              <p className="text-sm text-gray-600 mb-2">
                <strong>GST:</strong> {user.gstNumber}
              </p>
            )}

            {user.phone && (
              <p className="text-sm text-gray-600 mb-2">
                <strong>Phone:</strong> {user.phone}
              </p>
            )}

            {user.address && (
              <p className="text-sm text-gray-600 mb-3">
                <strong>Address:</strong> {user.address}
              </p>
            )}

            {selectedUser === user.id && action ? (
              <div className="mt-4 space-y-2 bg-gray-50 p-3 rounded">
                <label className="block text-sm font-medium text-gray-700">
                  {action === 'approve' ? 'Approval Notes' : 'Rejection Reason'}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter your notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      action === 'approve'
                        ? handleApprove(user.id)
                        : handleReject(user.id)
                    }
                    className={`flex-1 px-3 py-2 text-white rounded text-sm font-medium ${
                      action === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setAction(null);
                      setActionReason('');
                    }}
                    className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedUser(user.id);
                    setAction('approve');
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700"
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setSelectedUser(user.id);
                    setAction('reject');
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700"
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
