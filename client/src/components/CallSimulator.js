import React, { useState, useEffect, useRef } from 'react';
import { callAPI } from '../services/api';
import { FiSend, FiX, FiMessageSquare } from 'react-icons/fi';

const CallSimulator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const speak = (text) => {
    if (!audioEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message;
    setMessage('');
    setLoading(true);
    
    // Add to local history
    const newHistory = [...history, { role: 'user', content: userMessage }];
    setHistory(newHistory);

    try {
      const response = await callAPI.simulate({
        message: userMessage,
        conversationHistory: history
      });

      if (response.success) {
        const aiMsg = response.data.message;
        setHistory([...newHistory, { role: 'assistant', content: aiMsg }]);
        speak(aiMsg);
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      setHistory([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your Grok API key.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 bg-blue-600 text-white rounded-full p-4 shadow-xl hover:bg-blue-700 transition-all z-50 flex items-center gap-2"
      >
        <FiMessageSquare size={24} />
        <span className="font-semibold">Simulate AI Call</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-8 w-96 bg-white rounded-xl shadow-2xl z-50 flex flex-col border border-gray-200 overflow-hidden transform transition-all animate-slide-up">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <h3 className="font-bold">Grok Call Simulator</h3>
            <button onClick={() => setIsOpen(false)}><FiX size={20} /></button>
          </div>

          <div 
            ref={scrollRef}
            className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50"
          >
            {history.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                <p>Click send to start a conversation with your AI brain!</p>
              </div>
            )}
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm shadow-sm ${
                  msg.role === 'user' ? 'bg-blue-100 text-blue-900 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type to talk or type 'hello'..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <FiSend size={18} />
            </button>
          </form>

          <div className="p-2 bg-gray-100 text-[10px] text-center text-gray-500 flex justify-center items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors">
              <input 
                type="checkbox" 
                checked={audioEnabled} 
                onChange={(e) => setAudioEnabled(e.target.checked)} 
              />
              Enable Audio Voice
            </label>
            <span>|</span>
            <span>Bypass Twilio Mode (Active)</span>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}} />
    </>
  );
};

export default CallSimulator;
