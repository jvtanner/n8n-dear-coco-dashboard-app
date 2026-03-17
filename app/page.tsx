'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type DayOrder = {
  plain: number;
  classicCreamCheese: number;
  saltedCaramelAndPecan: number;
  lotusBiscoff: number;
};

type OrderData = {
  tuesday: DayOrder;
  thursday: DayOrder;
  saturday: DayOrder;
};

type PendingOrder = {
  venue: string;
  manager: string;
  order: OrderData;
  callbackUrl: string;
  receivedAt: string;
  status: 'pending' | 'approved' | 'rejected';
};

// ── Constants ─────────────────────────────────────────────────────────────────

const FLAVOURS: { key: keyof DayOrder; label: string; icon: string }[] = [
  { key: 'plain',                 label: 'Plain',                    icon: '○' },
  { key: 'classicCreamCheese',    label: 'Classic Cream Cheese',     icon: '◎' },
  { key: 'saltedCaramelAndPecan', label: 'Salted Caramel & Pecan',   icon: '◉' },
  { key: 'lotusBiscoff',          label: 'Lotus Biscoff',            icon: '◈' },
];

const DAYS: { key: keyof OrderData; label: string }[] = [
  { key: 'tuesday',  label: 'Tuesday'  },
  { key: 'thursday', label: 'Thursday' },
  { key: 'saturday', label: 'Saturday' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayTotal(d: DayOrder): number {
  return d.plain + d.classicCreamCheese + d.saltedCaramelAndPecan + d.lotusBiscoff;
}

function deepCopyOrder(o: OrderData): OrderData {
  return {
    tuesday:  { ...o.tuesday },
    thursday: { ...o.thursday },
    saturday: { ...o.saturday },
  };
}

// ── Style constants ───────────────────────────────────────────────────────────

const cg: React.CSSProperties  = { fontFamily: "'Cormorant Garamond', serif" };
const dm: React.CSSProperties  = { fontFamily: "'DM Sans', sans-serif" };
const lbl: React.CSSProperties = {
  ...dm,
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#A89070',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FontLink() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#FAF7F0', minHeight: '100vh' }}>
      <style>{`
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type='number'] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#EDE3D5] bg-white/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F5E6D0] flex items-center justify-center text-lg select-none">
              🥐
            </div>
            <div>
              <h1 style={{ ...cg, fontWeight: 600, fontSize: 19, lineHeight: 1 }} className="text-[#2C1A0E]">
                Dear Coco
              </h1>
              <p style={{ ...dm, fontSize: 10, letterSpacing: '0.1em' }} className="text-[#9A7B5C] mt-0.5 uppercase">
                Order Review
              </p>
            </div>
          </div>
          <span
            style={{ ...dm, fontSize: 10, letterSpacing: '0.1em' }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3E2] text-[#B8621A] uppercase"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8621A] animate-pulse inline-block" />
            House of Sin
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">{children}</main>

      <footer className="text-center pb-10">
        <p style={{ ...dm, fontSize: 10, letterSpacing: '0.1em' }} className="text-[#C8BBA8] uppercase">
          Dear Coco · House of Sin · Refreshes every 5 s
        </p>
      </footer>
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [pendingOrder,  setPendingOrder]  = useState<PendingOrder | null>(null);
  const [originalOrder, setOriginalOrder] = useState<OrderData | null>(null);
  const [editedOrder,   setEditedOrder]   = useState<OrderData | null>(null);
  const [notes,         setNotes]         = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [result,        setResult]        = useState<'approved' | 'rejected' | null>(null);
  const [error,         setError]         = useState('');
  const [loaded,        setLoaded]        = useState(false);

  const lastTsRef = useRef<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res  = await fetch('/api/current-order');
      const data = await res.json();

      if (data.order) {
        const o = data.order as PendingOrder;
        setPendingOrder(o);
        if (o.receivedAt !== lastTsRef.current) {
          lastTsRef.current = o.receivedAt;
          const copy = deepCopyOrder(o.order);
          setOriginalOrder(copy);
          setEditedOrder(deepCopyOrder(o.order));
          setNotes('');
          setResult(null);
          setError('');
        }
      } else {
        if (lastTsRef.current !== null) {
          lastTsRef.current = null;
          setPendingOrder(null);
          setOriginalOrder(null);
          setEditedOrder(null);
        }
      }
    } catch {
      /* silent — poll will retry */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchOrder();
    const id = setInterval(fetchOrder, 5000);
    return () => clearInterval(id);
  }, [fetchOrder]);

  function updateQty(day: keyof OrderData, flavour: keyof DayOrder, value: string) {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setEditedOrder(prev => prev ? { ...prev, [day]: { ...prev[day], [flavour]: num } } : prev);
  }

  async function handleSubmit(action: 'approved' | 'rejected') {
    if (!editedOrder) return;
    setSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, order: editedOrder, adjustmentNotes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(action);
        setTimeout(() => {
          setResult(null);
          setPendingOrder(null);
          setOriginalOrder(null);
          setEditedOrder(null);
          lastTsRef.current = null;
        }, 8000);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const hasEdits = (): boolean =>
    !!(editedOrder && originalOrder &&
      DAYS.some(({ key }) =>
        FLAVOURS.some(({ key: fk }) => editedOrder[key][fk] !== originalOrder[key][fk])
      ));

  const grandTotal = editedOrder
    ? DAYS.reduce((s, { key }) => s + dayTotal(editedOrder[key]), 0)
    : 0;

  // ── Loading ──────────────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <>
        <FontLink />
        <Shell>
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: '60vh' }}>
            <span className="text-4xl animate-spin" style={{ animationDuration: '3s', display: 'inline-block' }}>🌀</span>
            <p style={dm} className="text-sm text-[#9A7B5C]">Loading…</p>
          </div>
        </Shell>
      </>
    );
  }

  // ── Result confirmation ───────────────────────────────────────────────────

  if (result) {
    const approved = result === 'approved';
    return (
      <>
        <FontLink />
        <Shell>
          <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
            <div className={`max-w-sm w-full text-center px-10 py-12 rounded-3xl border ${approved ? 'bg-[#EEF6F1] border-[#B6D9C3]' : 'bg-[#FBF0EF] border-[#F0C4C0]'}`}>
              <div style={{ fontSize: 40 }} className="mb-5 select-none">
                {approved ? '✦' : '✕'}
              </div>
              <h2 style={{ ...cg, fontSize: 28, fontWeight: 600 }} className={`mb-3 ${approved ? 'text-[#2A5C3F]' : 'text-[#8B3A3A]'}`}>
                {approved ? 'Order sent!' : 'Order rejected'}
              </h2>
              <p style={dm} className="text-[#6B5B47] text-sm leading-relaxed">
                {approved
                  ? 'The cinnamon bun order has been approved and sent to Dear Coco.'
                  : 'The order has been rejected and will not be sent.'}
              </p>
              <p style={{ ...dm, fontSize: 11 }} className="text-[#C8BBA8] mt-8">Returning in a moment…</p>
            </div>
          </div>
        </Shell>
      </>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!pendingOrder || !editedOrder || !originalOrder) {
    return (
      <>
        <FontLink />
        <Shell>
          <div className="flex flex-col items-center justify-center gap-5 text-center" style={{ minHeight: '65vh' }}>
            <div className="w-20 h-20 rounded-full bg-[#EDE3D5] flex items-center justify-center text-3xl select-none">
              🥐
            </div>
            <div>
              <h2 style={{ ...cg, fontSize: 26, fontWeight: 600 }} className="text-[#2C1A0E] mb-2">
                No pending orders
              </h2>
              <p style={dm} className="text-[#9A7B5C] text-sm max-w-xs leading-relaxed">
                Waiting for the next order to arrive. This page refreshes automatically every 5 seconds.
              </p>
            </div>
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="block w-1.5 h-1.5 rounded-full bg-[#C8935A] animate-pulse"
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              ))}
            </div>
          </div>
        </Shell>
      </>
    );
  }

  // ── Full review UI ────────────────────────────────────────────────────────

  return (
    <>
      <FontLink />
      <Shell>

        {/* Order meta card */}
        <div className="bg-white rounded-2xl border border-[#EDE3D5] p-6 mb-6">
          <div className="flex flex-wrap gap-x-8 gap-y-4 items-start justify-between">
            <div>
              <p style={lbl} className="mb-1">Venue</p>
              <p style={{ ...cg, fontSize: 26, fontWeight: 600 }} className="text-[#2C1A0E]">
                {pendingOrder.venue}
              </p>
            </div>
            <div>
              <p style={lbl} className="mb-1">Submitted by</p>
              <p style={{ ...dm, fontWeight: 500 }} className="text-[#2C1A0E]">{pendingOrder.manager || '—'}</p>
            </div>
            <div>
              <p style={lbl} className="mb-1">Received</p>
              <p style={dm} className="text-[#2C1A0E] text-sm">{formatDate(pendingOrder.receivedAt)}</p>
            </div>
            <div className="text-right">
              <p style={lbl} className="mb-1">Total buns</p>
              <p style={{ ...cg, fontSize: 26, fontWeight: 600 }} className="text-[#B8621A]">
                {grandTotal}
              </p>
            </div>
          </div>
        </div>

        {/* Day cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {DAYS.map(({ key, label: dayLabel }) => {
            const day  = editedOrder[key];
            const orig = originalOrder[key];
            const tot  = dayTotal(day);

            return (
              <div key={key} className="bg-white rounded-2xl border border-[#EDE3D5] overflow-hidden">
                <div className="px-5 py-4 bg-[#FDFAF5] border-b border-[#EDE3D5] flex items-baseline justify-between">
                  <h2 style={{ ...cg, fontSize: 20, fontWeight: 600 }} className="text-[#2C1A0E]">
                    {dayLabel}
                  </h2>
                  <span style={{ ...dm, fontSize: 12 }} className="text-[#A89070]">
                    {tot} bun{tot !== 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  {FLAVOURS.map(({ key: fk, label: fl, icon }) => {
                    const current  = day[fk];
                    const original = orig[fk];
                    const changed  = current !== original;

                    return (
                      <div
                        key={fk}
                        className={`flex items-center justify-between px-5 py-3 border-b border-[#F2EBE0] last:border-0 transition-colors ${changed ? 'bg-[#FFFCF5]' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[#C8935A] text-xs select-none flex-shrink-0">{icon}</span>
                          <span style={{ ...dm, fontSize: 13 }} className="text-[#3D2B1A] truncate">{fl}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {changed && (
                            <span style={{ ...dm, fontSize: 11 }} className="text-[#C8935A] line-through tabular-nums">
                              {original}
                            </span>
                          )}
                          <input
                            type="number"
                            min={0}
                            value={current}
                            onChange={e => updateQty(key, fk, e.target.value)}
                            disabled={submitting}
                            style={{ ...dm, fontSize: 13, fontWeight: 500 }}
                            className={`w-14 text-center rounded-lg border py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C8935A] transition-all disabled:opacity-50 ${
                              changed
                                ? 'border-[#C8935A] text-[#B8621A] bg-[#FEF3E2]'
                                : 'border-[#EDE3D5] text-[#2C1A0E] bg-[#FAF7F0]'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes + Actions */}
        <div className="bg-white rounded-2xl border border-[#EDE3D5] p-6 space-y-5">

          <div>
            <label style={lbl} className="block mb-2">
              Reason for changes{' '}
              <span className="text-[#C8BBA8] normal-case tracking-normal" style={{ textTransform: 'none', letterSpacing: 0 }}>
                (optional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Reduced Thursday plain by 5 — bank holiday next week"
              rows={3}
              disabled={submitting}
              style={{ ...dm, fontSize: 13 }}
              className="w-full border border-[#EDE3D5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8935A] resize-none placeholder-[#C8BBA8] bg-[#FAF7F0] text-[#2C1A0E] transition-colors disabled:opacity-50"
            />
          </div>

          {hasEdits() && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FEF3E2] border border-[#F0D5A8]">
              <span className="text-[#B8621A] mt-px select-none">✎</span>
              <p style={{ ...dm, fontSize: 12 }} className="text-[#9A6B2C] leading-relaxed">
                You&rsquo;ve made changes to the original order.{' '}
                {notes.trim() ? 'Adjustment notes will be included.' : 'Consider adding a reason above.'}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FBF0EF] border border-[#F0C4C0]">
              <span className="text-[#8B3A3A] mt-px select-none">⚠</span>
              <p style={{ ...dm, fontSize: 12 }} className="text-[#8B3A3A] leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={() => handleSubmit('approved')}
              disabled={submitting}
              style={{ ...dm, fontWeight: 500, fontSize: 14 }}
              className="flex-1 py-3.5 rounded-xl text-white bg-[#2A5C3F] hover:bg-[#22503A] active:bg-[#1B4230] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending…' : '✓  Approve & Send Order'}
            </button>
            <button
              onClick={() => handleSubmit('rejected')}
              disabled={submitting}
              style={{ ...dm, fontWeight: 500, fontSize: 14 }}
              className="sm:w-36 py-3.5 rounded-xl border border-[#D4928A] text-[#8B3A3A] hover:bg-[#FBF0EF] active:bg-[#F5E0DE] disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>

      </Shell>
    </>
  );
}
