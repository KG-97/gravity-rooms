import React from 'react';
import { Loader2, Image as ImageIcon, Zap } from 'lucide-react';
import { useImageGenerator } from '../hooks/useImageGenerator';

const ImageGenerator: React.FC = () => {
  const { prompt, setPrompt, size, setSize, isLoading, imageUrl, error, handleGenerate } = useImageGenerator();

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-purple-500" />
            GRAVITY ROOM VISUALIZER
        </h2>
        <p className="text-neutral-500 text-sm font-mono">
            Reconstruct the spaces where reality behaves consistently. 
            Uses Nano Banana Pro (Gemini 3 Pro Image).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-mono text-neutral-400 uppercase">System Prompt</label>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-32 bg-neutral-900 border border-neutral-800 text-neutral-200 p-3 rounded font-mono text-sm focus:border-purple-500 focus:outline-none resize-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-mono text-neutral-400 uppercase">Resolution Protocol</label>
                <div className="flex gap-2">
                    {(['1K', '2K', '4K'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setSize(s)}
                            className={`flex-1 py-2 text-xs font-mono border ${size === s ? 'bg-purple-900/30 border-purple-500 text-purple-300' : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-600'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-3 bg-white text-black font-mono font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4" />}
                INITIATE RENDER
            </button>
            {isLoading && (
                <div className="text-[10px] font-mono uppercase text-purple-300">
                    COMPILING GEOMETRY...
                </div>
            )}
            {imageUrl && (
                <a
                    href={imageUrl}
                    download="gravity-room.png"
                    className="block w-full py-2 text-center font-mono text-xs border border-neutral-800 text-neutral-300 hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                    DOWNLOAD IMAGE
                </a>
            )}
            {error && (
                <div className="rounded border border-red-900 bg-red-950/40 p-3 text-xs font-mono text-red-200">
                    <div>{error}</div>
                    <button
                        onClick={handleGenerate}
                        className="mt-2 rounded border border-red-700 px-2 py-1 text-[10px] text-red-200 hover:bg-red-900/40"
                    >
                        RETRY RENDER
                    </button>
                </div>
            )}
        </div>

        {/* Display */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-center relative overflow-hidden group">
            {imageUrl ? (
                <img src={imageUrl} alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl" />
            ) : (
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 border border-neutral-800 mx-auto flex items-center justify-center rounded-full">
                        <ImageIcon className="w-6 h-6 text-neutral-700" />
                    </div>
                    <p className="text-neutral-600 font-mono text-sm">AWAITING VISUAL DATA</p>
                </div>
            )}
            {isLoading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="font-mono text-purple-400 animate-pulse text-sm">RENDERING GEOMETRY...</div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
