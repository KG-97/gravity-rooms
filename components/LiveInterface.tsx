import React from 'react';
import { Mic, Radio, Wifi, Loader2 } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';

const LiveInterface: React.FC = () => {
    const { audioLevels, isConnected, isSessionActive, error, startSession, stopSession } = useLiveSession();

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
                    aria-label={isSessionActive ? 'Stop live interrogation' : 'Start live interrogation'}
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
