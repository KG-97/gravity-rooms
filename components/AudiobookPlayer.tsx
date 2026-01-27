import React, { useState, useRef, useEffect } from 'react';
import { Chapter } from '../types';
import { generateAudio } from '../services/gemini';
import { decodeAudioData, decodeBase64 } from '../utils/audio';
import { Play, Pause, RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  chapter: Chapter;
}

const AudiobookPlayer: React.FC<Props> = ({ chapter }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      const base64 = await generateAudio(chapter.content);
      const bytes = decodeBase64(base64);
      if (audioContextRef.current) {
        const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
        setAudioBuffer(buffer);
        setIsPlaying(true);
        playAudio(buffer, 0);
      }
    } catch (err) {
      console.error("Audio gen failed", err);
      alert("Failed to generate system audio. Gravity systems offline.");
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (buffer: AudioBuffer, startOffset: number) => {
    if (!audioContextRef.current) return;

    // Ensure context is running (browsers suspend it until user interaction)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    // Stop existing source if any
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    startTimeRef.current = audioContextRef.current.currentTime - startOffset;
    source.start(0, startOffset);
    sourceNodeRef.current = source;

    source.onended = () => {
        // Simple check to reset if it finished naturally
        if (audioContextRef.current && audioContextRef.current.currentTime >= startTimeRef.current + buffer.duration) {
             setIsPlaying(false);
             pausedAtRef.current = 0;
        }
    };
  };

  const togglePlay = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      if (sourceNodeRef.current) sourceNodeRef.current.stop();
      pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
    } else {
      playAudio(audioBuffer, pausedAtRef.current);
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest">System Log // {chapter.date}</span>
            <span className="text-xs font-mono text-neutral-500">{chapter.id.toUpperCase()}</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4 font-mono">{chapter.title}</h2>
        
        <div className="flex gap-4">
          {!audioBuffer ? (
            <button 
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-900/20 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/40 rounded transition-all font-mono text-sm group"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform" />}
              {isLoading ? "COMPILING AUDIO STREAM..." : "INITIATE AUDIO SYNTHESIS"}
            </button>
          ) : (
            <button 
              onClick={togglePlay}
              className="flex items-center gap-2 px-6 py-2 bg-white text-black hover:bg-neutral-200 rounded font-bold transition-all font-mono text-sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? "HALT" : "RESUME PLAYBACK"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed text-neutral-400 space-y-4">
        {chapter.content.split('\n').map((para, i) => (
            <p key={i} className={para.trim() === '' ? 'h-4' : ''}>{para}</p>
        ))}
      </div>
    </div>
  );
};

export default AudiobookPlayer;