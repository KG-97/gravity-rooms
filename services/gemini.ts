import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// Helper to ensure we have a user-selected key which is required for advanced/preview models
const ensureUserKey = async (force = false) => {
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey || force) {
      await window.aistudio.openSelectKey();
    }
  }
};

// Get client with dynamic key access
export const getAiClient = async (requireUserKey = false) => {
  let key = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (requireUserKey && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (hasKey) {
        key = import.meta.env.VITE_GEMINI_API_KEY || '';
    }
  }
  return new GoogleGenAI({ apiKey: key });
};

// Wrapper to handle 403/Permission errors by prompting for key
const withRetry = async <T>(
    operation: (ai: GoogleGenAI) => Promise<T>,
    requireUserKey = false
): Promise<T> => {
    try {
        if (requireUserKey) await ensureUserKey();
        const ai = await getAiClient(requireUserKey);
        return await operation(ai);
    } catch (err: any) {
        const isPermissionError = 
            err?.status === 403 || 
            err?.status === 'PERMISSION_DENIED' ||
            err?.message?.includes('403') ||
            err?.message?.includes('permission') ||
            err?.message?.includes('Requested entity was not found');

        if (isPermissionError && window.aistudio) {
            console.warn("Permission denied. Requesting new API key...");
            await ensureUserKey(true); // Force selection
            const ai = await getAiClient(requireUserKey);
            return await operation(ai);
        }
        throw err;
    }
};

export const generateAudio = async (text: string): Promise<string> => {
  return withRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated");
      return base64Audio;
  }, true);
};

export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K'): Promise<string> => {
  return withRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: size
          }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image generated");
  }, true);
};

export const chatWithSystem = async (message: string, history: { role: 'user' | 'model'; text: string }[]) => {
  return withRetry(async (ai) => {
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        history: history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        })),
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
            systemInstruction: `You are the SYSTEM LOG for the Gates Case File (2024-2025). 
            You speak in the voice of Kaleb Gates: dark, witty, hyper-analytical, obsessed with systems, entropy, and documentation.
            You view the world through the lens of neuroscience, physiology, and legal procedure.
            You are cynical but resilient. You value precision over emotion.
            Refer to the "Gravity Rooms" (gym, code, study) as places of safety.
            Refer to the "Year in Hell" as a verifiable convergence of systemic failures.
            Keep responses concise, like a log entry or a terminal output.`
        }
      });

      const response = await chat.sendMessage({ message });
      return response.text;
  }, true);
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  return withRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            { text: "Transcribe this audio. Return only the text." }
          ]
        }
      });
      return response.text || "";
  }, true);
};

export const connectLiveSession = async (callbacks: {
    onopen?: () => void;
    onmessage?: (message: LiveServerMessage) => void;
    onerror?: (e: ErrorEvent) => void;
    onclose?: (e: CloseEvent) => void;
}) => {
    return withRetry(async (ai) => {
        return ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
                },
                systemInstruction: "You are Kaleb Gates. Dark, witty, cynical, analytical. You are talking to someone reviewing your case file. Keep it brief, conversational, and intense."
            }
        });
    }, true);
};
