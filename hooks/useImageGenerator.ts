import { useCallback, useEffect, useState } from 'react';
import { generateImage } from '../services/gemini';

type ImageSize = '1K' | '2K' | '4K';

const STORAGE_KEYS = {
  prompt: 'gravity:image-prompt',
  size: 'gravity:image-size',
} as const;

const loadPrompt = () => {
  if (typeof window === 'undefined') {
    return 'A brutalist concrete room with a single heavy lifting rack, dramatic lighting, high contrast, monochrome';
  }
  return (
    window.localStorage.getItem(STORAGE_KEYS.prompt) ||
    'A brutalist concrete room with a single heavy lifting rack, dramatic lighting, high contrast, monochrome'
  );
};

const loadSize = (): ImageSize => {
  if (typeof window === 'undefined') return '1K';
  const stored = window.localStorage.getItem(STORAGE_KEYS.size);
  return stored === '2K' || stored === '4K' ? stored : '1K';
};

export const useImageGenerator = () => {
  const [prompt, setPrompt] = useState(loadPrompt);
  const [size, setSize] = useState<ImageSize>(loadSize);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.prompt, prompt);
  }, [prompt]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.size, size);
  }, [size]);

  useEffect(() => {
    setError(null);
  }, [prompt, size]);

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Prompt required. Describe the environment to render.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const url = await generateImage(trimmedPrompt, size);
      setImageUrl(url);
    } catch (err) {
      console.error(err);
      setError('Visual reconstruction failed. Ensure API access.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, size]);

  return {
    prompt,
    setPrompt,
    size,
    setSize,
    isLoading,
    imageUrl,
    setImageUrl,
    error,
    handleGenerate,
  };
};
