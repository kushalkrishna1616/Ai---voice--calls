import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiPhoneOff, FiPhone } from 'react-icons/fi';
import { callAPI } from '../services/api';

const WebCall = () => {
    const [status, setStatus] = useState('idle'); 
    const [callSid, setCallSid] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [history, setHistory] = useState([]);
    const [visualizer, setVisualizer] = useState(Array.from({ length: 15 }, () => 2));
    
    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);
    const statusRef = useRef('idle');

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // Premium Animated Visualizer
    useEffect(() => {
        let interval;
        if (isListening || isThinking) {
            interval = setInterval(() => {
                setVisualizer(Array.from({ length: 15 }, () => Math.random() * (isListening ? 90 : 30) + 10));
            }, 100);
        } else {
            setVisualizer(Array.from({ length: 15 }, () => 2));
        }
        return () => clearInterval(interval);
    }, [isListening, isThinking]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history]);

    const speak = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsListening(false);
        window.speechSynthesis.speak(utterance);
    };

    // Fresh Engine Spawner on Each Tap with "Sticky Mode"
    const startRecognitionInstance = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; // Set to true for more active feedback
        recognition.lang = 'en-IN';

        let hasProducedResult = false;

        recognition.onstart = () => {
            setIsListening(true);
            console.log("Mic Live");
        };
        
        recognition.onresult = (event) => {
            const lastResultIndex = event.results.length - 1;
            const transcript = event.results[lastResultIndex][0].transcript;
            
            if (event.results[lastResultIndex].isFinal) {
                hasProducedResult = true;
                processMessage(transcript);
                recognition.stop();
            }
        };

        recognition.onerror = (event) => {
            console.warn("Speech Rec Error:", event.error);
            // If it closed immediately due to no-speech, don't kill the UI yet
            if (event.error === 'no-speech' && !hasProducedResult) {
                console.log("Sticky Mic: Restarting session...");
                return; // Let onend handle the restart if needed
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            // "Sticky" logic: If the mic closed without a result, and we're still supposed to be listening
            if (!hasProducedResult && statusRef.current === 'connected' && !isThinking) {
                 // Briefly setting false ensure UI toggle is possible if needed
                 setIsListening(false);
            } else {
                 setIsListening(false);
            }
        };

        return recognition;
    };

    const toggleMic = () => {
        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null; // Kill the sticky logic on manual stop
                recognitionRef.current.stop();
            }
            setIsListening(false);
        } else {
            window.speechSynthesis.cancel();
            const rec = startRecognitionInstance();
            if (rec) {
                recognitionRef.current = rec;
                // Add a small 200ms delay to help browser handle audio context switch
                setTimeout(() => rec.start(), 200);
            }
        }
    };

    const startCall = async () => {
        try {
            setStatus('calling'); // Trigger loading screen immediately
            const response = await callAPI.startWebCall();
            if (response.success) {
                setCallSid(response.data.callSid);
                setStatus('connected');
                const greet = "System online. I can hear you now. How can I assist you?";
                setHistory([{ role: 'assistant', content: greet }]);
                setTimeout(() => speak(greet), 1000);
            }
        } catch (error) {
            setStatus('idle');
            alert("Connection link failure.");
        }
    };

    const processMessage = async (content) => {
        if (!content || !content.trim() || isThinking || !callSid) return;
        
        // Optimistic UI: Immediately show user's bubble and start thinking
        const newHistory = [...history, { role: 'user', content: content }];
        setHistory(newHistory);
        setIsThinking(true);

        try {
            const response = await callAPI.sendWebMessage({
                callSid,
                message: content,
                history: newHistory
            });
            
            if (response.success) {
                const aiMsg = response.data.message;
                setHistory(prev => [...prev, { role: 'assistant', content: aiMsg }]);
                setIsThinking(false);
                speak(aiMsg);
            }
        } catch (error) {
            setIsThinking(false);
            setHistory(prev => [...prev, { role: 'assistant', content: "Lost connection to brain. Reconnecting..." }]);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 font-sans select-none overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <div className="z-10 w-full max-w-lg lg:scale-110">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-t from-slate-400 to-white">VOICE CALL</h1>
                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                        Neural Link Active
                    </div>
                </div>

                {status === 'calling' ? (
                    <div className="bg-slate-900/40 border border-white/5 rounded-[56px] p-20 flex flex-col items-center shadow-3xl backdrop-blur-3xl animate-pulse">
                        <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-10"></div>
                        <h3 className="text-xl font-black tracking-widest text-blue-400">CONNECTING...</h3>
                        <p className="text-slate-500 text-[10px] mt-4 font-bold uppercase tracking-[0.4em]">AI Brain Initializing</p>
                        <p className="text-slate-600 text-[8px] mt-2 italic font-mono">Routing through Groq Acceleration...</p>
                    </div>
                ) : status === 'idle' || status === 'ended' ? (
                    <div className="bg-slate-900/30 border border-white/5 rounded-[56px] p-20 flex flex-col items-center shadow-3xl backdrop-blur-3xl">
                        <button onClick={startCall} className="w-28 h-28 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_60px_-10px_rgba(37,99,235,0.7)] hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all">
                            <FiPhone size={44} />
                        </button>
                        <p className="mt-10 text-slate-500 text-xs font-bold tracking-[0.5em] uppercase">Start Session</p>
                    </div>
                ) : (
                    <div className="bg-slate-900/60 border border-white/10 rounded-[56px] px-10 py-12 shadow-2xl backdrop-blur-3xl flex flex-col items-center relative overflow-hidden">
                        {/* Header Stats */}
                        <div className="w-full flex justify-between items-center mb-10 opacity-40">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span className="text-[10px] font-black tracking-widest uppercase">Live Link</span>
                            </div>
                            <span className="text-[10px] font-mono tracking-widest">SID:{callSid?.split('_')[1]}</span>
                        </div>

                        {/* Visualizer Area */}
                        <div className="h-20 w-full flex items-center justify-center gap-1.5 mb-12">
                            {visualizer.map((h, i) => (
                                <div key={i} style={{ height: `${h}%` }} className={`w-2 rounded-full transition-all duration-200 ${isListening ? 'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]' : isThinking ? 'bg-amber-400 animate-pulse' : 'bg-slate-800'}`}></div>
                            ))}
                        </div>

                        {/* Conversational Bubbles */}
                        <div ref={scrollRef} className="w-full h-52 overflow-y-auto mb-12 pr-2 space-y-6 scroll-smooth mask-fade no-scrollbar">
                            {history.length === 0 && <p className="text-center text-slate-500 text-xs italic mt-10">Waiting for greeting...</p>}
                            {history.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-6 py-4 rounded-3xl text-sm leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800/80 border border-white/10 rounded-tl-none'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800/80 px-6 py-4 rounded-3xl rounded-tl-none flex gap-1.5 items-center">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pure Voice Controls */}
                        <div className="w-full flex items-center justify-center gap-14">
                            <div className="flex flex-col items-center gap-3">
                                <button onClick={toggleMic} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.6)] scale-110' : 'bg-slate-800 hover:bg-slate-700'}`}>
                                    {isListening ? <FiMic size={32} className="text-white animate-pulse" /> : <FiMicOff size={32} className="text-slate-500" />}
                                </button>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isListening ? 'text-green-400' : 'text-slate-600'}`}>{isListening ? "Listening" : "Tap Mic"}</span>
                            </div>

                            <div className="flex flex-col items-center gap-3">
                                <button onClick={() => { setStatus('ended'); setCallSid(null); window.speechSynthesis.cancel(); }} className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.3)] hover:bg-red-500 active:scale-95 transition-all">
                                    <FiPhoneOff size={32} />
                                </button>
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">End Call</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .mask-fade { mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-up { animation: fade-up 0.5s ease-out forwards; }
            `}} />
        </div>
    );
};

export default WebCall;
