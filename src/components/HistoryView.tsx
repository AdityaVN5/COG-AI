import React, { useEffect, useState } from 'react';

interface HistoryItem {
  id: string;
  filename: string;
}

interface HistoryViewProps {
  onSelect: (id: string) => void;
}

export default function HistoryView({ onSelect }: HistoryViewProps) {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/history')
      .then(res => res.json())
      .then(data => {
        setHistoryList(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-container-lowest text-on-surface">
      <h1 className="text-3xl font-bold mb-6">Conversation History</h1>
      
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
        {isLoading ? (
          <div className="text-sm text-on-surface-variant animate-pulse">Loading history...</div>
        ) : historyList.length === 0 ? (
          <div className="text-sm text-on-surface-variant italic">No previous conversations found. They will appear here once saved.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyList.map(item => (
              <div 
                key={item.id} 
                onClick={() => onSelect(item.id)}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 cursor-pointer hover:bg-surface-variant/40 hover:border-primary/30 transition-all flex flex-col gap-2 shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-sm">chat</span>
                  </div>
                  <h3 className="font-bold text-sm truncate">Chat Session</h3>
                </div>
                <p className="text-xs text-on-surface-variant font-mono truncate pl-11">{item.id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
