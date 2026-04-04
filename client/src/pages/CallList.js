import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { callAPI } from '../services/api';

const CallList = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    loadCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const data = await callAPI.getCalls({ page, limit: 20 });
      setCalls(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Call History</h1>
      
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Call SID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caller</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calls.map((call) => (
              <tr key={call._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {call.callSid.substring(0, 20)}...
                </td>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(call.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link to={`/calls/${call._id}`} className="text-blue-600 hover:text-blue-800">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="px-6 py-4 flex items-center justify-between border-t">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= pagination.pages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallList;
