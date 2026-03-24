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

const initialNodes = [
  { id: 'ORDER_88231', theme: 'primary', icon: 'shopping_cart', label: 'ORDER_88231', x: 1500, y: 1500, data: { status: 'Fulfilled', amount: '$2,440.00', date: 'Oct 24, 2023', type: 'Transactional Order' } },
  { id: 'CUST_1', theme: 'secondary', icon: 'person', label: 'Customer: Sarah J.', x: 1200, y: 1300, data: { status: 'Active', amount: 'N/A', date: 'Jan 12, 2022', type: 'Retail Customer' } },
  { id: 'INV_22', theme: 'tertiary', icon: 'description', label: 'Invoice_V22', x: 1700, y: 1800, data: { status: 'Paid', amount: '$2,440.00', date: 'Oct 24, 2023', type: 'Billing' } },
  { id: 'SHIP_90', theme: 'primary', icon: 'local_shipping', label: 'Shipment_90', x: 1800, y: 1300, data: { status: 'In Transit', amount: '--', date: 'Oct 25, 2023', type: 'Logistics' } },
  { id: 'PROD_A', theme: 'secondary', icon: 'inventory_2', label: 'Widget Pro', x: 1200, y: 1700, data: { status: 'In Stock', amount: '$1,220.00', date: 'N/A', type: 'Product' } },
  { id: 'PROD_B', theme: 'secondary', icon: 'inventory_2', label: 'Widget Lite', x: 1400, y: 1800, data: { status: 'In Stock', amount: '$1,220.00', date: 'N/A', type: 'Product' } },
  { id: 'PAY_1', theme: 'tertiary', icon: 'payments', label: 'Payment_1', x: 1900, y: 1600, data: { status: 'Processed', amount: '$2,440.00', date: 'Oct 24, 2023', type: 'Transaction' } },
  { id: 'SUPP_1', theme: 'secondary', icon: 'factory', label: 'Supplier A', x: 900, y: 1600, data: { status: 'Active', amount: 'N/A', date: 'N/A', type: 'Vendor' } },
  { id: 'SUPP_2', theme: 'secondary', icon: 'factory', label: 'Supplier B', x: 1100, y: 1900, data: { status: 'Active', amount: 'N/A', date: 'N/A', type: 'Vendor' } },
  { id: 'ORDER_88232', theme: 'primary', icon: 'shopping_cart', label: 'ORDER_88232', x: 1500, y: 1100, data: { status: 'Pending', amount: '$850.00', date: 'Oct 26, 2023', type: 'Transactional Order' } },
  { id: 'CUST_2', theme: 'secondary', icon: 'person', label: 'Customer: Mike T.', x: 1200, y: 900, data: { status: 'Active', amount: 'N/A', date: 'Mar 05, 2023', type: 'Retail Customer' } },
  { id: 'INV_23', theme: 'tertiary', icon: 'description', label: 'Invoice_V23', x: 1800, y: 1000, data: { status: 'Unpaid', amount: '$850.00', date: 'Oct 26, 2023', type: 'Billing' } },
  { id: 'PROD_C', theme: 'secondary', icon: 'inventory_2', label: 'Gadget Max', x: 1200, y: 1100, data: { status: 'Low Stock', amount: '$850.00', date: 'N/A', type: 'Product' } },
];

const initialEdges = [
  { source: 'CUST_1', target: 'ORDER_88231', dashed: false },
  { source: 'INV_22', target: 'ORDER_88231', dashed: true },
  { source: 'ORDER_88231', target: 'SHIP_90', dashed: false },
  { source: 'PROD_A', target: 'ORDER_88231', dashed: false },
  { source: 'PROD_B', target: 'ORDER_88231', dashed: false },
  { source: 'INV_22', target: 'PAY_1', dashed: false },
  { source: 'SUPP_1', target: 'PROD_A', dashed: true },
  { source: 'SUPP_2', target: 'PROD_B', dashed: true },
  { source: 'CUST_2', target: 'ORDER_88232', dashed: false },
  { source: 'PROD_C', target: 'ORDER_88232', dashed: false },
  { source: 'INV_23', target: 'ORDER_88232', dashed: true },
  { source: 'SUPP_1', target: 'PROD_C', dashed: true },
];

const themeMap: Record<string, { outer: string, outerSelected: string, inner: string, shadow: string }> = {
  primary: { outer: 'bg-primary/20', outerSelected: 'bg-primary/40 scale-125', inner: 'bg-primary', shadow: 'shadow-[0_0_20px_rgba(78,69,228,0.6)]' },
  secondary: { outer: 'bg-secondary/10', outerSelected: 'bg-secondary/30 scale-125', inner: 'bg-secondary-dim', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]' },
  tertiary: { outer: 'bg-tertiary/10', outerSelected: 'bg-tertiary/30 scale-125', inner: 'bg-tertiary-dim', shadow: 'shadow-[0_0_20px_rgba(20,184,166,0.6)]' },
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('hub');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('ORDER_88231');

  const selectedNode = initialNodes.find(n => n.id === selectedNodeId);

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
                        {initialEdges.map((edge, i) => {
                          const sourceNode = initialNodes.find(n => n.id === edge.source);
                          const targetNode = initialNodes.find(n => n.id === edge.target);
                          if (!sourceNode || !targetNode) return null;
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
                      {initialNodes.map(node => {
                        const isSelected = selectedNodeId === node.id;
                        const theme = themeMap[node.theme];
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
            {/* AI Message */}
            <div className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
              </div>
              <div className="space-y-4 max-w-[90%]">
                <div className="bg-surface-container-lowest p-4 rounded-2xl rounded-tl-none text-sm text-on-surface leading-relaxed shadow-sm border border-outline-variant/5">
                  Hello! I've indexed your data graph. You can ask about relationships, anomalies, or summaries across your entities.
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Suggested Queries</p>
                  <div className="flex flex-col gap-2">
                    <button className="text-left text-xs p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:bg-primary-container/5 hover:border-primary/30 transition-all text-on-surface-variant flex justify-between items-center group">
                      Which products have the highest billing count?
                      <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100">north_east</span>
                    </button>
                    <button className="text-left text-xs p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:bg-primary-container/5 hover:border-primary/30 transition-all text-on-surface-variant flex justify-between items-center group">
                      Find incomplete order flows for Q4
                      <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100">north_east</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* User Message */}
            <div className="flex justify-end">
              <div className="bg-primary text-on-primary p-4 rounded-2xl rounded-tr-none text-sm max-w-[85%] shadow-md">
                Show me a breakdown of all transactions linked to <span className="bg-white/20 px-1 rounded font-medium">Order #88231</span>.
              </div>
            </div>

            {/* AI Response */}
            <div className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
              </div>
              <div className="space-y-4 w-full">
                <div className="bg-surface-container-lowest p-4 rounded-2xl rounded-tl-none text-sm text-on-surface leading-relaxed shadow-sm border border-outline-variant/5">
                  Found 3 related transactional entities for Order #88231. The graph indicates a direct dependency on Invoice_V22.
                </div>
                {/* Mini Table */}
                <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-surface-container-low border-b border-outline-variant/10 text-on-surface-variant uppercase">
                      <tr>
                        <th className="text-left p-3 font-bold tracking-tighter">Entity</th>
                        <th className="text-left p-3 font-bold tracking-tighter">Type</th>
                        <th className="text-right p-3 font-bold tracking-tighter">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      <tr className="hover:bg-surface-container-low/50">
                        <td className="p-3 font-medium">Invoice_V22</td>
                        <td className="p-3 text-on-surface-variant">Billing</td>
                        <td className="p-3 text-right">$2,440.00</td>
                      </tr>
                      <tr className="hover:bg-surface-container-low/50">
                        <td className="p-3 font-medium">Shipment_90</td>
                        <td className="p-3 text-on-surface-variant">Logistics</td>
                        <td className="p-3 text-right">--</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className={`p-6 pt-0 min-w-[300px] transition-opacity duration-300 ${isRightSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="relative flex items-end gap-2 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
              <textarea className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 resize-none max-h-32 placeholder:text-on-surface-variant/50 outline-none" placeholder="Ask COG AI..." rows={1}></textarea>
              <div className="flex items-center gap-1 p-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-lg">attach_file</span>
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-dim transition-all shadow-md">
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
