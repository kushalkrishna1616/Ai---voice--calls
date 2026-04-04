import React, { useState, useEffect, useRef } from 'react';
import { callAPI } from '../services/api';
import { FiSend, FiX, FiMessageSquare, FiMic, FiMicOff } from 'react-icons/fi';

const CallSimulator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
        // We'll call handleSend manually since setMessage is async and we need the transcript
        processMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel(); // Stop talking if listening
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const processMessage = async (userMessage) => {
    if (!userMessage.trim() || loading) return;

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
      setMessage('');
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    processMessage(message);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 bg-blue-600 text-white rounded-full p-4 shadow-xl hover:bg-blue-700 transition-all z-50 flex items-center gap-2 group"
      >
        <div className="relative">
          <FiMessageSquare size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </div>
        <span className="font-semibold px-1">Simulate AI Call</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-8 w-96 bg-white rounded-xl shadow-2xl z-50 flex flex-col border border-gray-200 overflow-hidden transform transition-all animate-slide-up">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-bold">Grok Voice System</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform"><FiX size={20} /></button>
          </div>

          <div 
            ref={scrollRef}
            className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50"
          >
            {history.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                <div className="bg-blue-50 p-4 rounded-lg mb-4 text-xs italic">
                  "Hi! You can type or click the microphone to talk to me. I'll respond instantly with voice."
                </div>
                <p>Start a conversation with your AI brain!</p>
              </div>
            )}
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-gray-200 flex flex-col gap-3">
             <form onSubmit={handleSend} className="flex gap-2 relative items-center">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-all ${
                  isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                }`}
                title={isListening ? "Stop listening" : "Start voice chat"}
              >
                {isListening ? <FiMicOff size={20} /> : <FiMic size={20} />}
              </button>

              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type to talk..."}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isListening ? 'bg-red-50 border-red-200 ring-red-100 ring-2' : ''
                }`}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md active:scale-95"
              >
                <FiSend size={18} />
              </button>
            </form>

            <div className="text-[10px] text-gray-400 flex justify-between items-center px-1">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
                <input 
                  type="checkbox" 
                  checked={audioEnabled} 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                  onChange={(e) => setAudioEnabled(e.target.checked)} 
                />
                AI Voice Response
              </label>
              <div className="flex items-center gap-1 text-green-600 font-medium tracking-tight">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Web Simulation Active
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}} />
    </>
  );
};

export default CallSimulator;
