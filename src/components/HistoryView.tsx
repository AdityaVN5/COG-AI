import React from 'react';

export default function HistoryView() {
  const historyItems = [
    { id: 1, action: "Queried 'Top customers in Q3'", time: "10 mins ago", type: "query", icon: "search" },
    { id: 2, action: "Updated node 'ORDER_88231' status", time: "1 hour ago", type: "edit", icon: "edit" },
    { id: 3, action: "Ingested 'customer_data_q3.csv'", time: "2 hours ago", type: "ingest", icon: "upload_file" },
    { id: 4, action: "Exported graph as JSON", time: "1 day ago", type: "export", icon: "download" },
    { id: 5, action: "Deleted node 'USER_992'", time: "2 days ago", type: "delete", icon: "delete" },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-container-lowest text-on-surface">
      <h1 className="text-3xl font-bold mb-6">Activity History</h1>
      
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
        <div className="space-y-6">
          {historyItems.map((item, index) => (
            <div key={item.id} className="flex gap-4 relative">
              {index !== historyItems.length - 1 && (
                <div className="absolute left-5 top-10 bottom-[-24px] w-px bg-outline-variant/20"></div>
              )}
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 z-10 border border-outline-variant/10">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">{item.icon}</span>
              </div>
              <div className="pt-2 pb-4">
                <p className="font-medium text-on-surface">{item.action}</p>
                <p className="text-xs text-on-surface-variant mt-1">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
