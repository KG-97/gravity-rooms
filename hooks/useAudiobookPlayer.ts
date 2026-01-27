import { useCallback, useEffect, useRef, useState } from 'react';
import { Chapter } from '../types';
import { generateAudio } from '../services/gemini';
import { decodeAudioData, decodeBase64 } from '../utils/audio';

export const useAudiobookPlayer = (chapter: Chapter) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playAudio = useCallback(async (buffer: AudioBuffer, startOffset: number) => {
    if (!audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

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
      if (
        audioContextRef.current &&
        audioContextRef.current.currentTime >= startTimeRef.current + buffer.duration
      ) {
        setIsPlaying(false);
        pausedAtRef.current = 0;
      }
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const base64 = await generateAudio(chapter.content);
      setAudioBase64(base64);
      const bytes = decodeBase64(base64);
      if (audioContextRef.current) {
        const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
        setAudioBuffer(buffer);
        setIsPlaying(true);
        playAudio(buffer, 0);
      }
    } catch (err) {
      console.error('Audio gen failed', err);
      setError('Failed to generate system audio. Gravity systems offline.');
    } finally {
      setIsLoading(false);
    }
  }, [chapter.content, playAudio]);

  const togglePlay = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      if (sourceNodeRef.current) sourceNodeRef.current.stop();
      pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
    } else {
      playAudio(audioBuffer, pausedAtRef.current);
      setIsPlaying(true);
    }
  }, [audioBuffer, isPlaying, playAudio]);

  return {
    isPlaying,
    isLoading,
    error,
    audioBuffer,
    audioBase64,
    handleGenerate,
    togglePlay,
  };
};
