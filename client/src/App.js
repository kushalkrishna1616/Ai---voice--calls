import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CallList from './pages/CallList';
import CallDetail from './pages/CallDetail';
import Transcripts from './pages/Transcripts';
import TranscriptDetail from './pages/TranscriptDetail';
import Analytics from './pages/Analytics';
import WebCall from './pages/WebCall';
import { SocketProvider } from './context/SocketContext';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="calls" element={<CallList />} />
            <Route path="calls/:id" element={<CallDetail />} />
            <Route path="transcripts" element={<Transcripts />} />
            <Route path="transcripts/:id" element={<TranscriptDetail />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="webcall" element={<WebCall />} />
          </Route>
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
