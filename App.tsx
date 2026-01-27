import React, { useEffect, useState } from 'react';
import { ViewMode } from './types';
import { MANUSCRIPT } from './data/manuscript';
import AudiobookPlayer from './components/AudiobookPlayer';
import ImageGenerator from './components/ImageGenerator';
import SystemChat from './components/SystemChat';
import LiveInterface from './components/LiveInterface';
import { Book, Image, MessageSquare, Menu, Radio } from 'lucide-react';
import { AppStateProvider, useAppDispatch, useAppState } from './state/AppState';
import ErrorBoundary from './components/ErrorBoundary';

const STORAGE_KEYS = {
  view: 'gravity:view',
  chapter: 'gravity:chapter',
  chat: 'gravity:chat-history',
} as const;

const loadStoredView = (): ViewMode => {
  if (typeof window === 'undefined') return ViewMode.AUDIOBOOK;
  const stored = window.localStorage.getItem(STORAGE_KEYS.view);
  return Object.values(ViewMode).includes(stored as ViewMode) ? (stored as ViewMode) : ViewMode.AUDIOBOOK;
};

const loadStoredChapter = (): string => {
  if (typeof window === 'undefined') return MANUSCRIPT[0].id;
  return window.localStorage.getItem(STORAGE_KEYS.chapter) || MANUSCRIPT[0].id;
};

const loadStoredChat = () => {
  if (typeof window === 'undefined') {
    return [{ role: 'model', text: 'SYSTEM ONLINE. GATES ARCHIVE ACCESSED. AWAITING QUERY.', timestamp: new Date() }];
  }
  const stored = window.localStorage.getItem(STORAGE_KEYS.chat);
  if (!stored) {
    return [{ role: 'model', text: 'SYSTEM ONLINE. GATES ARCHIVE ACCESSED. AWAITING QUERY.', timestamp: new Date() }];
  }
  try {
    const parsed = JSON.parse(stored) as { role: 'user' | 'model'; text: string; timestamp: string }[];
    return parsed.map(item => ({ ...item, timestamp: new Date(item.timestamp) }));
  } catch (err) {
    console.error('Failed to parse chat history', err);
    return [{ role: 'model', text: 'SYSTEM ONLINE. GATES ARCHIVE ACCESSED. AWAITING QUERY.', timestamp: new Date() }];
  }
};

const AppShell: React.FC = () => {
  const { view, currentChapterId, chatHistory } = useAppState();
  const dispatch = useAppDispatch();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const currentChapter = MANUSCRIPT.find(c => c.id === currentChapterId) || MANUSCRIPT[0];

  const handleSetView = (nextView: ViewMode) => {
    dispatch({ type: 'setView', view: nextView });
    setShowMobileMenu(false);
  };

  const handleSetChapter = (chapterId: string) => {
    dispatch({ type: 'setChapterId', chapterId });
    setShowMobileMenu(false);
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.view, view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.chapter, currentChapterId);
  }, [currentChapterId]);

  useEffect(() => {
    const serialized = chatHistory.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));
    window.localStorage.setItem(STORAGE_KEYS.chat, JSON.stringify(serialized));
  }, [chatHistory]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden selection:bg-emerald-900 selection:text-white">
      {showMobileMenu && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setShowMobileMenu(false)}
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
        />
      )}

      {/* Sidebar */}
      <div className={`${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 w-64 h-full bg-neutral-950 border-r border-neutral-800 transition-transform duration-300 flex flex-col`}>
        <div className="p-6 border-b border-neutral-800">
            <h1 className="font-mono font-bold text-xl tracking-tighter">GRAVITY<br/><span className="text-emerald-500">ROOMS</span></h1>
            <p className="text-xs text-neutral-600 mt-2 font-mono">CASE FILE 2024-2025</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-2 text-xs font-mono text-neutral-500 uppercase tracking-widest">Modules</div>
            <button 
                onClick={() => handleSetView(ViewMode.AUDIOBOOK)}
                className={`w-full text-left px-6 py-3 font-mono text-sm flex items-center gap-3 ${view === ViewMode.AUDIOBOOK ? 'bg-neutral-900 text-white border-r-2 border-emerald-500' : 'text-neutral-400 hover:text-white'}`}
            >
                <Book className="w-4 h-4" /> Archive
            </button>
            <button 
                onClick={() => handleSetView(ViewMode.VISUALIZER)}
                className={`w-full text-left px-6 py-3 font-mono text-sm flex items-center gap-3 ${view === ViewMode.VISUALIZER ? 'bg-neutral-900 text-white border-r-2 border-purple-500' : 'text-neutral-400 hover:text-white'}`}
            >
                <Image className="w-4 h-4" /> Visualizer
            </button>
            <button 
                onClick={() => handleSetView(ViewMode.SYSTEM_LOG)}
                className={`w-full text-left px-6 py-3 font-mono text-sm flex items-center gap-3 ${view === ViewMode.SYSTEM_LOG ? 'bg-neutral-900 text-white border-r-2 border-emerald-500' : 'text-neutral-400 hover:text-white'}`}
            >
                <MessageSquare className="w-4 h-4" /> System Log
            </button>
            <button 
                onClick={() => handleSetView(ViewMode.LIVE_INTERROGATION)}
                className={`w-full text-left px-6 py-3 font-mono text-sm flex items-center gap-3 ${view === ViewMode.LIVE_INTERROGATION ? 'bg-neutral-900 text-white border-r-2 border-red-500' : 'text-neutral-400 hover:text-white'}`}
            >
                <Radio className="w-4 h-4" /> Live Interrogation
            </button>

            {view === ViewMode.AUDIOBOOK && (
                <div className="mt-8">
                    <div className="px-4 mb-2 text-xs font-mono text-neutral-500 uppercase tracking-widest">Chapters</div>
                    {MANUSCRIPT.map(ch => (
                        <button
                            key={ch.id}
                            onClick={() => handleSetChapter(ch.id)}
                            className={`w-full text-left px-6 py-2 font-mono text-xs truncate ${currentChapterId === ch.id ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            {ch.title}
                        </button>
                    ))}
                </div>
            )}
        </nav>

        <div className="p-4 border-t border-neutral-800 text-[10px] font-mono text-neutral-700 text-center">
            SYS_RDY // V1.0.4
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        <div className="md:hidden p-4 border-b border-neutral-800 flex items-center justify-between">
            <span className="font-mono font-bold">GRAVITY ROOMS</span>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle navigation menu"
              className="rounded border border-neutral-800 p-2 text-neutral-200 hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Menu className="w-5 h-5" />
            </button>
        </div>

        <main className="flex-1 overflow-hidden p-0 md:p-6 bg-black relative">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20"></div>
            
            <div className="relative z-10 h-full w-full max-w-7xl mx-auto flex gap-6">
                <div className={`flex-1 h-full transition-all duration-500 ${view === ViewMode.SYSTEM_LOG ? 'hidden md:block' : 'block'}`}>
                    {view === ViewMode.AUDIOBOOK && <AudiobookPlayer chapter={currentChapter} />}
                    {view === ViewMode.VISUALIZER && <ImageGenerator />}
                    {view === ViewMode.LIVE_INTERROGATION && <LiveInterface />}
                    {view === ViewMode.SYSTEM_LOG && (
                        <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-sm border border-neutral-800 rounded-lg bg-neutral-950">
                            SELECT ARCHIVE OR VISUALIZER TO BEGIN. 
                            <br/>CHAT LOG ACTIVE IN RIGHT PANEL.
                        </div>
                    )}
                </div>
                
                {/* Chat is always visible on large screens as a sidebar, or main view on mobile if selected */}
                <div className={`w-full md:w-96 border-l border-neutral-800 h-full ${view === ViewMode.SYSTEM_LOG ? 'block' : 'hidden md:block'}`}>
                    <SystemChat />
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AppStateProvider
    initialView={loadStoredView()}
    initialChapterId={loadStoredChapter()}
    initialChatHistory={loadStoredChat()}
  >
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  </AppStateProvider>
);

export default App;
