import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Colors for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [topStates, setTopStates] = useState([]);
  const [requestsTimeline, setRequestsTimeline] = useState([]);
  const [userDistribution, setUserDistribution] = useState([]);
  const [responseTimeTrends, setResponseTimeTrends] = useState([]);
  const [requestsByEndpoint, setRequestsByEndpoint] = useState([]);
  const [usageHeatmap, setUsageHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      const [
        overviewRes,
        statesRes,
        timelineRes,
        distributionRes,
        trendsRes,
        endpointRes,
        heatmapRes
      ] = await Promise.all([
        axios.get(`${API_URL}/admin/analytics/overview`, { headers }),
        axios.get(`${API_URL}/admin/analytics/top-states`, { headers }),
        axios.get(`${API_URL}/admin/analytics/requests-timeline?days=30`, { headers }),
        axios.get(`${API_URL}/admin/analytics/user-distribution`, { headers }),
        axios.get(`${API_URL}/admin/analytics/response-time-trends`, { headers }),
        axios.get(`${API_URL}/admin/analytics/requests-by-endpoint`, { headers }),
        axios.get(`${API_URL}/admin/analytics/usage-heatmap`, { headers })
      ]);

      setOverview(overviewRes.data.data);
      setTopStates(statesRes.data.data);
      setRequestsTimeline(timelineRes.data.data);
      setUserDistribution(distributionRes.data.data);
      setResponseTimeTrends(trendsRes.data.data);
      setRequestsByEndpoint(endpointRes.data.data);
      setUsageHeatmap(heatmapRes.data.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Key Metrics Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Villages */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Villages</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(overview.totalVillages / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="text-4xl text-blue-500">📍</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Across 28 states</p>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">{overview.activeUsers}</p>
              </div>
              <div className="text-4xl text-green-500">👥</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Last 7 days</p>
          </div>

          {/* Today's Requests */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Today's Requests</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(overview.todayRequests / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="text-4xl text-yellow-500">📊</div>
            </div>
            <p className={`text-xs mt-2 ${overview.requestsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.requestsChange}% from yesterday
            </p>
          </div>

          {/* Avg Response Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">{overview.averageResponseTime}ms</p>
              </div>
              <div className="text-4xl text-purple-500">⚡</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Last 24 hours</p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 States by Village Count */}
        {topStates.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 States by Village Count</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topStates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="villages" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* User Distribution by Plan */}
        {userDistribution.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution by Plan</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* API Requests Timeline */}
      {requestsTimeline.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Requests (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={requestsTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Response Time Trends */}
      {responseTimeTrends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Trends (p95, p99)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={responseTimeTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="avg" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
              <Area type="monotone" dataKey="p95" stackId="1" stroke="#F59E0B" fill="#F59E0B" />
              <Area type="monotone" dataKey="p99" stackId="1" stroke="#EF4444" fill="#EF4444" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Requests by Endpoint */}
      {requestsByEndpoint.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests by Endpoint (Last 24 Hours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={requestsByEndpoint}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="successful" stackId="a" fill="#10B981" />
              <Bar dataKey="failed" stackId="a" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Usage Heatmap */}
      {usageHeatmap.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Hour (Last 7 Days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="space-y-1">
                {Array.from({ length: Math.ceil(usageHeatmap.length / 6) }).map((_, rowIdx) => (
                  <tr key={rowIdx} className="flex gap-2">
                    {usageHeatmap.slice(rowIdx * 6, (rowIdx + 1) * 6).map((hour, idx) => (
                      <td key={idx} className="flex-1">
                        <div
                          className="p-2 text-center text-xs text-white rounded"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${(hour.intensity || 0) / 100})`,
                            minHeight: '60px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          title={`${hour.hour}: ${hour.requests} requests`}
                        >
                          <div className="font-semibold">{hour.hour}</div>
                          <div>{hour.requests}</div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
