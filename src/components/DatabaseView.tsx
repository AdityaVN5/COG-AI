import React from 'react';

export default function DatabaseView() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-container-lowest text-on-surface">
      <h1 className="text-3xl font-bold mb-6">Database & Dataset Ingestion</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-2xl">cloud_upload</span>
            <h2 className="text-xl font-semibold">Upload Dataset</h2>
          </div>
          <p className="text-sm text-on-surface-variant mb-6">Upload CSV, JSON, or Excel files to ingest into the knowledge graph.</p>
          
          <div className="border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-surface-container-high/30 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">upload_file</span>
            <p className="font-medium">Click to browse or drag and drop</p>
            <p className="text-xs text-on-surface-variant mt-1">Max file size: 50MB</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-2xl">database</span>
            <h2 className="text-xl font-semibold">Connect Database</h2>
          </div>
          <p className="text-sm text-on-surface-variant mb-6">Connect directly to your SQL or NoSQL database for continuous ingestion.</p>
          
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Connection String</label>
              <input type="text" placeholder="postgresql://user:pass@localhost:5432/db" className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Username</label>
                <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Password</label>
                <input type="password" className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>
            <button className="w-full bg-primary text-on-primary rounded-lg py-2 font-medium hover:bg-primary/90 transition-colors mt-2">
              Test Connection
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Ingestions</h2>
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-high text-on-surface-variant">
              <tr>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              <tr className="hover:bg-surface-container-high/20 transition-colors">
                <td className="px-6 py-4 font-medium">customer_data_q3.csv</td>
                <td className="px-6 py-4 text-on-surface-variant">File Upload</td>
                <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">Completed</span></td>
                <td className="px-6 py-4 text-on-surface-variant">2 hours ago</td>
              </tr>
              <tr className="hover:bg-surface-container-high/20 transition-colors">
                <td className="px-6 py-4 font-medium">Production PostgreSQL</td>
                <td className="px-6 py-4 text-on-surface-variant">Database Sync</td>
                <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">Syncing</span></td>
                <td className="px-6 py-4 text-on-surface-variant">Just now</td>
              </tr>
              <tr className="hover:bg-surface-container-high/20 transition-colors">
                <td className="px-6 py-4 font-medium">legacy_records.json</td>
                <td className="px-6 py-4 text-on-surface-variant">File Upload</td>
                <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400">Failed</span></td>
                <td className="px-6 py-4 text-on-surface-variant">Yesterday</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
