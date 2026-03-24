/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import DatabaseView from './components/DatabaseView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';

interface NodeData {
  id: string; theme: string; icon: string; label: string; x: number; y: number;
  data: { status: string; amount: string; date: string; type: string; };
}
interface EdgeData { source: string; target: string; dashed: boolean; }


const themeMap: Record<string, { outer: string, outerSelected: string, inner: string, shadow: string }> = {
  primary: { outer: 'bg-primary/20', outerSelected: 'bg-primary/40 scale-125', inner: 'bg-primary', shadow: 'shadow-[0_0_20px_rgba(78,69,228,0.6)]' },
  secondary: { outer: 'bg-secondary/10', outerSelected: 'bg-secondary/30 scale-125', inner: 'bg-secondary-dim', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]' },
  tertiary: { outer: 'bg-tertiary/10', outerSelected: 'bg-tertiary/30 scale-125', inner: 'bg-tertiary-dim', shadow: 'shadow-[0_0_20px_rgba(20,184,166,0.6)]' },
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('hub');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [messages, setMessages] = useState<{role: string, text: string, sql?: string, results?: any}[]>([
    { role: 'ai', text: "Hello! I've indexed your sap-o2c-data graph. You can ask about relationships, anomalies, or summaries across your entities." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8000/api/graph')
      .then(res => res.json())
      .then(data => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      })
      .catch(err => console.error("Error fetching graph data:", err));
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = { role: 'user', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.text, sql: data.sql, results: data.results }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to the analytical engine." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const leftTabs = [
    { id: 'hub', icon: 'hub' },
    { id: 'database', icon: 'database' },
    { id: 'history', icon: 'history' },
  ];

  return (
    <>
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 py-3 border-b border-outline-variant/30 bg-surface-container-low/80 glass-panel">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-container text-on-primary-container">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface leading-none">COG AI</h1>
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mt-1">Contextual Graph Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <div className="h-8 w-px bg-outline-variant/20 mx-1"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right">
              <p className="text-sm font-medium leading-none">Research Mode</p>
              <p className="text-[10px] text-on-surface-variant">Admin Access</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex h-screen pt-16">
        {/* Left Navigation (Sidebar) */}
        <nav className="fixed left-0 top-16 bottom-0 w-16 flex flex-col items-center py-6 bg-surface-container/40 border-r border-outline-variant/10 z-10 hidden md:flex">
          <div className="flex flex-col gap-6 w-full items-center">
            {leftTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/80 dark:bg-surface-container-high text-primary shadow-sm border border-outline-variant/10'
                    : 'text-on-surface-variant hover:bg-white/50 dark:hover:bg-surface-container-high/50 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {tab.icon}
                </span>
              </button>
            ))}
            <div className="w-8 h-px bg-outline-variant/20"></div>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'settings'
                  ? 'bg-white/80 dark:bg-surface-container-high text-primary shadow-sm border border-outline-variant/10'
                  : 'text-on-surface-variant hover:bg-white/50 dark:hover:bg-surface-container-high/50 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined" style={activeTab === 'settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                settings
              </span>
            </button>
          </div>
          <div className="mt-auto">
            <button
              onClick={() => setActiveTab('help')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'help'
                  ? 'bg-white/80 dark:bg-surface-container-high text-primary shadow-sm border border-outline-variant/10'
                  : 'text-on-surface-variant hover:bg-white/50 dark:hover:bg-surface-container-high/50 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined" style={activeTab === 'help' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                help
              </span>
            </button>
          </div>
        </nav>

        {/* Main Section: Graph Visualization (70%) */}
        <section className="flex-1 relative overflow-hidden bg-surface-container-lowest graph-bg ml-16" onClick={() => setSelectedNodeId(null)}>
          <div className={`absolute inset-0 w-full h-full ${activeTab === 'hub' ? 'block' : 'hidden'}`}>
            <TransformWrapper
              initialScale={1}
              minScale={0.1}
              maxScale={4}
              centerOnInit={true}
              limitToBounds={false}
              panning={{ className: "cursor-grab active:cursor-grabbing" }}
            >
              {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                <div className="w-full h-full relative">
                  {/* Graph Canvas Simulation */}
                  <TransformComponent 
                    wrapperStyle={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} 
                    contentStyle={{ width: "3000px", height: "3000px" }}
                  >
                    <div className="w-[3000px] h-[3000px] relative">
                      {/* Edges */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" stroke="currentColor" strokeWidth="3">
                        {edges.map((edge, i) => {
                          const sourceNode = nodes.find(n => n.id === edge.source);
                          const targetNode = nodes.find(n => n.id === edge.target);
                          if (!sourceNode || !targetNode || sourceNode.x === undefined) return null;
                          return (
                            <line
                              key={i}
                              x1={sourceNode.x}
                              y1={sourceNode.y}
                              x2={targetNode.x}
                              y2={targetNode.y}
                              strokeDasharray={edge.dashed ? "8" : "0"}
                              className="text-on-surface-variant"
                            />
                          );
                        })}
                      </svg>

                      {/* Nodes */}
                      {nodes.map(node => {
                        const isSelected = selectedNodeId === node.id;
                        const theme = themeMap[node.theme] || themeMap['primary'];
                        return (
                          <div
                            key={node.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-300 ${isSelected ? 'z-20' : 'z-10 hover:z-20'}`}
                            style={{ left: node.x, top: node.y }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(node.id);
                            }}
                          >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center relative transition-all duration-300 ${isSelected ? theme.outerSelected : theme.outer}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 ${theme.inner} ${isSelected ? theme.shadow : 'shadow-md'}`}>
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{node.icon}</span>
                              </div>
                            </div>
                            <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded bg-surface-container-lowest text-[10px] font-bold tracking-tight shadow-sm border transition-colors duration-300 ${isSelected ? 'border-primary text-primary shadow-md' : 'border-outline-variant/20 text-on-surface'}`}>
                              {node.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TransformComponent>

                {/* Floating Controls */}
                <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 overflow-hidden">
                    <button onClick={() => zoomIn()} className="p-3 hover:bg-surface-container-low transition-colors text-on-surface-variant"><span className="material-symbols-outlined">add</span></button>
                    <div className="h-px bg-outline-variant/10 w-full"></div>
                    <button onClick={() => zoomOut()} className="p-3 hover:bg-surface-container-low transition-colors text-on-surface-variant"><span className="material-symbols-outlined">remove</span></button>
                  </div>
                  <button onClick={() => centerView()} className="bg-surface-container-lowest p-3 rounded-xl shadow-lg border border-outline-variant/10 hover:bg-surface-container-low transition-colors text-on-surface-variant" title="Center View">
                    <span className="material-symbols-outlined">center_focus_strong</span>
                  </button>
                  <button onClick={() => resetTransform()} className="bg-surface-container-lowest p-3 rounded-xl shadow-lg border border-outline-variant/10 hover:bg-surface-container-low transition-colors text-on-surface-variant" title="Reset Zoom">
                    <span className="material-symbols-outlined">restart_alt</span>
                  </button>
                </div>
              </div>
            )}
          </TransformWrapper>
          </div>

          {activeTab === 'database' && <DatabaseView />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'settings' && <SettingsView isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
          {activeTab === 'help' && <HelpView />}

          {/* Node Details Panel */}
          {activeTab === 'hub' && (selectedNode ? (
            <div className="absolute top-8 right-8 w-80 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-xl border border-outline-variant/20 p-5 z-10 animate-in fade-in slide-in-from-right-4 duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className="label-sm bg-primary-container/30 text-primary px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Selected Entity</span>
                <button onClick={() => setSelectedNodeId(null)} className="text-on-surface-variant hover:text-on-surface transition-colors"><span className="material-symbols-outlined text-lg">close</span></button>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${themeMap[selectedNode.theme].inner}`}>
                  <span className="material-symbols-outlined">{selectedNode.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface leading-tight">{selectedNode.label}</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Type: {selectedNode.data.type}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-y-3 bg-surface-container-low/50 p-3 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Status</div>
                  <div className="text-[11px] font-medium text-on-surface flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedNode.data.status === 'Fulfilled' || selectedNode.data.status === 'Paid' || selectedNode.data.status === 'Active' ? 'bg-emerald-500' : selectedNode.data.status === 'In Transit' ? 'bg-blue-500' : 'bg-amber-500'}`}></span> {selectedNode.data.status}
                  </div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Amount</div>
                  <div className="text-[11px] font-medium text-on-surface">{selectedNode.data.amount}</div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Date</div>
                  <div className="text-[11px] font-medium text-on-surface">{selectedNode.data.date}</div>
                </div>
                <button className="w-full py-2.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-dim transition-all mt-2 flex items-center justify-center gap-2 shadow-sm hover:shadow">
                  Deep Dive Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute top-8 right-8 w-80 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-xl border border-outline-variant/20 p-8 z-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl">touch_app</span>
              </div>
              <p className="text-sm font-bold text-on-surface">No Entity Selected</p>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">Click on a node in the graph to view its details and relationships.</p>
            </div>
          ))}
        </section>

        {/* Right Section: Chat Interface */}
        <aside className={`${isRightSidebarOpen ? 'w-[30%]' : 'w-0 md:w-16'} bg-surface-container-low/50 border-l border-outline-variant/15 flex flex-col relative transition-all duration-300 overflow-hidden shrink-0`}>
          {/* Chat Header with Collapse */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low min-w-[250px]">
            <span className={`text-xs font-bold text-on-surface-variant uppercase tracking-widest transition-opacity duration-300 ${isRightSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Conversation</span>
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors absolute right-4"
              title={isRightSidebarOpen ? "Collapse Panel" : "Expand Panel"}
            >
              <span className="material-symbols-outlined text-xl">{isRightSidebarOpen ? 'last_page' : 'first_page'}</span>
            </button>
          </div>

          {/* Chat History */}
          <div className={`flex-1 overflow-y-auto p-6 space-y-6 min-w-[300px] transition-opacity duration-300 ${isRightSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-4'}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  </div>
                )}
                <div className={`space-y-4 ${msg.role === 'user' ? 'max-w-[85%]' : 'w-full max-w-[90%]'}`}>
                  <div className={msg.role === 'user' 
                    ? "bg-primary text-on-primary p-4 rounded-2xl rounded-tr-none text-sm shadow-md"
                    : "bg-surface-container-lowest p-4 rounded-2xl rounded-tl-none text-sm text-on-surface leading-relaxed shadow-sm border border-outline-variant/5"}>
                    {msg.text}
                  </div>
                  
                  {msg.role === 'ai' && msg.results && msg.results.rows && msg.results.rows.length > 0 && typeof msg.results.rows !== 'string' && (
                    <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl overflow-x-auto shadow-sm">
                      <table className="w-full text-[11px] whitespace-nowrap">
                        <thead className="bg-surface-container-low border-b border-outline-variant/10 text-on-surface-variant uppercase">
                          <tr>
                            {msg.results.columns.map((col: string, ci: number) => (
                              <th key={ci} className="text-left p-3 font-bold tracking-tighter">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                          {msg.results.rows.slice(0, 5).map((row: any[], ri: number) => (
                            <tr key={ri} className="hover:bg-surface-container-low/50">
                              {row.map((cell: any, cj: number) => (
                                <td key={cj} className="p-3 font-medium">{String(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-sm animate-pulse">auto_awesome</span>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-2xl rounded-tl-none text-sm text-on-surface/50 shadow-sm border border-outline-variant/5 animate-pulse">
                  Analyzing graph context...
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className={`p-6 pt-0 min-w-[300px] transition-opacity duration-300 ${isRightSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="relative flex items-end gap-2 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
              <textarea 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 resize-none max-h-32 placeholder:text-on-surface-variant/50 outline-none" 
                placeholder="Ask COG AI..." 
                rows={1}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="flex items-center gap-1 p-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-lg">attach_file</span>
                </button>
                <button 
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all shadow-md ${chatInput.trim() ? 'bg-primary text-on-primary hover:bg-primary-dim' : 'bg-surface-container-high text-on-surface-variant/50'}`}
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-on-surface-variant/60 mt-3">COG AI v4.2. Powered by Vector RAG</p>
          </div>
        </aside>
      </main>
    </>
  );
}
