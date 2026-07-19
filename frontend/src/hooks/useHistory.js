import { useState, useCallback, createContext, useContext } from 'react';

const MAX_HISTORY = 5;
const STORAGE_KEY = 'studyhub_history';

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Context để các trang con dùng addToHistory
export const HistoryContext = createContext(null);
export const useHistoryContext = () => useContext(HistoryContext);

export function useHistory() {
  const [history, setHistory] = useState(loadHistory);

  const addToHistory = useCallback((item) => {
    setHistory(prev => {
      const filtered = prev.filter(h => !(h.type === item.type && h.label === item.label));
      const next = [item, ...filtered].slice(0, MAX_HISTORY);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, addToHistory, clearHistory };
}
