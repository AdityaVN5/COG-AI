/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ReactMarkdown from 'react-markdown';
import DatabaseView from './components/DatabaseView';
import HistoryView from './components/HistoryView';
import AnalysisView from './components/AnalysisView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';

interface NodeData {
  id: string; theme: string; icon: string; label: string; x: number; y: number;
  data: { 
    type: string; 
    sections?: { title: string; fields: { label: string; value: string | number }[] }[];
  };
}
interface EdgeData { source: string; target: string; dashed: boolean; }


const themeMap: Record<string, { outer: string, outerSelected: string, inner: string, shadow: string }> = {
  order: { outer: 'bg-amber-500/20', outerSelected: 'bg-amber-500/40 scale-125', inner: 'bg-amber-600', shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.6)]' },
  customer: { outer: 'bg-indigo-500/20', outerSelected: 'bg-indigo-500/40 scale-125', inner: 'bg-indigo-600', shadow: 'shadow-[0_0_20px_rgba(79,70,229,0.6)]' },
  product: { outer: 'bg-emerald-500/20', outerSelected: 'bg-emerald-500/40 scale-125', inner: 'bg-emerald-600', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.6)]' },
  logistics: { outer: 'bg-purple-500/20', outerSelected: 'bg-purple-500/40 scale-125', inner: 'bg-purple-600', shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.6)]' },
  billing: { outer: 'bg-rose-500/20', outerSelected: 'bg-rose-500/40 scale-125', inner: 'bg-rose-600', shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.6)]' },
  journal: { outer: 'bg-cyan-500/20', outerSelected: 'bg-cyan-500/40 scale-125', inner: 'bg-cyan-600', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.6)]' },
  payment: { outer: 'bg-teal-500/20', outerSelected: 'bg-teal-500/40 scale-125', inner: 'bg-teal-600', shadow: 'shadow-[0_0_20px_rgba(20,184,166,0.6)]' },
  primary: { outer: 'bg-primary/20', outerSelected: 'bg-primary/40 scale-125', inner: 'bg-primary', shadow: 'shadow-[0_0_20px_rgba(78,69,228,0.6)]' },
};

const API_URL = (process.env.VITE_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, "");

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('hub');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeGap, setNodeGap] = useState(1.0);
  const [showGapSlider, setShowGapSlider] = useState(false);

  const generateId = () => `chat_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const [chatId, setChatId] = useState<string>(generateId());

  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [initialNodes, setInitialNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [messages, setMessages] = useState<{role: string, text: string, sql?: string, results?: any, highlight_nodes?: string[]}[]>([
    { role: 'ai', text: "Hello! I've indexed your sap-o2c-data graph. You can ask about relationships, anomalies, or summaries across your entities." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const transformWrapperRef = useRef<any>(null);

  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const lastPointerPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetch(`${API_URL}/api/graph`)

      .then(res => res.json())
      .then(data => {
        setNodes(data.nodes || []);
        setInitialNodes(JSON.parse(JSON.stringify(data.nodes || [])));
        setEdges(data.edges || []);
      })
      .catch(err => console.error("Error fetching graph data:", err));
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = { role: 'user', text: chatInput };
    
    // Capture current history before update
    const currentHistory = [...messages];
    
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Build a clean history: only user+ai pairs (exclude initial welcome AI message)
      // Filter to only include messages from first user message onwards, then take last 6
      const firstUserIdx = currentHistory.findIndex(m => m.role === 'user');
      const cleanHistory = firstUserIdx >= 0 ? currentHistory.slice(firstUserIdx) : [];
      const historyPayload = cleanHistory.slice(-6).map(m => ({ role: m.role, text: m.text }));
      
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.text, history: historyPayload })
      });
      
      if (!res.body) throw new Error("No response body");

      // Add a placeholder AI message that we will stream into
      setMessages(prev => [...prev, { role: 'ai', text: "", sql: null, results: null, highlight_nodes: [] }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let aiText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;
              try {
                const data = JSON.parse(dataStr);
                
                if (data.usage && data.usage.total_tokens) {
                  setTotalTokens(prev => prev + data.usage.total_tokens);
                }

                if (data.text) {
                  aiText += data.text;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: aiText };
                    return newMsgs;
                  });
                }
                
                if (data.sql !== undefined || data.results !== undefined) {
                  // Final payload
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { 
                      ...newMsgs[newMsgs.length - 1], 
                      sql: data.sql, 
                      results: data.results, 
                      highlight_nodes: data.highlight_nodes || []
                    };
                    return newMsgs;
                  });
                  if (data.highlight_nodes && Array.isArray(data.highlight_nodes)) {
                    setHighlightedNodes(data.highlight_nodes);
                  } else {
                    setHighlightedNodes([]);
                  }
                }
              } catch (e) {
                console.error("Error parsing stream chunk", e, dataStr);
              }
            }
          }
        }
      }
      // Auto-save to localStorage after every completed AI response
      setMessages(prev => {
        const finalMsgs = prev;
        const firstUser = finalMsgs.findIndex(m => m.role === 'user');
        if (firstUser >= 0) {
          const meta = {
            messages: finalMsgs,
            totalTokens: 0 // updated separately
          };
          try {
            // Get existing index
            const idx: string[] = JSON.parse(localStorage.getItem('cog_history_index') || '[]');
            if (!idx.includes(chatId)) {
              idx.unshift(chatId);
              localStorage.setItem('cog_history_index', JSON.stringify(idx.slice(0, 50)));
            }
            localStorage.setItem(`cog_history_${chatId}`, JSON.stringify(meta));
          } catch (e) { console.warn('localStorage save failed', e); }
        }
        return finalMsgs;
      });
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1].role === 'ai' && newMsgs[newMsgs.length - 1].text === "") {
             newMsgs[newMsgs.length - 1] = { role: 'ai', text: "Error connecting to the analytical engine." };
             return newMsgs;
        } else {
             return [...prev, { role: 'ai', text: "Error connecting to the analytical engine." }];
        }
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleExportChat = () => {
    let md = `# Conversation Export: ${chatId}\n\n`;
    messages.forEach(m => {
      const role = m.role === 'user' ? 'User' : 'COG AI';
      md += `### ${role}\n${m.text}\n\n`;
      if (m.sql) md += `**SQL:**\n\`\`\`sql\n${m.sql}\n\`\`\`\n\n`;
      if (m.highlight_nodes) md += `**Highlighted Nodes:** ${m.highlight_nodes.join(', ')}\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chatId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewChat = async () => {
    if (messages.length > 1) {
      // Save to localStorage
      const meta = { messages, totalTokens };
      try {
        const idx: string[] = JSON.parse(localStorage.getItem('cog_history_index') || '[]');
        if (!idx.includes(chatId)) {
          idx.unshift(chatId);
          localStorage.setItem('cog_history_index', JSON.stringify(idx.slice(0, 50)));
        }
        localStorage.setItem(`cog_history_${chatId}`, JSON.stringify(meta));
      } catch (e) { console.warn('localStorage save failed', e); }
      // Also try backend save (for local dev)
      fetch(`${API_URL}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId, messages, totalTokens })
      }).catch(() => {});
    }
    setChatId(generateId());
    setMessages([{ role: 'ai', text: "Hello! I've indexed your sap-o2c-data graph. You can ask about relationships, anomalies, or summaries across your entities." }]);
    setHighlightedNodes([]);
    setTotalTokens(0);
  };

  const loadConversation = async (id: string) => {
    try {
      // Try localStorage first
      const stored = localStorage.getItem(`cog_history_${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        setChatId(id);
        setMessages(data.messages || []);
        setTotalTokens(data.totalTokens || 0);
        setHighlightedNodes(data.messages?.[data.messages.length - 1]?.highlight_nodes || []);
        setActiveTab('hub');
        setIsRightSidebarOpen(true);
        return;
      }
      // Fallback: backend (local dev)
      const res = await fetch(`${API_URL}/api/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setChatId(id);
          setMessages(data.messages);
          setTotalTokens(data.totalTokens || 0);
          setHighlightedNodes(data.messages[data.messages.length - 1]?.highlight_nodes || []);
          setActiveTab('hub');
          setIsRightSidebarOpen(true);
        }
      }
    } catch (e) { console.error('Failed to load conversation', e); }
  };

  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setDraggingNodeId(nodeId);
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    setSelectedNodeId(nodeId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingNodeId) return;
    
    // Get current scale from TransformWrapper
    const scale = transformWrapperRef.current?.state?.scale || 1;
    
    const dx = (e.clientX - lastPointerPos.current.x) / scale;
    const dy = (e.clientY - lastPointerPos.current.y) / scale;

    // Safety check against unhandled native drag jumps or zero-scale NaN
    if (isNaN(dx) || isNaN(dy) || Math.abs(dx) > 500 || Math.abs(dy) > 500) {
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        return;
    }

    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === draggingNodeId) {
        return {
          ...node,
          x: Math.max(0, Math.min(3000, (node.x || 0) + dx)),
          y: Math.max(0, Math.min(3000, (node.y || 0) + dy))
        };
      }
      return node;
    }));

    lastPointerPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  const resetPositions = () => {
    setNodes(JSON.parse(JSON.stringify(initialNodes)));
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
    { id: 'history', icon: 'history' },
    { id: 'analysis', icon: 'analytics' },
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
        <section 
          className="flex-1 relative overflow-hidden bg-surface-container-lowest graph-bg ml-16" 
          onClick={() => setSelectedNodeId(null)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className={`absolute inset-0 w-full h-full ${activeTab === 'hub' ? 'block' : 'hidden'}`}>
            <TransformWrapper
              ref={transformWrapperRef}
              initialScale={1}
              minScale={0.1}
              maxScale={4}
              centerOnInit={true}
              limitToBounds={false}
              panning={{ disabled: !!draggingNodeId }}
            >
              {({ zoomIn, zoomOut, resetTransform, centerView, setTransform }) => (
                <div className="w-full h-full relative">
                  {/* Graph Canvas Simulation */}
                  <TransformComponent 
                    wrapperStyle={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} 
                    contentStyle={{ width: "3000px", height: "3000px" }}
                  >
                    <div className="w-[3000px] h-[3000px] relative select-none">
                      {/* Edges */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" stroke="currentColor" strokeWidth="3">
                        {edges.map((edge, i) => {
                          const sourceNode = nodes.find(n => n.id === edge.source);
                          const targetNode = nodes.find(n => n.id === edge.target);
                          if (!sourceNode || !targetNode || sourceNode.x === undefined) return null;
                          
                          const center = 1500;
                          const x1 = center + (sourceNode.x - center) * nodeGap;
                          const y1 = center + (sourceNode.y - center) * nodeGap;
                          const x2 = center + (targetNode.x - center) * nodeGap;
                          const y2 = center + (targetNode.y - center) * nodeGap;

                          return (
                            <line
                              key={i}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              strokeDasharray={edge.dashed ? "8" : "0"}
                              className="text-on-surface-variant transition-all duration-300"
                              strokeOpacity={0.4}
                            />
                          );
                        })}
                      </svg>

                      {/* Nodes */}
                      {nodes.map(node => {
                        const isSelected = selectedNodeId === node.id;
                        const isHighlighted = highlightedNodes.includes(node.id);
                        const isAnyNodeHighlighted = highlightedNodes.length > 0;
                        const isDimmed = isAnyNodeHighlighted && !isHighlighted;
                        
                        const center = 1500;
                        const nx = center + (node.x - center) * nodeGap;
                        const ny = center + (node.y - center) * nodeGap;

                        const theme = themeMap[node.theme] || themeMap['primary'];
                        return (
                          <div
                            key={node.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer ${isSelected || isHighlighted ? 'z-20' : 'z-10 hover:z-20'} ${draggingNodeId === node.id ? '' : 'transition-all duration-300'} ${isDimmed ? 'grayscale opacity-60' : ''}`}
                            style={{ left: nx, top: ny }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(node.id);
                            }}
                            onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                          >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center relative transition-all duration-300 ${isSelected ? theme.outerSelected : theme.outer} ${isHighlighted ? 'animate-pulse ring-4 ring-primary ring-offset-2 ring-offset-surface-container-lowest' : ''}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 ${theme.inner} ${isSelected || isHighlighted ? theme.shadow : 'shadow-md'} ${isHighlighted ? 'scale-110' : ''}`}>
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
                <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10 scale-90 origin-bottom-left" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 overflow-hidden">
                    <button onClick={() => zoomIn()} className="p-2.5 hover:bg-surface-container-low transition-colors text-primary" title="Zoom In"><span className="material-symbols-outlined text-xl">add</span></button>
                    <div className="h-px bg-outline-variant/10 w-full"></div>
                    <button onClick={() => zoomOut()} className="p-2.5 hover:bg-surface-container-low transition-colors text-primary" title="Zoom Out"><span className="material-symbols-outlined text-xl">remove</span></button>
                  </div>
                  <button onClick={() => resetPositions()} className="bg-surface-container-lowest p-2.5 rounded-xl shadow-lg border border-outline-variant/10 hover:bg-surface-container-low transition-colors text-primary" title="Reset Node Positions">
                    <span className="material-symbols-outlined text-xl">restart_alt</span>
                  </button>
                  <div className="relative">
                    {showGapSlider && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-48 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-2xl border border-outline-variant/20 p-4 animate-in fade-in slide-in-from-left-2 duration-200 z-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Node Spacing</span>
                          <span className="text-[10px] font-mono text-on-surface-variant">{nodeGap.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="3.0" 
                          step="0.1" 
                          value={nodeGap}
                          onChange={(e) => setNodeGap(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-primary/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    )}
                    <button 
                      onClick={() => setShowGapSlider(!showGapSlider)} 
                      className={`p-2.5 rounded-xl shadow-lg border border-outline-variant/10 transition-all ${showGapSlider ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest hover:bg-surface-container-low text-primary'}`} 
                      title="Adjust Node Spacing"
                    >
                      <span className="material-symbols-outlined text-xl">straighten</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      resetTransform();
                      setTimeout(() => centerView(), 100);
                    }} 
                    className="bg-surface-container-lowest p-2.5 rounded-xl shadow-lg border border-outline-variant/10 hover:bg-surface-container-low transition-colors text-primary" 
                    title="Reset View (Center All)"
                  >
                    <span className="material-symbols-outlined text-xl">zoom_out_map</span>
                  </button>
                </div>
              </div>
            )}
          </TransformWrapper>
          </div>

          {activeTab === 'database' && <DatabaseView />}
          {activeTab === 'history' && <HistoryView onSelect={loadConversation} />}
          {activeTab === 'analysis' && <AnalysisView />}
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
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedNode.data.sections ? selectedNode.data.sections.map((section: any, idx: number) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 border-b border-outline-variant/10 pb-1">{section.title}</h4>
                    <div className="grid grid-cols-1 gap-y-2 bg-surface-container-low/30 p-3 rounded-xl border border-outline-variant/10">
                      {section.fields.map((field: any, fIdx: number) => (
                        <div key={fIdx} className="flex flex-col">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">{field.label}</span>
                          <span className="text-[11px] font-medium text-on-surface break-words leading-tight mt-0.5">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                   <div className="text-xs text-on-surface-variant italic">No detailed attributes available.</div>
                )}
                
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
            <div className="flex flex-col">
              <span className={`text-xs font-bold text-on-surface-variant uppercase tracking-widest transition-opacity duration-300 ${isRightSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Conversation</span>
              <span className={`text-[10px] font-mono text-on-surface-variant/70 transition-opacity duration-300 ${isRightSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>{chatId}</span>
            </div>
            <div className="flex items-center gap-1 absolute right-12">
              <button 
                onClick={handleExportChat}
                className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                title="Export Chat as Markdown"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
              <button 
                onClick={handleNewChat}
                className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                title="New Chat (Saves current conversation)"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
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
                    {msg.role === 'ai' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}
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
