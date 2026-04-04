import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { transcriptAPI } from '../services/api';

const TranscriptDetail = () => {
  const { id } = useParams();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTranscript = async () => {
    try {
      const data = await transcriptAPI.getTranscript(id);
      setTranscript(data.data);
    } catch (error) {
      console.error('Error loading transcript:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!transcript) return <div className="p-8">Transcript not found</div>;

  return (
    <div className="p-8">
      <Link to="/transcripts" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Transcripts
      </Link>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Transcript</h1>
        <button
          onClick={() => transcriptAPI.exportTranscript(id)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export
        </button>
      </div>

      <div className="grid gap-6">
        {transcript.summary && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-3">Summary</h2>
            <p className="text-gray-700">{transcript.summary}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Conversation</h2>
          <div className="space-y-4">
            {transcript.segments?.map((segment, idx) => (
              <div key={idx} className={`p-4 rounded ${
                segment.speaker === 'caller' ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">
                    {segment.speaker === 'caller' ? 'Caller' : 'AI Agent'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(segment.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-800">{segment.text}</p>
              </div>
            ))}
          </div>
        </div>

        {transcript.actionItems && transcript.actionItems.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Action Items</h2>
            <ul className="space-y-2">
              {transcript.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <input type="checkbox" checked={item.status === 'completed'} readOnly />
                  <span>{item.item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptDetail;
