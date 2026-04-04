import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Analytics = () => {
  const [intentData, setIntentData] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [callerInsights, setCallerInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [intent, hours, insights] = await Promise.all([
        analyticsAPI.getIntentAnalysis({ days: '30' }),
        analyticsAPI.getPeakHours({ days: '30' }),
        analyticsAPI.getCallerInsights({ days: '30', limit: '10' })
      ]);

      setIntentData(intent.data);
      setPeakHours(hours.data);
      setCallerInsights(insights.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
        <button
          onClick={() => analyticsAPI.exportAnalytics({ format: 'csv' })}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Intent Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={intentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ intent, count }) => `${intent}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {intentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Peak Call Hours</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Number of Calls', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Caller Insights</h2>
          {callerInsights && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{callerInsights.summary.totalUniqueCallers}</div>
                  <div className="text-sm text-gray-500">Total Unique Callers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{callerInsights.summary.returningCallers}</div>
                  <div className="text-sm text-gray-500">Returning Callers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{callerInsights.summary.newCallers}</div>
                  <div className="text-sm text-gray-500">New Callers</div>
                </div>
              </div>

              <h3 className="font-semibold mb-3">Most Frequent Callers</h3>
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs">Number</th>
                    <th className="px-4 py-2 text-left text-xs">Call Count</th>
                    <th className="px-4 py-2 text-left text-xs">Avg Duration</th>
                    <th className="px-4 py-2 text-left text-xs">Last Call</th>
                  </tr>
                </thead>
                <tbody>
                  {callerInsights.frequentCallers.map((caller, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 text-sm">{caller.number}</td>
                      <td className="px-4 py-2 text-sm">{caller.callCount}</td>
                      <td className="px-4 py-2 text-sm">{Math.floor(caller.avgDuration / 60)}:{(caller.avgDuration % 60).toString().padStart(2, '0')}</td>
                      <td className="px-4 py-2 text-sm">{new Date(caller.lastCall).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
