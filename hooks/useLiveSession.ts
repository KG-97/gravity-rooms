import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveServerMessage } from '@google/genai';
import { connectLiveSession } from '../services/gemini';
import { decodeAudioData, decodeBase64, pcmToGeminiBlob } from '../utils/audio';

export const useLiveSession = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 10, 10, 10, 10]);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    inputContextRef.current?.close();
    outputContextRef.current?.close();

    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();

    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
    }

    setIsConnected(false);
    setAudioLevels([10, 10, 10, 10, 10]);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const visualize = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bars = 5;
    const step = Math.floor(bufferLength / bars);
    const newLevels: number[] = [];

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j];
      }
      const avg = sum / step;
      const val = Math.max(10, (avg / 255) * 100);
      newLevels.push(val);
    }

    setAudioLevels(newLevels);
    animationFrameRef.current = requestAnimationFrame(visualize);
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setIsSessionActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      inputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

      const inputSource = inputContextRef.current.createMediaStreamSource(stream);
      const analyser = inputContextRef.current.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      inputSource.connect(analyser);
      analyserRef.current = analyser;
      visualize();

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

      sessionPromiseRef.current = connectLiveSession({
        onopen: () => {
          setIsConnected(true);
          console.log('Live Session Connected');
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
          console.log('Live Session Closed');
          setIsConnected(false);
        },
        onerror: (e) => {
          console.error('Live Session Error', e);
          setError('Connection Interrupted');
          cleanup();
          setIsSessionActive(false);
        },
      });
    } catch (err) {
      console.error(err);
      setError('Failed to initialize audio systems');
      setIsSessionActive(false);
    }
  }, [cleanup, visualize]);

  const stopSession = useCallback(() => {
    cleanup();
    setIsSessionActive(false);
  }, [cleanup]);

  return {
    audioLevels,
    isConnected,
    isSessionActive,
    error,
    startSession,
    stopSession,
  };
};
