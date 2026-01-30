import React from 'react';
import { Chapter } from '../types';
import { Play, Pause, RefreshCw, Loader2, Download } from 'lucide-react';
import { useAudiobookPlayer } from '../hooks/useAudiobookPlayer';
import { decodeBase64 } from '../utils/audio';
import { countWords } from '../utils/text';

type Props = {
  chapter: Chapter;
  totalWordCount: number;
  goalWordCount: number;
};
const AudiobookPlayer: React.FC<Props> = ({ chapter, totalWordCount, goalWordCount }) => {
  const { isPlaying, isLoading, audioBuffer, audioBase64, error, handleGenerate, togglePlay } = useAudiobookPlayer(chapter);
  const chapterWordCount = countWords(chapter.content);
  const progressPercent = Math.min(100, Math.round((totalWordCount / goalWordCount) * 100));
  const remainingWords = Math.max(0, goalWordCount - totalWordCount);

  const handleDownload = () => {
    if (!audioBase64) return;
    const bytes = decodeBase64(audioBase64);
    const blob = new Blob([bytes], { type: 'audio/pcm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chapter.id}.pcm`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest">System Log // {chapter.date}</span>
            <span className="text-xs font-mono text-neutral-500">{chapter.id.toUpperCase()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase text-neutral-500">
          <span>Chapter words: {chapterWordCount.toLocaleString()}</span>
          <span>Total: {totalWordCount.toLocaleString()} / {goalWordCount.toLocaleString()}</span>
          <span>Progress: {progressPercent}%</span>
          <span>Remaining: {remainingWords.toLocaleString()}</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-neutral-800 bg-neutral-950">
          <div
            className="h-full bg-emerald-500/80 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4 font-mono">{chapter.title}</h2>
        
        <div className="flex flex-col gap-4">
          {!audioBuffer ? (
            <button 
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-900/20 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/40 rounded transition-all font-mono text-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform" />}
              {isLoading ? "COMPILING AUDIO STREAM..." : "INITIATE AUDIO SYNTHESIS"}
            </button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={togglePlay}
                className="flex items-center gap-2 px-6 py-2 bg-white text-black hover:bg-neutral-200 rounded font-bold transition-all font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? "HALT" : "RESUME PLAYBACK"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 border border-neutral-700 text-neutral-200 hover:border-neutral-500 rounded font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD AUDIO
              </button>
            </div>
          )}
          {error && (
            <div className="rounded border border-red-900 bg-red-950/40 p-3 text-xs font-mono text-red-200">
              <div>{error}</div>
              <button
                onClick={handleGenerate}
                className="mt-2 rounded border border-red-700 px-2 py-1 text-[10px] text-red-200 hover:bg-red-900/40"
              >
                RETRY SYNTHESIS
              </button>
            </div>
          )}
          {isLoading && (
            <div className="text-[10px] font-mono uppercase text-emerald-400">
              STREAMING SYNTHESIS MODULE...
            </div>
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
