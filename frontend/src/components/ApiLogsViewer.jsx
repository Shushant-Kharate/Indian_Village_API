import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ApiLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [filterEndpoint, setFilterEndpoint] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [minResponseTime, setMinResponseTime] = useState('');
  
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetchLogs();
  }, [page, filterEndpoint, filterStatus, filterStartDate, filterEndDate, minResponseTime]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 50,
        endpoint: filterEndpoint,
        statusCode: filterStatus,
        startDate: filterStartDate,
        endDate: filterEndDate,
        minResponseTime: minResponseTime
      });

      // Filter out empty params
      Array.from(params.entries()).forEach(([key, value]) => {
        if (!value) params.delete(key);
      });

      const response = await axios.get(`${API_URL}/admin/api/logs?${params}`, { headers });
      setLogs(response.data.data);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusCode) => {
    if (statusCode < 300) return 'bg-green-100 text-green-800';
    if (statusCode < 400) return 'bg-blue-100 text-blue-800';
    if (statusCode < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const maskApiKey = (key) => {
    if (!key) return 'N/A';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  const maskIp = (ip) => {
    if (!ip) return 'N/A';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.**`;
    }
    return ip;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">API Logs Viewer</h2>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Endpoint (e.g., /api/v1/states)"
            value={filterEndpoint}
            onChange={(e) => {
              setFilterEndpoint(e.target.value);
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
            <option value="">All Status</option>
            <option value="2">2xx Success</option>
            <option value="4">4xx Client Error</option>
            <option value="5">5xx Server Error</option>
          </select>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => {
              setFilterStartDate(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => {
              setFilterEndDate(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Min Response Time (ms)"
            value={minResponseTime}
            onChange={(e) => {
              setMinResponseTime(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          {/* Logs Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Response Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">API Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.length > 0 ? logs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-xs text-gray-900 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900">{log.endpoint}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                        <span className="px-2 py-1 bg-gray-100 rounded">{log.method}</span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-1 rounded font-semibold ${getStatusColor(log.status_code)}`}>
                          {log.status_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900">
                        <span className={log.response_time > 100 ? 'font-semibold text-red-600' : ''}>
                          {log.response_time}ms
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 font-mono">
                        {maskApiKey(log.api_key)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {maskIp(log.ip_address)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}
