import React from 'react';

export default function SettingsView({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean, setIsDarkMode: (v: boolean) => void }) {
  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-container-lowest text-on-surface">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="max-w-3xl space-y-8">
        <section className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">palette</span>
            Appearance
          </h2>
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-on-surface-variant">Toggle dark theme for the application</p>
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
        </section>

        <section className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">key</span>
            API Keys
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
              <div className="flex gap-2">
                <input type="password" value="sk-................................" readOnly className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2 text-sm text-on-surface-variant focus:outline-none" />
                <button className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest rounded-lg text-sm font-medium transition-colors">Edit</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
              <div className="flex gap-2">
                <input type="password" placeholder="Enter API Key" className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
                <button className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors">Save</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gemini API Key</label>
              <div className="flex gap-2">
                <input type="password" placeholder="Enter API Key" className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
                <button className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors">Save</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
