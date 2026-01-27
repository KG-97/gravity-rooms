import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveServerMessage, Session } from '@google/genai';
import { connectLiveSession } from '../services/gemini';
import { pcmToGeminiBlob } from '../utils/audio';

const BAR_COUNT = 12;
const DEFAULT_LEVELS = Array.from({ length: BAR_COUNT }, () => 8);

export const useLiveSession = () => {
  const [audioLevels, setAudioLevels] = useState<number[]>(DEFAULT_LEVELS);
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopVisualization = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startVisualization = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bucketSize = Math.max(1, Math.floor(data.length / BAR_COUNT));
      const levels = Array.from({ length: BAR_COUNT }, (_, index) => {
        const start = index * bucketSize;
        const slice = data.slice(start, start + bucketSize);
        const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length || 0;
        return Math.max(10, Math.round((avg / 255) * 100));
      });
      setAudioLevels(levels);
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, []);

  const resetSessionState = useCallback(() => {
    stopVisualization();
    setIsConnected(false);
    setIsSessionActive(false);
    setAudioLevels(DEFAULT_LEVELS);
  }, [stopVisualization]);

  const cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const stopSession = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    cleanupAudio();
    resetSessionState();
  }, [cleanupAudio, resetSessionState]);

  const handleServerMessage = useCallback((message: LiveServerMessage) => {
    if (message?.setupComplete) {
      setIsConnected(true);
    }
  }, []);

  const startSession = useCallback(async () => {
    if (isSessionActive) return;

    setError(null);
    setIsSessionActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const zeroGain = audioContext.createGain();
      zeroGain.gain.value = 0;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(zeroGain);
      zeroGain.connect(audioContext.destination);

      const session = await connectLiveSession({
        onopen: () => setIsConnected(true),
        onmessage: handleServerMessage,
        onerror: (event) => {
          console.error('Live session error', event);
          setError('LIVE SESSION ERROR. CHECK CONNECTION.');
        },
        onclose: () => setIsConnected(false),
      });
      sessionRef.current = session;

      processor.onaudioprocess = (event) => {
        if (!sessionRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        const audioChunk = new Float32Array(input.length);
        audioChunk.set(input);
        sessionRef.current.sendRealtimeInput({ media: pcmToGeminiBlob(audioChunk) });
      };

      startVisualization();
    } catch (err) {
      console.error('Failed to start live session', err);
      setError('MIC ACCESS DENIED. UNABLE TO START.');
      stopSession();
    }
  }, [handleServerMessage, isSessionActive, startVisualization, stopSession]);

  useEffect(() => () => stopSession(), [stopSession]);

  return {
    audioLevels,
    isConnected,
    isSessionActive,
    error,
    startSession,
    stopSession,
  };
};
