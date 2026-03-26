import React, { useEffect, useState } from 'react';

interface HistoryItem {
  id: string;
  filename: string;
  totalTokens?: number;
}

interface HistoryViewProps {
  onSelect: (id: string) => void;
}

const API_URL = (process.env.VITE_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, "");

export default function HistoryView({ onSelect }: HistoryViewProps) {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = () => {
    setIsLoading(true);
    try {
      // Primary: read from localStorage
      const idx: string[] = JSON.parse(localStorage.getItem('cog_history_index') || '[]');
      const items: HistoryItem[] = idx.map(id => {
        const meta = JSON.parse(localStorage.getItem(`cog_history_${id}`) || '{}');
        return { id, filename: `${id}.md`, totalTokens: meta.totalTokens || 0 };
      });
      setHistoryList(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      // Remove from localStorage
      localStorage.removeItem(`cog_history_${id}`);
      const idx: string[] = JSON.parse(localStorage.getItem('cog_history_index') || '[]');
      localStorage.setItem('cog_history_index', JSON.stringify(idx.filter(i => i !== id)));
      fetchHistory();
      // Also try backend delete (for local dev)
      fetch(`${API_URL}/api/history/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-container-lowest text-on-surface">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Conversation History</h1>
        <div className="px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">analytics</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{historyList.length} Sessions Saved</span>
        </div>
      </div>
      
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant animate-pulse">
            <span className="material-symbols-outlined text-4xl mb-4">history</span>
            <p className="text-sm font-medium">Loading your archive...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant/60 text-center border-2 border-dashed border-outline-variant/20 rounded-2xl">
            <span className="material-symbols-outlined text-4xl mb-4 opacity-20">chat_bubble</span>
            <p className="text-sm font-medium italic">No previous conversations found.</p>
            <p className="text-[10px] mt-1 uppercase tracking-widest opacity-50">Sessions appear here after a new chat is started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {historyList.map(item => (
              <div 
                key={item.id} 
                onClick={() => onSelect(item.id)}
                className="group relative bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 cursor-pointer hover:bg-surface-container-high/40 hover:border-primary/40 transition-all flex flex-col gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-xl">chat_bubble</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-on-surface leading-none mb-1">Session</h3>
                      <p className="text-[10px] text-on-surface-variant font-mono opacity-60">ID: {item.id.split('_').slice(-1)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Conversation"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10 mt-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Resume <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
