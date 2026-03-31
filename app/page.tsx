'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type Supplier =
  | 'house-of-sin' | 'purpose-foods' | 'triple-co-roast'
  | 'cups-direct' | 'cakehead' | 'amazon-uk'
  | 'carrier-bag-shop' | 'nisbets' | 'booker';

type OrderItem = {
  name: string;
  quantity: number;
  group?: string;
  unit?: string;
};

type PendingOrder = {
  supplier: Supplier;
  supplierLabel: string;
  category: string;
  orderType: 'email' | 'portal';
  venue: string;
  manager: string;
  items: OrderItem[];
  htmlEmail?: string;
  callbackUrl: string;
  receivedAt: string;
  status: 'pending';
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Style constants ──────────────────────────────────────────────────────────

const cg: React.CSSProperties = { fontFamily: "'Cormorant Garamond', serif" };
const dm: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const lbl: React.CSSProperties = { ...dm, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89070' };

// ── Per-order state ──────────────────────────────────────────────────────────

type OrderState = {
  editedItems: OrderItem[];
  originalItems: OrderItem[];
  rawInputs: Record<number, string>;
  submitting: boolean;
  result: 'approved' | 'rejected' | null;
  error: string;
};

function initOrderState(order: PendingOrder): OrderState {
  return {
    editedItems: order.items.map(i => ({ ...i })),
    originalItems: order.items.map(i => ({ ...i })),
    rawInputs: Object.fromEntries(order.items.map((item, idx) => [idx, String(item.quantity)])),
    submitting: false,
    result: null,
    error: '',
  };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FontLink() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
    />
  );
}

// ── Universal order card ─────────────────────────────────────────────────────

function OrderCard({
  order, state,
  onChangeQty, onBlurQty, onSubmit,
}: {
  order: PendingOrder;
  state: OrderState;
  onChangeQty: (index: number, value: string) => void;
  onBlurQty: (index: number) => void;
  onSubmit: (action: 'approved' | 'rejected') => void;
}) {
  const total = state.editedItems.reduce((s, i) => s + i.quantity, 0);
  const hasEdits = state.editedItems.some(
    (item, idx) => item.quantity !== state.originalItems[idx]?.quantity
  );

  // Group items by group field
  const groups: { name: string; items: { item: OrderItem; originalItem: OrderItem; globalIndex: number }[] }[] = [];
  const groupMap = new Map<string, typeof groups[0]>();

  state.editedItems.forEach((item, idx) => {
    const groupKey = item.group || '_default';
    if (!groupMap.has(groupKey)) {
      const group = { name: groupKey, items: [] as typeof groups[0]['items'] };
      groupMap.set(groupKey, group);
      groups.push(group);
    }
    groupMap.get(groupKey)!.items.push({
      item,
      originalItem: state.originalItems[idx],
      globalIndex: idx,
    });
  });

  const hasGroups = groups.length > 1 || (groups.length === 1 && groups[0].name !== '_default');
  const unitLabel = state.editedItems[0]?.unit || 'Qty';

  return (
    <div className="bg-white rounded-2xl border border-[#EDE3D5] overflow-hidden">
      {/* Card header */}
      <div className="px-7 py-6 border-b border-[#EDE3D5] flex flex-wrap gap-x-10 gap-y-4 items-start justify-between bg-[#FDFAF5]">
        <div>
          <p style={lbl} className="mb-1.5">Supplier</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#2C1A0E]">
            {order.supplierLabel}
            <span style={{ ...dm, fontSize: 11, fontWeight: 400 }} className="ml-2 text-[#C8935A]">
              {order.category}
            </span>
          </p>
        </div>
        <div>
          <p style={lbl} className="mb-1.5">Submitted by</p>
          <p style={{ ...dm, fontWeight: 500 }} className="text-[#2C1A0E]">{order.manager || '—'}</p>
        </div>
        <div>
          <p style={lbl} className="mb-1.5">Received</p>
          <p style={dm} className="text-[#2C1A0E] text-sm">{formatDate(order.receivedAt)}</p>
        </div>
        <div className="text-right">
          <p style={lbl} className="mb-1.5">Total</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#B8621A]">{total}</p>
        </div>
      </div>

      {/* Items — grouped or flat */}
      {hasGroups ? (
        <div className={`grid grid-cols-1 ${groups.length >= 3 ? 'md:grid-cols-3' : groups.length === 2 ? 'md:grid-cols-2' : ''} divide-y md:divide-y-0 md:divide-x divide-[#EDE3D5]`}>
          {groups.map(group => {
            const groupSum = group.items.reduce((s, { item }) => s + item.quantity, 0);
            return (
              <div key={group.name}>
                <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#EDE3D5] flex justify-between items-baseline">
                  <span style={{ ...cg, fontSize: 17, fontWeight: 600 }} className="text-[#2C1A0E]">{group.name}</span>
                  <span style={{ ...dm, fontSize: 11 }} className="text-[#A89070]">{groupSum} {unitLabel.toLowerCase()}</span>
                </div>
                {group.items.map(({ item, originalItem, globalIndex }) => {
                  const changed = item.quantity !== originalItem.quantity;
                  const inputVal = state.rawInputs[globalIndex] ?? String(item.quantity);
                  return (
                    <div key={globalIndex} className={`flex items-center justify-between px-6 py-4 border-b border-[#F2EBE0] last:border-0 ${changed ? 'bg-[#FFFCF5]' : ''}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[#C8935A] text-xs select-none">○</span>
                        <span style={{ ...dm, fontSize: 13 }} className="text-[#3D2B1A] truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {changed && (
                          <span style={{ ...dm, fontSize: 11 }} className="text-[#C8935A] line-through tabular-nums">{originalItem.quantity}</span>
                        )}
                        <input
                          type="number" min={0}
                          value={inputVal}
                          onChange={e => onChangeQty(globalIndex, e.target.value)}
                          onBlur={() => onBlurQty(globalIndex)}
                          disabled={state.submitting}
                          style={{ ...dm, fontSize: 13, fontWeight: 500 }}
                          className={`w-14 text-center rounded-lg border py-2 focus:outline-none focus:ring-2 focus:ring-[#C8935A] transition-all disabled:opacity-50 ${
                            changed ? 'border-[#C8935A] text-[#B8621A] bg-[#FEF3E2]' : 'border-[#EDE3D5] text-[#2C1A0E] bg-[#FAF7F0]'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-w-md mx-auto px-6 py-5">
          <div className="rounded-xl border border-[#EDE3D5] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#EDE3D5] flex justify-between">
              <span style={lbl}>{order.category || 'Item'}</span>
              <span style={lbl}>{unitLabel}</span>
            </div>
            {state.editedItems.map((item, idx) => {
              const originalItem = state.originalItems[idx];
              const changed = item.quantity !== originalItem?.quantity;
              const inputVal = state.rawInputs[idx] ?? String(item.quantity);
              return (
                <div key={idx} className={`flex items-center justify-between px-5 py-4 border-b border-[#F2EBE0] last:border-0 ${changed ? 'bg-[#FFFCF5]' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#C8935A] text-xs select-none">○</span>
                    <span style={{ ...dm, fontSize: 13 }} className="text-[#3D2B1A]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {changed && (
                      <span style={{ ...dm, fontSize: 11 }} className="text-[#C8935A] line-through tabular-nums">{originalItem.quantity}</span>
                    )}
                    <input
                      type="number" min={0}
                      value={inputVal}
                      onChange={e => onChangeQty(idx, e.target.value)}
                      onBlur={() => onBlurQty(idx)}
                      disabled={state.submitting}
                      style={{ ...dm, fontSize: 13, fontWeight: 500 }}
                      className={`w-14 text-center rounded-lg border py-2 focus:outline-none focus:ring-2 focus:ring-[#C8935A] transition-all disabled:opacity-50 ${
                        changed ? 'border-[#C8935A] text-[#B8621A] bg-[#FEF3E2]' : 'border-[#EDE3D5] text-[#2C1A0E] bg-[#FAF7F0]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {order.orderType === 'portal' && (
        <div className="px-7 pb-5 pt-2">
          <p style={{ ...dm, fontSize: 11 }} className="text-[#9A7B5C]">
            Approving will send an order summary email to the manager to complete checkout on the portal.
          </p>
        </div>
      )}

      <OrderFooter state={state} hasEdits={hasEdits} onSubmit={onSubmit} />
    </div>
  );
}

// ── Shared footer (notes + buttons) ──────────────────────────────────────────

function OrderFooter({
  state, hasEdits, onSubmit,
}: {
  state: OrderState;
  hasEdits: boolean;
  onSubmit: (action: 'approved' | 'rejected') => void;
}) {
  if (state.result) {
    const approved = state.result === 'approved';
    return (
      <div className={`mx-6 mb-7 mt-2 p-6 rounded-2xl text-center ${approved ? 'bg-[#EEF6F1] border border-[#B6D9C3]' : 'bg-[#FBF0EF] border border-[#F0C4C0]'}`}>
        <div style={{ fontSize: 28 }} className="mb-2 select-none">{approved ? '✦' : '✕'}</div>
        <p style={{ ...cg, fontSize: 18, fontWeight: 600 }} className={approved ? 'text-[#2A5C3F]' : 'text-[#8B3A3A]'}>
          {approved ? 'Order sent!' : 'Order rejected'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-7 pb-7 pt-5 space-y-4 border-t border-[#EDE3D5]">
      {hasEdits && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-[#FEF3E2] border border-[#F0D5A8]">
          <span className="text-[#B8621A] select-none mt-px">✎</span>
          <p style={{ ...dm, fontSize: 12 }} className="text-[#9A6B2C]">
            You&rsquo;ve made changes to the original order.
          </p>
        </div>
      )}
      {state.error && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-[#FBF0EF] border border-[#F0C4C0]">
          <span className="text-[#8B3A3A] select-none mt-px">⚠</span>
          <p style={{ ...dm, fontSize: 12 }} className="text-[#8B3A3A]">{state.error}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => onSubmit('approved')}
          disabled={state.submitting}
          style={{ ...dm, fontWeight: 500, fontSize: 14 }}
          className="flex-1 py-3.5 rounded-xl text-white bg-[#2A5C3F] hover:bg-[#22503A] active:bg-[#1B4230] disabled:opacity-50 transition-colors"
        >
          {state.submitting ? 'Sending…' : '✓  Approve & Send'}
        </button>
        <button
          onClick={() => onSubmit('rejected')}
          disabled={state.submitting}
          style={{ ...dm, fontWeight: 500, fontSize: 14 }}
          className="w-28 py-3.5 rounded-xl border border-[#D4928A] text-[#8B3A3A] hover:bg-[#FBF0EF] disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [states, setStates] = useState<Record<string, OrderState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const lastSnapshotRef = useRef<string>('');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/current-order');
      const data = await res.json();
      const incoming: PendingOrder[] = data.orders ?? [];
      const snapshot = JSON.stringify(incoming.map(o => o.receivedAt + o.supplier).sort());

      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setOrders(incoming);
        setStates(prev => {
          const next = { ...prev };
          for (const o of incoming) {
            if (!prev[o.supplier] || prev[o.supplier].result) {
              next[o.supplier] = initOrderState(o);
            }
          }
          return next;
        });
        setNotes(prev => {
          const next = { ...prev };
          for (const o of incoming) {
            if (!(o.supplier in next)) next[o.supplier] = '';
          }
          return next;
        });
      }
    } catch {
      /* silent */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 5000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  // ── Universal quantity update ──────────────────────────────────────────────

  function updateQty(supplier: Supplier, index: number, value: string) {
    const num = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      const newItems = s.editedItems.map((item, i) =>
        i === index ? { ...item, quantity: num } : item
      );
      return {
        ...prev,
        [supplier]: {
          ...s,
          editedItems: newItems,
          rawInputs: { ...s.rawInputs, [index]: value },
        },
      };
    });
  }

  function blurQty(supplier: Supplier, index: number) {
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      const cur = s.rawInputs[index] ?? '';
      if (cur === '' || isNaN(Number(cur))) {
        return { ...prev, [supplier]: { ...s, rawInputs: { ...s.rawInputs, [index]: '0' } } };
      }
      return prev;
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(supplier: Supplier, action: 'approved' | 'rejected') {
    const s = states[supplier];
    if (!s) return;
    setStates(prev => ({ ...prev, [supplier]: { ...prev[supplier], submitting: true, error: '' } }));
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          supplier,
          items: s.editedItems,
          adjustmentNotes: notes[supplier],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStates(prev => ({ ...prev, [supplier]: { ...prev[supplier], submitting: false, result: action } }));
        setTimeout(() => {
          setOrders(prev => prev.filter(o => o.supplier !== supplier));
          setStates(prev => { const n = { ...prev }; delete n[supplier]; return n; });
          lastSnapshotRef.current = '';
        }, 5000);
      } else {
        setStates(prev => ({ ...prev, [supplier]: { ...prev[supplier], submitting: false, error: data.error || 'Something went wrong.' } }));
      }
    } catch {
      setStates(prev => ({ ...prev, [supplier]: { ...prev[supplier], submitting: false, error: 'Network error — please try again.' } }));
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <FontLink />
      <style>{`
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type='number'] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#FAF7F0', minHeight: '100vh' }}>
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-[#EDE3D5] bg-white/90 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5E6D0] flex items-center justify-center text-lg select-none">🥐</div>
              <div>
                <h1 style={{ ...cg, fontWeight: 600, fontSize: 19, lineHeight: 1 }} className="text-[#2C1A0E]">Dear Coco</h1>
                <p style={{ ...dm, fontSize: 10, letterSpacing: '0.1em' }} className="text-[#9A7B5C] mt-0.5 uppercase">Order Review</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {orders.length > 0 && (
              <span style={{ ...dm, fontSize: 11, letterSpacing: '0.08em' }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3E2] text-[#B8621A] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8621A] animate-pulse inline-block" />
                {orders.length} pending
              </span>
            )}
              <a href="/todo" style={{ ...dm, fontSize: 11, letterSpacing: '0.08em' }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E0D8CC] text-[#A89070] uppercase hover:bg-[#FAF7F0] transition-colors">
                Checklist
              </a>
            </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          {!loaded ? (
            <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: '60vh' }}>
              <span className="text-4xl animate-spin" style={{ animationDuration: '3s', display: 'inline-block' }}>🌀</span>
              <p style={dm} className="text-sm text-[#9A7B5C]">Loading…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-5 text-center" style={{ minHeight: '65vh' }}>
              <div className="w-20 h-20 rounded-full bg-[#EDE3D5] flex items-center justify-center text-3xl select-none">🥐</div>
              <div>
                <h2 style={{ ...cg, fontSize: 26, fontWeight: 600 }} className="text-[#2C1A0E] mb-2">No pending orders</h2>
                <p style={dm} className="text-[#9A7B5C] text-sm max-w-xs leading-relaxed">
                  Waiting for the next order to arrive. Refreshes every 5 seconds.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="block w-1.5 h-1.5 rounded-full bg-[#C8935A] animate-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Venue / meta bar */}
              {orders[0] && (
                <div className="bg-white rounded-2xl border border-[#EDE3D5] px-7 py-5 flex flex-wrap gap-x-10 gap-y-3 items-center">
                  <div>
                    <p style={lbl} className="mb-1">Venue</p>
                    <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#2C1A0E]">{orders[0].venue}</p>
                  </div>
                  <div>
                    <p style={lbl} className="mb-1">Orders pending</p>
                    <p style={{ ...dm, fontWeight: 500 }} className="text-[#2C1A0E]">
                      {orders.map(o => o.supplierLabel).join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Order cards */}
              {orders.map(order => {
                const s = states[order.supplier];
                if (!s) return null;

                return (
                  <div key={order.supplier}>
                    <OrderCard
                      order={order}
                      state={s}
                      onChangeQty={(index, value) => updateQty(order.supplier, index, value)}
                      onBlurQty={index => blurQty(order.supplier, index)}
                      onSubmit={action => handleSubmit(order.supplier, action)}
                    />
                    {!s.result && (
                      <div className="mt-3 px-1">
                        <label style={lbl} className="block mb-2">
                          Reason for changes{' '}
                          <span className="text-[#C8BBA8] normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                        </label>
                        <textarea
                          value={notes[order.supplier] ?? ''}
                          onChange={e => setNotes(prev => ({ ...prev, [order.supplier]: e.target.value }))}
                          placeholder="e.g. Adjusted quantities — running low on stock"
                          rows={2}
                          style={{ ...dm, fontSize: 13 }}
                          className="w-full border border-[#EDE3D5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8935A] resize-none placeholder-[#C8BBA8] bg-white text-[#2C1A0E] transition-colors"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </main>

        <footer className="text-center pb-10">
          <p style={{ ...dm, fontSize: 10, letterSpacing: '0.1em' }} className="text-[#C8BBA8] uppercase">
            Dear Coco · Refreshes every 5 s
          </p>
        </footer>
      </div>
    </>
  );
}
