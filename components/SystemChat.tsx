import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { chatWithSystem, transcribeAudio } from '../services/gemini';
import { blobToBase64 } from '../utils/audio';
import { Send, Terminal, Cpu, Mic, Square } from 'lucide-react';

const SystemChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    { role: 'model', text: "SYSTEM ONLINE. GATES ARCHIVE ACCESSED. AWAITING QUERY.", timestamp: new Date() }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await chatWithSystem(userMsg.text, history.map(h => ({ role: h.role, text: h.text })));
      setHistory(prev => [...prev, { role: 'model', text: responseText || "DATA CORRUPTION. RETRY.", timestamp: new Date() }]);
    } catch (err) {
      console.error(err);
      setHistory(prev => [...prev, { role: 'model', text: "SYSTEM ERROR. CONNECTION LOST.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' }); // Browsers usually record to webm
            setIsTyping(true);
            try {
                const base64 = await blobToBase64(blob);
                const text = await transcribeAudio(base64, blob.type);
                setInput(prev => prev + (prev ? ' ' : '') + text);
            } catch (error) {
                console.error("Transcription failed", error);
            } finally {
                setIsTyping(false);
                // clean up stream
                stream.getTracks().forEach(t => t.stop());
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (e) {
        console.error("Failed to access mic", e);
        alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border-l border-neutral-800">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-500" />
            <span className="font-mono text-sm font-bold text-white tracking-wider">SYSTEM_LOG_V1.0</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {history.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded p-3 font-mono text-sm ${
                        msg.role === 'user' 
                        ? 'bg-neutral-800 text-white border border-neutral-700' 
                        : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50'
                    }`}>
                        {msg.text}
                    </div>
                    <span className="text-[10px] text-neutral-600 font-mono mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString()}
                    </span>
                </div>
            ))}
            {isTyping && (
                <div className="flex items-start gap-2">
                    <div className="bg-emerald-950/30 p-3 rounded border border-emerald-900/50 flex gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                    </div>
                </div>
            )}
            <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900/30">
            <div className="relative flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="QUERY THE ARCHIVE..."
                        className="w-full bg-black border border-neutral-800 text-white font-mono text-sm p-3 pr-10 rounded focus:border-emerald-500 focus:outline-none"
                    />
                </div>
                
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-3 rounded border transition-all ${
                        isRecording 
                        ? 'bg-red-900/30 border-red-500 text-red-500 animate-pulse' 
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                    }`}
                >
                    {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                </button>

                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white rounded disabled:opacity-30"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
};

export default SystemChat;