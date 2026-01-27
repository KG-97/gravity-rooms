import React, { useEffect, useRef, useState } from 'react';
import { connectLiveSession } from '../services/gemini';
import { decodeAudioData, decodeBase64, pcmToGeminiBlob } from '../utils/audio';
import { Mic, Radio, Wifi, Loader2 } from 'lucide-react';
import { LiveServerMessage } from '@google/genai';

const LiveInterface: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioLevels, setAudioLevels] = useState<number[]>([10, 10, 10, 10, 10]);
    
    // Audio Contexts
    const inputContextRef = useRef<AudioContext | null>(null);
    const outputContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    // Playback Queue
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    // Session
    const sessionPromiseRef = useRef<Promise<any> | null>(null);

    const cleanup = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Stop audio contexts
        inputContextRef.current?.close();
        outputContextRef.current?.close();
        
        // Stop sources
        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();

        // Close session
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
        }
        
        setIsConnected(false);
        setAudioLevels([10, 10, 10, 10, 10]);
    };

    useEffect(() => {
        return cleanup;
    }, []);

    const visualize = () => {
        if (!analyserRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate 5 bars from the frequency data
        const bars = 5;
        const step = Math.floor(bufferLength / bars);
        const newLevels = [];

        for (let i = 0; i < bars; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) {
                sum += dataArray[i * step + j];
            }
            // Scale average (0-255) to percentage (10-100) for height
            const avg = sum / step;
            const val = Math.max(10, (avg / 255) * 100); 
            newLevels.push(val);
        }

        setAudioLevels(newLevels);
        animationFrameRef.current = requestAnimationFrame(visualize);
    };

    const startSession = async () => {
        setError(null);
        setIsSessionActive(true);

        try {
            // Setup Audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            inputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            outputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

            const inputSource = inputContextRef.current.createMediaStreamSource(stream);
            
            // Analyser for visualization
            const analyser = inputContextRef.current.createAnalyser();
            analyser.fftSize = 64; // Low resolution for 5 bars
            analyser.smoothingTimeConstant = 0.5;
            inputSource.connect(analyser);
            analyserRef.current = analyser;
            visualize();

            // Processor for Gemini
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = pcmToGeminiBlob(inputData);
                
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                }
            };

            inputSource.connect(processor);
            processor.connect(inputContextRef.current.destination);

            // Setup Gemini Live Session
            sessionPromiseRef.current = connectLiveSession({
                onopen: () => {
                    setIsConnected(true);
                    console.log("Live Session Connected");
                },
                onmessage: async (msg: LiveServerMessage) => {
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && outputContextRef.current) {
                        const bytes = decodeBase64(audioData);
                        const buffer = await decodeAudioData(bytes, outputContextRef.current, 24000, 1);
                        
                        const ctx = outputContextRef.current;
                        const source = ctx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(ctx.destination);
                        
                        // Schedule playback
                        const currentTime = ctx.currentTime;
                        const startTime = Math.max(nextStartTimeRef.current, currentTime);
                        source.start(startTime);
                        
                        nextStartTimeRef.current = startTime + buffer.duration;
                        
                        source.onended = () => sourcesRef.current.delete(source);
                        sourcesRef.current.add(source);
                    }

                    if (msg.serverContent?.interrupted) {
                        sourcesRef.current.forEach(s => s.stop());
                        sourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }
                },
                onclose: () => {
                    console.log("Live Session Closed");
                    setIsConnected(false);
                },
                onerror: (e) => {
                    console.error("Live Session Error", e);
                    setError("Connection Interrupted");
                    cleanup();
                    setIsSessionActive(false);
                }
            });

        } catch (err) {
            console.error(err);
            setError("Failed to initialize audio systems");
            setIsSessionActive(false);
        }
    };

    const stopSession = () => {
        cleanup();
        setIsSessionActive(false);
    };

    // Helper for status text
    const getStatusText = () => {
        if (error) return "SYSTEM FAILURE";
        if (!isSessionActive) return "OFFLINE";
        if (!isConnected) return "INITIALIZING UPLINK...";
        return "LIVE CONNECTION ESTABLISHED";
    };

    return (
        <div className="flex flex-col h-full items-center justify-center p-6 space-y-8 relative overflow-hidden bg-black">
            {/* Ambient Background */}
            <div className={`absolute inset-0 bg-red-900/5 transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
            
            {/* Header / Status */}
            <div className="text-center space-y-4 z-10">
                <h2 className="text-3xl font-bold text-white font-mono tracking-tighter flex items-center justify-center gap-3">
                    <Radio className={`w-8 h-8 ${isConnected ? 'text-red-500 animate-pulse' : 'text-neutral-600'}`} />
                    LIVE INTERROGATION
                </h2>
                
                <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : isSessionActive ? 'bg-yellow-500 animate-pulse' : 'bg-neutral-600'}`} />
                    <p className={`font-mono text-xs ${isConnected ? 'text-emerald-500' : isSessionActive ? 'text-yellow-500' : 'text-neutral-600'}`}>
                        {getStatusText()}
                    </p>
                </div>

                <p className="text-neutral-500 font-mono text-sm max-w-md mx-auto h-6">
                    {isConnected ? "Direct neural link active. Speak clearly." : "Ready to establish connection."}
                </p>
            </div>

            {/* Main Interaction Element */}
            <div className="relative z-10 group">
                <button
                    onClick={isSessionActive ? stopSession : startSession}
                    className={`
                        w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative
                        ${isSessionActive 
                            ? 'border-red-500 bg-red-950/20 shadow-[0_0_50px_rgba(220,38,38,0.2)]' 
                            : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800'
                        }
                    `}
                >
                    {isSessionActive ? (
                        <div className="flex gap-2 items-center justify-center h-24 w-24">
                             {audioLevels.map((level, i) => (
                                <div 
                                    key={i} 
                                    className="w-3 bg-red-500 rounded-full transition-all duration-75"
                                    style={{ 
                                        height: `${Math.max(10, level)}%`,
                                        opacity: isConnected ? 1 : 0.5 
                                    }} 
                                />
                            ))}
                        </div>
                    ) : (
                        <Mic className="w-16 h-16 text-neutral-500 group-hover:text-white transition-colors" />
                    )}
                    
                    {/* Status Ring Spinner for Connecting */}
                    {isSessionActive && !isConnected && (
                        <div className="absolute inset-0 rounded-full border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    )}
                </button>
                
                {isSessionActive && (
                    <div className="absolute -bottom-12 left-0 right-0 text-center">
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
                            {isConnected ? <Wifi className="w-3 h-3 text-emerald-500" /> : <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />}
                            <span className="text-[10px] font-mono text-neutral-400">
                                {isConnected ? "16KHZ STREAM STABLE" : "HANDSHAKE..."}
                            </span>
                         </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="absolute bottom-24 p-4 bg-red-950/80 border border-red-900 rounded text-red-200 font-mono text-xs z-20 backdrop-blur-sm max-w-sm text-center">
                    ERROR: {error}
                </div>
            )}
            
            <div className="absolute bottom-6 font-mono text-[10px] text-neutral-800">
                PROTOCOL: GEMINI-LIVE-AUDIO // 16KHZ UPLINK
            </div>
        </div>
    );
};

export default LiveInterface;