import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { FiPhone, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CallSimulator from '../components/CallSimulator';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('call:new', (data) => {
      console.log('New call:', data);
      loadDashboardData();
    });

    socket.on('call:status', (data) => {
      console.log('Call status update:', data);
      loadDashboardData();
    });

    return () => {
      socket.off('call:new');
      socket.off('call:status');
    };
  }, [socket]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, timeSeriesData] = await Promise.all([
        analyticsAPI.getDashboardStats({ period: '7' }),
        analyticsAPI.getTimeSeries({ period: '7' })
      ]);

      setStats(statsData.data);
      setTimeSeries(timeSeriesData.data);
      setRecentCalls(statsData.data.recentCalls || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Calls</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.overview?.totalCalls || 0}
              </p>
            </div>
            <FiPhone className="text-blue-500 text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.overview?.completedCalls || 0}
              </p>
            </div>
            <FiCheckCircle className="text-green-500 text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Failed</p>
              <p className="text-3xl font-bold text-red-600">
                {stats?.overview?.failedCalls || 0}
              </p>
            </div>
            <FiXCircle className="text-red-500 text-3xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-800">
                {formatDuration(Math.round(stats?.overview?.averageDuration || 0))}
              </p>
            </div>
            <FiClock className="text-purple-500 text-3xl" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Calls Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="totalCalls" stroke="#3B82F6" strokeWidth={2} />
            <Line type="monotone" dataKey="completedCalls" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Calls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Calls</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCalls.map((call) => (
                <tr key={call._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.callerNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      call.status === 'completed' ? 'bg-green-100 text-green-800' :
                      call.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(call.duration || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.detectedIntent || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(call.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <CallSimulator />
    </div>
  );
};

export default Dashboard;
