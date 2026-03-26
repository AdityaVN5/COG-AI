import React, { useEffect, useState } from 'react';

interface BrokenFlows {
  stuck_orders: any[];
  unbilled_deliveries: any[];
  unpaid_invoices: any[];
}

export default function AnalysisView() {
  const [data, setData] = useState<BrokenFlows | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8099/api/analysis/broken-flows')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-on-surface-variant animate-pulse">
        <span className="material-symbols-outlined text-4xl mb-4">analytics</span>
        <p className="font-medium">Analyzing process flows...</p>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-container-lowest text-on-surface custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process Health Analysis</h1>
          <p className="text-sm text-on-surface-variant mt-1">Detecting bottlenecks and broken Order-to-Cash flows.</p>
        </div>
        <div className="px-4 py-2 bg-error/10 rounded-xl border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-sm">warning</span>
          <span className="text-xs font-bold text-error uppercase tracking-widest">
            {((data?.stuck_orders.length || 0) + (data?.unbilled_deliveries.length || 0) + (data?.unpaid_invoices.length || 0))} Critical Gaps
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stuck Orders */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined">shopping_cart_checkout</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">Stuck Orders</h2>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">No Delivery Created</p>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-4 space-y-3">
            {data?.stuck_orders.map((order: any) => (
              <div key={order.id} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 hover:border-amber-500/40 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold text-primary">#{order.id}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full font-bold uppercase">{order.status || 'Pending'}</span>
                </div>
                <div className="text-[11px] text-on-surface-variant mb-3">Customer: {order.customer}</div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>{order.amount.toLocaleString()} {order.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unbilled Deliveries */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">Unbilled Deliveries</h2>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Shipped but not Invoiced</p>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-4 space-y-3">
            {data?.unbilled_deliveries.map((delivery: any) => (
              <div key={delivery.id} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 hover:border-blue-500/40 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold text-primary">#{delivery.id}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full font-bold uppercase">Shipped</span>
                </div>
                <div className="text-[11px] text-on-surface-variant mb-3">Customer: {delivery.customer}</div>
                <div className="flex justify-between items-center text-xs font-bold font-mono">
                  <span>Date: {delivery.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">Unpaid Invoices</h2>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Awaiting Payment Clearing</p>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-4 space-y-3">
            {data?.unpaid_invoices.map((invoice: any) => (
              <div key={invoice.id} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 hover:border-error/40 transition-colors group focus-within:border-error/40">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold text-primary">#{invoice.id}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-error/10 text-error rounded-full font-bold uppercase">Pending</span>
                </div>
                <div className="text-[11px] text-on-surface-variant mb-1">Customer: {invoice.customer}</div>
                <div className="text-[10px] text-on-surface-variant/70 mb-3 font-mono">AccDoc: {invoice.accDoc}</div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-error">{invoice.amount.toLocaleString()} {invoice.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
