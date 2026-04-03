import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { callAPI } from '../services/api';

const CallDetail = () => {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCall();
  }, [id]);

  const loadCall = async () => {
    try {
      const data = await callAPI.getCall(id);
      setCall(data.data);
    } catch (error) {
      console.error('Error loading call:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!call) return <div className="p-8">Call not found</div>;

  return (
    <div className="p-8">
      <Link to="/calls" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Calls
      </Link>
      
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Call Details</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Call Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Call SID</dt>
              <dd className="font-mono text-sm">{call.callSid}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Caller Number</dt>
              <dd>{call.callerNumber}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  call.status === 'completed' ? 'bg-green-100 text-green-800' :
                  call.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {call.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Duration</dt>
              <dd>{call.formattedDuration}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Detected Intent</dt>
              <dd>{call.detectedIntent || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Sentiment</dt>
              <dd>{call.sentiment || 'N/A'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Conversation</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {call.conversation && call.conversation.map((msg, idx) => (
              <div key={idx} className={`p-3 rounded ${
                msg.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
                <div className="text-xs text-gray-500 mb-1">
                  {msg.role === 'user' ? 'Caller' : 'AI Agent'}
                </div>
                <div className="text-sm">{msg.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallDetail;
