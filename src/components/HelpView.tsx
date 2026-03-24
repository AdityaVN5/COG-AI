import React from 'react';

export default function HelpView() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-container-lowest text-on-surface">
      <h1 className="text-3xl font-bold mb-6">Help & Documentation</h1>
      
      <div className="max-w-3xl space-y-6">
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">menu_book</span>
            Getting Started
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
            Welcome to the Knowledge Graph Explorer. This tool allows you to visualize, query, and interact with complex data relationships.
          </p>
          <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-2">
            <li>Use the <strong>Hub</strong> tab to view the interactive graph.</li>
            <li>Use the <strong>Database</strong> tab to ingest new datasets.</li>
            <li>Use the <strong>History</strong> tab to review past actions.</li>
            <li>Use the <strong>Settings</strong> tab to customize your experience.</li>
          </ul>
        </div>

        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">support_agent</span>
            Contact Support
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
            Need help with a specific issue? Our support team is available 24/7.
          </p>
          <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Open Support Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
