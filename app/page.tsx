'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type Supplier = 'house-of-sin' | 'purpose-foods' | 'triple-co-roast';

type HoSDayOrder = {
  plain: number;
  classicCreamCheese: number;
  saltedCaramelAndPecan: number;
  lotusBiscoff: number;
};

type HoSOrderData = {
  tuesday: HoSDayOrder;
  thursday: HoSDayOrder;
  saturday: HoSDayOrder;
};

type PFOrderData = {
  almondChocChip: number;
  raspberryCoconut: number;
  crunchyBrownie: number;
  saltedCaramel: number;
  lemonCoconut: number;
};

type TCROrderData = {
  bs1Espresso: number;
  cruiseControl: number;
  jumpstart: number;
  mixtape: number;
  shopFilter: number;
  ethiopiaDanche: number;
  rwandaRwamatamu: number;
};

type PendingOrder = {
  supplier: Supplier;
  venue: string;
  manager: string;
  order: HoSOrderData | PFOrderData | TCROrderData;
  callbackUrl: string;
  receivedAt: string;
  status: 'pending';
};

// ── Constants ─────────────────────────────────────────────────────────────────

const HOS_DAYS: { key: keyof HoSOrderData; label: string }[] = [
  { key: 'tuesday',  label: 'Tuesday'  },
  { key: 'thursday', label: 'Thursday' },
  { key: 'saturday', label: 'Saturday' },
];

const HOS_FLAVOURS: { key: keyof HoSDayOrder; label: string; icon: string }[] = [
  { key: 'plain',                 label: 'Plain',                  icon: '○' },
  { key: 'classicCreamCheese',    label: 'Classic Cream Cheese',   icon: '◎' },
  { key: 'saltedCaramelAndPecan', label: 'Salted Caramel & Pecan', icon: '◉' },
  { key: 'lotusBiscoff',          label: 'Lotus Biscoff',          icon: '◈' },
];

const PF_FLAVOURS: { key: keyof PFOrderData; label: string; icon: string }[] = [
  { key: 'almondChocChip',    label: 'Almond Choc Chip',    icon: '○' },
  { key: 'raspberryCoconut',  label: 'Raspberry Coconut',   icon: '◎' },
  { key: 'crunchyBrownie',    label: 'Crunchy Brownie',     icon: '◉' },
  { key: 'saltedCaramel',     label: 'Salted Caramel',      icon: '◈' },
  { key: 'lemonCoconut',      label: 'Lemon Coconut',       icon: '◇' },
];

const TCR_PRODUCTS: { key: keyof TCROrderData; label: string; icon: string }[] = [
  { key: 'bs1Espresso',     label: 'BS1 Espresso',                  icon: '◉' },
  { key: 'cruiseControl',   label: 'Cruise Control (Brazil Classico)', icon: '◎' },
  { key: 'jumpstart',       label: 'Jumpstart',                     icon: '○' },
  { key: 'mixtape',         label: 'Mixtape',                       icon: '◈' },
  { key: 'shopFilter',      label: 'Shop Filter',                   icon: '◇' },
  { key: 'ethiopiaDanche',  label: 'Ethiopia Danche',               icon: '◉' },
  { key: 'rwandaRwamatamu', label: 'Rwanda Rwamatamu',              icon: '◎' },
];

const SUPPLIER_LABEL: Record<Supplier, string> = {
  'house-of-sin':    'House of Sin',
  'purpose-foods':   'Purpose Foods',
  'triple-co-roast': 'Triple Co Roast',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric',  hour: '2-digit', minute: '2-digit',
  });
}

function hosTotal(order: HoSOrderData): number {
  return HOS_DAYS.reduce((sum, { key }) => {
    const day = order[key] ?? {} as HoSDayOrder;
    return sum + HOS_FLAVOURS.reduce((s, { key: fk }) => s + (day[fk] ?? 0), 0);
  }, 0);
}

function pfTotal(order: PFOrderData): number {
  return PF_FLAVOURS.reduce((s, { key }) => s + (order[key] ?? 0), 0);
}

function tcrTotal(order: TCROrderData): number {
  return TCR_PRODUCTS.reduce((s, { key }) => s + (order[key] ?? 0), 0);
}

function deepCopyHoS(o: HoSOrderData): HoSOrderData {
  return { tuesday: { ...o.tuesday }, thursday: { ...o.thursday }, saturday: { ...o.saturday } };
}

function buildHoSRawInputs(order: HoSOrderData): Record<string, string> {
  const r: Record<string, string> = {};
  for (const { key: day } of HOS_DAYS) {
    for (const { key: fk } of HOS_FLAVOURS) {
      r[`${day}.${fk}`] = String(order[day][fk] ?? 0);
    }
  }
  return r;
}

function buildPFRawInputs(order: PFOrderData): Record<string, string> {
  const r: Record<string, string> = {};
  for (const { key } of PF_FLAVOURS) {
    r[key] = String(order[key] ?? 0);
  }
  return r;
}

function buildTCRRawInputs(order: TCROrderData): Record<string, string> {
  const r: Record<string, string> = {};
  for (const { key } of TCR_PRODUCTS) {
    r[key] = String(order[key] ?? 0);
  }
  return r;
}

// ── Style constants ───────────────────────────────────────────────────────────

const cg: React.CSSProperties  = { fontFamily: "'Cormorant Garamond', serif" };
const dm: React.CSSProperties  = { fontFamily: "'DM Sans', sans-serif" };
const lbl: React.CSSProperties = { ...dm, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89070' };

// ── Per-order state ───────────────────────────────────────────────────────────

type OrderState = {
  edited: HoSOrderData | PFOrderData | TCROrderData;
  original: HoSOrderData | PFOrderData | TCROrderData;
  rawInputs: Record<string, string>;
  submitting: boolean;
  result: 'approved' | 'rejected' | null;
  error: string;
};

function initOrderState(order: PendingOrder): OrderState {
  const copy =
    order.supplier === 'triple-co-roast' ? { ...(order.order as TCROrderData) } :
    order.supplier === 'purpose-foods'   ? { ...(order.order as PFOrderData) }  :
    deepCopyHoS(order.order as HoSOrderData);
  const orig =
    order.supplier === 'triple-co-roast' ? { ...(order.order as TCROrderData) } :
    order.supplier === 'purpose-foods'   ? { ...(order.order as PFOrderData) }  :
    deepCopyHoS(order.order as HoSOrderData);
  const rawInputs =
    order.supplier === 'triple-co-roast' ? buildTCRRawInputs(order.order as TCROrderData) :
    order.supplier === 'purpose-foods'   ? buildPFRawInputs(order.order as PFOrderData)   :
    buildHoSRawInputs(order.order as HoSOrderData);
  return { edited: copy, original: orig, rawInputs, submitting: false, result: null, error: '' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FontLink() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
    />
  );
}

// ── HoS order card ────────────────────────────────────────────────────────────

function HoSCard({
  order, state,
  onChange, onBlur, onSubmit,
}: {
  order: PendingOrder;
  state: OrderState;
  onChange: (day: keyof HoSOrderData, flavour: keyof HoSDayOrder, value: string) => void;
  onBlur: (day: keyof HoSOrderData, flavour: keyof HoSDayOrder) => void;
  onSubmit: (action: 'approved' | 'rejected') => void;
}) {
  const edited   = state.edited as HoSOrderData;
  const original = state.original as HoSOrderData;
  const total    = hosTotal(edited);

  const hasEdits = HOS_DAYS.some(({ key }) =>
    HOS_FLAVOURS.some(({ key: fk }) => edited[key][fk] !== original[key][fk])
  );

  return (
    <div className="bg-white rounded-2xl border border-[#EDE3D5] overflow-hidden">
      {/* Card header */}
      <div className="px-7 py-6 border-b border-[#EDE3D5] flex flex-wrap gap-x-10 gap-y-4 items-start justify-between bg-[#FDFAF5]">
        <div>
          <p style={lbl} className="mb-1.5">Supplier</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#2C1A0E]">
            House of Sin
            <span style={{ ...dm, fontSize: 11, fontWeight: 400 }} className="ml-2 text-[#C8935A]">
              Cinnamon Buns
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
          <p style={lbl} className="mb-1.5">Total buns</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#B8621A]">{total}</p>
        </div>
      </div>

      {/* Day grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#EDE3D5]">
        {HOS_DAYS.map(({ key, label }) => {
          const day  = edited[key];
          const orig = original[key];
          const daySum = HOS_FLAVOURS.reduce((s, { key: fk }) => s + (day[fk] ?? 0), 0);
          return (
            <div key={key}>
              <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#EDE3D5] flex justify-between items-baseline">
                <span style={{ ...cg, fontSize: 17, fontWeight: 600 }} className="text-[#2C1A0E]">{label}</span>
                <span style={{ ...dm, fontSize: 11 }} className="text-[#A89070]">{daySum} buns</span>
              </div>
              {HOS_FLAVOURS.map(({ key: fk, label: fl, icon }) => {
                const numVal  = day[fk] ?? 0;
                const orgVal  = orig[fk] ?? 0;
                const changed = numVal !== orgVal;
                const rawKey  = `${key}.${fk}`;
                const inputVal = state.rawInputs[rawKey] ?? String(numVal);
                return (
                  <div key={fk} className={`flex items-center justify-between px-6 py-4 border-b border-[#F2EBE0] last:border-0 ${changed ? 'bg-[#FFFCF5]' : ''}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[#C8935A] text-xs select-none">{icon}</span>
                      <span style={{ ...dm, fontSize: 13 }} className="text-[#3D2B1A] truncate">{fl}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {changed && (
                        <span style={{ ...dm, fontSize: 11 }} className="text-[#C8935A] line-through tabular-nums">{orgVal}</span>
                      )}
                      <input
                        type="number" min={0}
                        value={inputVal}
                        onChange={e => onChange(key, fk, e.target.value)}
                        onBlur={() => onBlur(key, fk)}
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

      <OrderFooter state={state} hasEdits={hasEdits} onSubmit={onSubmit} />
    </div>
  );
}

// ── PF order card ─────────────────────────────────────────────────────────────

function PFCard({
  order, state,
  onChange, onBlur, onSubmit,
}: {
  order: PendingOrder;
  state: OrderState;
  onChange: (flavour: keyof PFOrderData, value: string) => void;
  onBlur: (flavour: keyof PFOrderData) => void;
  onSubmit: (action: 'approved' | 'rejected') => void;
}) {
  const edited   = state.edited as PFOrderData;
  const original = state.original as PFOrderData;
  const total    = pfTotal(edited);

  const hasEdits = PF_FLAVOURS.some(({ key }) => edited[key] !== original[key]);

  return (
    <div className="bg-white rounded-2xl border border-[#EDE3D5] overflow-hidden">
      {/* Card header */}
      <div className="px-7 py-6 border-b border-[#EDE3D5] flex flex-wrap gap-x-10 gap-y-4 items-start justify-between bg-[#FDFAF5]">
        <div>
          <p style={lbl} className="mb-1.5">Supplier</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#2C1A0E]">
            Purpose Foods
            <span style={{ ...dm, fontSize: 11, fontWeight: 400 }} className="ml-2 text-[#C8935A]">
              Protein Balls
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
          <p style={lbl} className="mb-1.5">Total units</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#B8621A]">{total}</p>
        </div>
      </div>

      {/* Flat flavour table */}
      <div className="max-w-md mx-auto px-6 py-5">
        <div className="rounded-xl border border-[#EDE3D5] overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#EDE3D5] flex justify-between">
            <span style={{ ...lbl }}>Flavour</span>
            <span style={{ ...lbl }}>Qty</span>
          </div>
          {PF_FLAVOURS.map(({ key, label, icon }) => {
            const numVal  = edited[key] ?? 0;
            const orgVal  = original[key] ?? 0;
            const changed = numVal !== orgVal;
            const inputVal = state.rawInputs[key] ?? String(numVal);
            return (
              <div key={key} className={`flex items-center justify-between px-5 py-4 border-b border-[#F2EBE0] last:border-0 ${changed ? 'bg-[#FFFCF5]' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[#C8935A] text-xs select-none">{icon}</span>
                  <span style={{ ...dm, fontSize: 13 }} className="text-[#3D2B1A]">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {changed && (
                    <span style={{ ...dm, fontSize: 11 }} className="text-[#C8935A] line-through tabular-nums">{orgVal}</span>
                  )}
                  <input
                    type="number" min={0}
                    value={inputVal}
                    onChange={e => onChange(key, e.target.value)}
                    onBlur={() => onBlur(key)}
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

      <OrderFooter state={state} hasEdits={hasEdits} onSubmit={onSubmit} />
    </div>
  );
}

// ── TCR order card ────────────────────────────────────────────────────────────

function TCRCard({
  order, state,
  onChange, onBlur, onSubmit,
}: {
  order: PendingOrder;
  state: OrderState;
  onChange: (product: keyof TCROrderData, value: string) => void;
  onBlur: (product: keyof TCROrderData) => void;
  onSubmit: (action: 'approved' | 'rejected') => void;
}) {
  const edited   = state.edited as TCROrderData;
  const original = state.original as TCROrderData;
  const total    = tcrTotal(edited);

  const hasEdits = TCR_PRODUCTS.some(({ key }) => edited[key] !== original[key]);

  return (
    <div className="bg-white rounded-2xl border border-[#EDE3D5] overflow-hidden">
      {/* Card header */}
      <div className="px-7 py-6 border-b border-[#EDE3D5] flex flex-wrap gap-x-10 gap-y-4 items-start justify-between bg-[#FDFAF5]">
        <div>
          <p style={lbl} className="mb-1.5">Supplier</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#2C1A0E]">
            Triple Co Roast
            <span style={{ ...dm, fontSize: 11, fontWeight: 400 }} className="ml-2 text-[#C8935A]">
              Coffee
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
          <p style={lbl} className="mb-1.5">Total bags</p>
          <p style={{ ...cg, fontSize: 22, fontWeight: 600 }} className="text-[#B8621A]">{total}</p>
        </div>
      </div>

      {/* Flat product table */}
      <div className="max-w-md mx-auto px-6 py-5">
        <div className="rounded-xl border border-[#EDE3D5] overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#EDE3D5] flex justify-between">
            <span style={{ ...lbl }}>Coffee (1kg bags)</span>
            <span style={{ ...lbl }}>Qty</span>
          </div>
          {TCR_PRODUCTS.map(({ key, label, icon }) => {
            const numVal  = edited[key] ?? 0;
            const orgVal  = original[key] ?? 0;
            const changed = numVal !== orgVal;
            const inputVal = state.rawInputs[key] ?? String(numVal);
            return (
              <div key={key} className={`flex items-center justify-between px-5 py-4 border-b border-[#F2EBE0] last:border-0 ${changed ? 'bg-[#FFFCF5]' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[#C8935A] text-xs select-none">{icon}</span>
                  <span style={{ ...dm, fontSize: 13 }} className="text-[#3D2B1A]">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {changed && (
                    <span style={{ ...dm, fontSize: 11 }} className="text-[#C8935A] line-through tabular-nums">{orgVal}</span>
                  )}
                  <input
                    type="number" min={0}
                    value={inputVal}
                    onChange={e => onChange(key, e.target.value)}
                    onBlur={() => onBlur(key)}
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [orders,  setOrders]  = useState<PendingOrder[]>([]);
  const [states,  setStates]  = useState<Record<Supplier, OrderState>>({} as Record<Supplier, OrderState>);
  const [notes,   setNotes]   = useState<Record<Supplier, string>>({} as Record<Supplier, string>);
  const [loaded,  setLoaded]  = useState(false);

  const lastSnapshotRef = useRef<string>('');

  const fetchOrders = useCallback(async () => {
    try {
      const res  = await fetch('/api/current-order');
      const data = await res.json();
      const incoming: PendingOrder[] = data.orders ?? [];
      const snapshot = JSON.stringify(incoming.map(o => o.receivedAt + o.supplier).sort());

      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setOrders(incoming);
        setStates(prev => {
          const next = { ...prev } as Record<Supplier, OrderState>;
          for (const o of incoming) {
            if (!prev[o.supplier] || prev[o.supplier].result) {
              next[o.supplier] = initOrderState(o);
            }
          }
          return next;
        });
        setNotes(prev => {
          const next = { ...prev } as Record<Supplier, string>;
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

  // ── HoS quantity update ────────────────────────────────────────────────────

  function updateHoSQty(supplier: Supplier, day: keyof HoSOrderData, flavour: keyof HoSDayOrder, value: string) {
    const num = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    const rawKey = `${day}.${flavour}`;
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      const edited = s.edited as HoSOrderData;
      return {
        ...prev,
        [supplier]: {
          ...s,
          edited: { ...edited, [day]: { ...edited[day], [flavour]: num } },
          rawInputs: { ...s.rawInputs, [rawKey]: value },
        },
      };
    });
  }

  function blurHoSQty(supplier: Supplier, day: keyof HoSOrderData, flavour: keyof HoSDayOrder) {
    const rawKey = `${day}.${flavour}`;
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      const cur = s.rawInputs[rawKey] ?? '';
      if (cur === '' || isNaN(Number(cur))) {
        return { ...prev, [supplier]: { ...s, rawInputs: { ...s.rawInputs, [rawKey]: '0' } } };
      }
      return prev;
    });
  }

  // ── PF quantity update ─────────────────────────────────────────────────────

  function updatePFQty(supplier: Supplier, flavour: keyof PFOrderData, value: string) {
    const num = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      return {
        ...prev,
        [supplier]: {
          ...s,
          edited: { ...(s.edited as PFOrderData), [flavour]: num },
          rawInputs: { ...s.rawInputs, [flavour]: value },
        },
      };
    });
  }

  function blurPFQty(supplier: Supplier, flavour: keyof PFOrderData) {
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      const cur = s.rawInputs[flavour] ?? '';
      if (cur === '' || isNaN(Number(cur))) {
        return { ...prev, [supplier]: { ...s, rawInputs: { ...s.rawInputs, [flavour]: '0' } } };
      }
      return prev;
    });
  }

  // ── TCR quantity update ────────────────────────────────────────────────────

  function updateTCRQty(supplier: Supplier, product: keyof TCROrderData, value: string) {
    const num = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      return {
        ...prev,
        [supplier]: {
          ...s,
          edited: { ...(s.edited as TCROrderData), [product]: num },
          rawInputs: { ...s.rawInputs, [product]: value },
        },
      };
    });
  }

  function blurTCRQty(supplier: Supplier, product: keyof TCROrderData) {
    setStates(prev => {
      const s = prev[supplier];
      if (!s) return prev;
      const cur = s.rawInputs[product] ?? '';
      if (cur === '' || isNaN(Number(cur))) {
        return { ...prev, [supplier]: { ...s, rawInputs: { ...s.rawInputs, [product]: '0' } } };
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
      const res  = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, supplier, order: s.edited, adjustmentNotes: notes[supplier] }),
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

  // ── Render ──────────────────────────────────────────────────────────────────

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
            {orders.length > 0 && (
              <span style={{ ...dm, fontSize: 11, letterSpacing: '0.08em' }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3E2] text-[#B8621A] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8621A] animate-pulse inline-block" />
                {orders.length} pending
              </span>
            )}
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
                      {orders.map(o => SUPPLIER_LABEL[o.supplier]).join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Order cards */}
              {orders.map(order => {
                const s = states[order.supplier];
                if (!s) return null;

                if (order.supplier === 'triple-co-roast') {
                  return (
                    <div key={order.supplier}>
                      <TCRCard
                        order={order}
                        state={s}
                        onChange={(product, value) => updateTCRQty(order.supplier, product, value)}
                        onBlur={product => blurTCRQty(order.supplier, product)}
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
                            placeholder="e.g. Increased BS1 Espresso — running low"
                            rows={2}
                            style={{ ...dm, fontSize: 13 }}
                            className="w-full border border-[#EDE3D5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8935A] resize-none placeholder-[#C8BBA8] bg-white text-[#2C1A0E] transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                if (order.supplier === 'purpose-foods') {
                  return (
                    <div key={order.supplier}>
                      <PFCard
                        order={order}
                        state={s}
                        onChange={(flavour, value) => updatePFQty(order.supplier, flavour, value)}
                        onBlur={flavour => blurPFQty(order.supplier, flavour)}
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
                            placeholder="e.g. Increased Almond Choc Chip — sold out last time"
                            rows={2}
                            style={{ ...dm, fontSize: 13 }}
                            className="w-full border border-[#EDE3D5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8935A] resize-none placeholder-[#C8BBA8] bg-white text-[#2C1A0E] transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={order.supplier}>
                    <HoSCard
                      order={order}
                      state={s}
                      onChange={(day, flavour, value) => updateHoSQty(order.supplier, day, flavour, value)}
                      onBlur={(day, flavour) => blurHoSQty(order.supplier, day, flavour)}
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
                          placeholder="e.g. Reduced Thursday plain by 5 — bank holiday next week"
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
