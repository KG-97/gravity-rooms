import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';
import { chatWithSystem, transcribeAudio } from '../services/gemini';
import { blobToBase64 } from '../utils/audio';
import { useAppDispatch, useAppState } from '../state/AppState';

export const useSystemChat = () => {
  const { chatHistory } = useAppState();
  const dispatch = useAppDispatch();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const historyRef = useRef(chatHistory);

  useEffect(() => {
    historyRef.current = chatHistory;
  }, [chatHistory]);

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      dispatch({ type: 'appendChat', message });
    },
    [dispatch]
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    appendMessage(userMsg);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await chatWithSystem(
        userMsg.text,
        historyRef.current.map(h => ({ role: h.role, text: h.text }))
      );
      appendMessage({
        role: 'model',
        text: responseText || 'DATA CORRUPTION. RETRY.',
        timestamp: new Date(),
      });
    } catch (err) {
      console.error(err);
      appendMessage({
        role: 'model',
        text: 'SYSTEM ERROR. CONNECTION LOST.',
        timestamp: new Date(),
      });
    } finally {
      setIsTyping(false);
    }
  }, [appendMessage, input, isTyping]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setIsTyping(true);
        try {
          const base64 = await blobToBase64(blob);
          const text = await transcribeAudio(base64, blob.type);
          setInput(prev => prev + (prev ? ' ' : '') + text);
        } catch (error) {
          console.error('Transcription failed', error);
        } finally {
          setIsTyping(false);
          stream.getTracks().forEach(t => t.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to access mic', e);
      appendMessage({
        role: 'model',
        text: 'MIC ACCESS DENIED. CHECK PERMISSIONS.',
        timestamp: new Date(),
      });
    }
  }, [appendMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return {
    input,
    setInput,
    chatHistory,
    isTyping,
    isRecording,
    handleSend,
    startRecording,
    stopRecording,
  };
};
