import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ChatMessage, ViewMode } from '../types';

interface AppState {
  view: ViewMode;
  currentChapterId: string;
  chatHistory: ChatMessage[];
}

const MAX_CHAT_HISTORY = 120;

type Action =
  | { type: 'setView'; view: ViewMode }
  | { type: 'setChapterId'; chapterId: string }
  | { type: 'setChatHistory'; history: ChatMessage[] }
  | { type: 'appendChat'; message: ChatMessage };

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined);

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view };
    case 'setChapterId':
      return { ...state, currentChapterId: action.chapterId };
    case 'setChatHistory':
      return { ...state, chatHistory: action.history };
    case 'appendChat':
      return {
        ...state,
        chatHistory: [...state.chatHistory, action.message].slice(-MAX_CHAT_HISTORY),
      };
    default:
      return state;
  }
};

interface AppStateProviderProps {
  children: ReactNode;
  initialView: ViewMode;
  initialChapterId: string;
  initialChatHistory: ChatMessage[];
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
  initialView,
  initialChapterId,
  initialChatHistory,
}) => {
  const [state, dispatch] = useReducer(reducer, {
    view: initialView,
    currentChapterId: initialChapterId,
    chatHistory: initialChatHistory,
  });

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppState => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

export const useAppDispatch = (): React.Dispatch<Action> => {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppStateProvider');
  }
  return context;
};
