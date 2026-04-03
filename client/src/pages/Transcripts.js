import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transcriptAPI } from '../services/api';

const Transcripts = () => {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      const data = await transcriptAPI.getTranscripts({ limit: 50 });
      setTranscripts(data.data);
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) {
      loadTranscripts();
      return;
    }
    
    try {
      const data = await transcriptAPI.searchTranscripts({ query: search });
      setTranscripts(data.data);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Transcripts</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcripts..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Search
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {transcripts.map((transcript) => (
          <div key={transcript._id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">
                    {transcript.callId?.callerNumber || 'Unknown'}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(transcript.createdAt).toLocaleString()}
                  </span>
                </div>
                {transcript.summary && (
                  <p className="text-gray-600 mb-3">{transcript.summary}</p>
                )}
                <div className="text-sm text-gray-500">
                  {transcript.segments?.length || 0} segments
                </div>
              </div>
              <Link
                to={`/transcripts/${transcript._id}`}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transcripts;
