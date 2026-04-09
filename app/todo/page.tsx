'use client';

import { useState, useEffect } from 'react';

// ── Style constants (matching main dashboard) ──

const cg: React.CSSProperties = { fontFamily: "'Cormorant Garamond', serif" };
const dm: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const lbl: React.CSSProperties = { ...dm, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#A89070' };

type Task = {
  id: string;
  title: string;
  detail: string;
  tags: { label: string; type: 'owner' | 'dev' | 'supplier' }[];
};

type Phase = {
  num: number;
  title: string;
  desc: string;
  color: string;
  tasks: Task[];
  note?: string;
};

const PHASES: Phase[] = [
  {
    num: 1,
    title: 'Go-Live Readiness',
    desc: 'Place a real order through key suppliers to verify the full pipeline works end-to-end. Owner tells dev what to order; dev sends it through the system.',
    color: '#1a7a5c',
    note: 'After these tests, the build team will scrape the full product catalogs for Triple Co Roast and Cake Head so every product is mapped, and add error handling so you get an email if automation ever fails.',
    tasks: [
      { id: 'p1-emails', title: 'Confirm supplier email addresses', detail: 'All order emails currently go to Joshua\'s inbox. Provide the correct email addresses for House of Cinn and Purpose Foods so orders go directly to the supplier.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'House of Cinn', type: 'supplier' }, { label: 'Purpose Foods', type: 'supplier' }] },
      { id: 'p1-tcr', title: 'Test order: Triple Co Roast', detail: 'The automation logs in, adds items to basket, and checks out on the Orderspace portal. Owner decides what to order (min £80), dev sends it through the dashboard and approves. Confirm the order appears in the TCR portal.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'DEV', type: 'dev' }, { label: 'Triple Co Roast', type: 'supplier' }] },
      { id: 'p1-ch', title: 'Test order: Cake Head', detail: 'Automation logs in, adds items to cart, and pays with saved Stripe card. Owner decides what to order (min £75), dev sends it through. Note: this will charge the saved card (£6.50 delivery).', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'DEV', type: 'dev' }, { label: 'Cake Head', type: 'supplier' }] },
      { id: 'p1-cd', title: 'Test order: Cups Direct', detail: 'Automation creates a Shopify cart and emails a checkout link. Owner decides what to order, dev sends it through. Verify the checkout link arrives with the right items. Payment completed manually via the link.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'DEV', type: 'dev' }, { label: 'Cups Direct', type: 'supplier' }] },
      { id: 'p1-hos', title: 'Test order: House of Cinn', detail: 'Automation sends the order email directly to the supplier. Owner decides what to order, dev sends it through and approves. Confirm the email arrives at the supplier\'s inbox with the correct items and delivery day groupings.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'DEV', type: 'dev' }, { label: 'House of Cinn', type: 'supplier' }] },
      { id: 'p1-pf', title: 'Test order: Purpose Foods', detail: 'Same as House of Cinn — email goes directly to the supplier. Owner decides what to order, dev sends and approves. Confirm email arrives correctly.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'DEV', type: 'dev' }, { label: 'Purpose Foods', type: 'supplier' }] },
    ],
  },
  {
    num: 2,
    title: 'Finish Rekki Integration',
    desc: 'Covers 3 suppliers at once: Stores Supply, Ambican, The Estate Dairy. API fully captured and automation built on 9 Apr 2026.',
    color: '#1a7a5c',
    tasks: [
      { id: 'p2-proxy', title: 'Place one real order on the Rekki app with the proxy running', detail: 'The mitmproxy session captured everything except the final "submit order" endpoint. Open the Rekki app on your phone with the proxy active (same setup as last time), place a small real order to any of the 3 Rekki suppliers, and let it capture the network traffic. This gives us the last missing piece to fully automate all 3 suppliers.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'Stores Supply', type: 'supplier' }, { label: 'Ambican', type: 'supplier' }, { label: 'The Estate Dairy', type: 'supplier' }] },
      { id: 'p2-build', title: 'Build and deploy Rekki ordering automation', detail: 'Once the submission endpoint is captured, the build team will create the Code nodes and replace the email fallback in all 3 workflows. This upgrades Stores Supply, Ambican, and The Estate Dairy from email reminders to fully automated orders.', tags: [{ label: 'DEV', type: 'dev' }, { label: 'Stores Supply', type: 'supplier' }, { label: 'Ambican', type: 'supplier' }, { label: 'The Estate Dairy', type: 'supplier' }] },
      { id: 'p2-test', title: 'Test order: Rekki suppliers', detail: 'Automation fetches the Rekki product catalog, fuzzy-matches item names, validates the order intent, and submits via the Rekki API. Test with each supplier: Stores Supply, Ambican, and The Estate Dairy. Owner decides what to order, dev sends it through the dashboard and approves. Confirm the order appears in the Rekki app.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'DEV', type: 'dev' }, { label: 'Stores Supply', type: 'supplier' }, { label: 'Ambican', type: 'supplier' }, { label: 'The Estate Dairy', type: 'supplier' }] },
    ],
  },
  {
    num: 3,
    title: 'Reverse-Engineer Debaere App',
    desc: 'Same approach as Rekki. Covers daily pastry orders. API captured and automation built on 5 Apr 2026.',
    color: '#1a7a5c',
    tasks: [
      { id: 'p3-proxy', title: 'Run the proxy on the Debaere app and place an order', detail: 'Set up mitmproxy on your phone (same as the Rekki session), open the Debaere app, browse the catalog, and place a real order. This captures the full API — login, product catalog, and order submission. Credentials: thegessner@dearcoco.com.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'Debaere', type: 'supplier' }] },
      { id: 'p3-build', title: 'Build and deploy Debaere ordering automation', detail: 'Once the API is captured, the build team documents it and creates the Code node for WF14. Upgrades Debaere from email reminder to fully automated daily pastry orders.', tags: [{ label: 'DEV', type: 'dev' }, { label: 'Debaere', type: 'supplier' }] },
      { id: 'p3-test', title: 'Test order: Debaere', detail: 'Automation logs in to the Debaere API, fetches the full product catalog, fuzzy-matches item names, validates the delivery date, and submits the order. Owner decides what to order (min £25), dev sends it through the dashboard and approves. Confirm the order appears in the Debaere app.', tags: [{ label: 'OWNER', type: 'owner' }, { label: 'DEV', type: 'dev' }, { label: 'Debaere', type: 'supplier' }] },
    ],
  },
  {
    num: 4,
    title: 'RentAHuman for Uncrackable Suppliers',
    desc: 'Amazon, Nisbets, Carrier Bag Shop, and Booker have bot protection that blocks automation. Instead of giving up, we post a bounty for a human to place the order.',
    color: '#2563a8',
    note: 'Cost estimate: ~$5–15 per bounty. Most of these suppliers are monthly or ad-hoc orders, so annual cost is low. Booker is weekly — consider emailing them first to ask if they accept emailed orders (free alternative).',
    tasks: [
      { id: 'p4-rah', title: 'Create a RentAHuman.ai account and get an API key', detail: 'Sign up at rentahuman.ai. Free to register. Get an API key from the dashboard. This lets the system post bounties automatically when orders are approved.', tags: [{ label: 'DEV', type: 'dev' }] },
      { id: 'p4-card', title: 'Create a prepaid virtual card for order payments', detail: 'Set up a virtual debit card on Revolut, Wise, or Monzo dedicated to supplier ordering. Load a small amount (£50–100). This card gets included in bounty instructions so the human can pay at checkout. Maximum risk = card balance. Can be frozen instantly.', tags: [{ label: 'OWNER', type: 'owner' }] },
      { id: 'p4-build', title: 'Build and deploy RentAHuman bounty automation', detail: 'The build team creates the bounty flow: on approval, post a task to RentAHuman with order details and card info, poll for completion, release payment, and email the owner a confirmation. Deploys to Amazon, Carrier Bag Shop, Nisbets, and Booker.', tags: [{ label: 'DEV', type: 'dev' }, { label: 'Amazon', type: 'supplier' }, { label: 'Nisbets', type: 'supplier' }, { label: 'Carrier Bag Shop', type: 'supplier' }, { label: 'Booker', type: 'supplier' }] },
    ],
  },
];

const tagColors: Record<string, { bg: string; fg: string }> = {
  owner: { bg: '#fef3e2', fg: '#b45309' },
  dev: { bg: '#e8f0fa', fg: '#2563a8' },
  supplier: { bg: '#f3f0ec', fg: '#6b5f52' },
};

function FontLink() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
    />
  );
}

export default function TodoPage() {
  const defaultDone: Record<string, boolean> = { 'p2-proxy': true, 'p2-build': true, 'p3-proxy': true, 'p3-build': true };
  const [done, setDone] = useState<Record<string, boolean>>(defaultDone);

  useEffect(() => {
    const saved = localStorage.getItem('dc-todo-done');
    if (saved) setDone({ ...defaultDone, ...JSON.parse(saved) });
  }, []);

  const toggle = (id: string) => {
    setDone(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('dc-todo-done', JSON.stringify(next));
      return next;
    });
  };

  const totalTasks = PHASES.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = Object.values(done).filter(Boolean).length;

  return (
    <>
      <FontLink />
      <div style={{ minHeight: '100vh', background: '#FAF7F0', ...dm }}>
        {/* Header */}
        <header style={{ maxWidth: 800, margin: '0 auto', padding: '48px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0EAE0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                🥐
              </div>
              <div>
                <div style={{ ...cg, fontSize: 22, fontWeight: 700, color: '#2C1A0E' }}>Dear Coco</div>
                <div style={{ ...lbl, marginTop: -2 }}>AUTOMATION CHECKLIST</div>
              </div>
            </div>
            <a href="/" style={{ ...dm, fontSize: 13, color: '#A89070', textDecoration: 'none', padding: '6px 14px', border: '1px solid #E0D8CC', borderRadius: 8 }}>
              ← Dashboard
            </a>
          </div>

          <h1 style={{ ...cg, fontSize: 42, fontWeight: 400, color: '#2C1A0E', lineHeight: 1.1, marginBottom: 12 }}>
            What's Left <span style={{ fontStyle: 'italic', color: '#1a7a5c' }}>To Do</span>
          </h1>
          <p style={{ ...dm, fontSize: 16, fontWeight: 300, color: '#6b5f52', lineHeight: 1.7, maxWidth: 600, marginBottom: 40 }}>
            Items marked <strong style={{ color: '#b45309', fontWeight: 500 }}>OWNER</strong> need your input. Items marked <strong style={{ color: '#2563a8', fontWeight: 500 }}>DEV</strong> are handled by the build team. Items with both tags are collaborative.
          </p>

          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#E0D8CC', border: '1px solid #E0D8CC', borderRadius: 12, overflow: 'hidden', marginBottom: 48 }}>
            {[
              { num: `${doneTasks}/${totalTasks}`, label: 'Completed', color: '#1a7a5c' },
              { num: '9', label: 'Fully Automated', color: '#1a7a5c' },
              { num: '13', label: 'Suppliers Connected', color: '#2563a8' },
              { num: '14', label: 'Workflows Active', color: '#1a7a5c' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ ...cg, fontSize: 32, lineHeight: 1, color: s.color }}>{s.num}</div>
                <div style={{ ...dm, fontSize: 12, color: '#9e9285', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Phases */}
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px 80px' }}>
          {PHASES.map(phase => (
            <section key={phase.num} style={{ marginBottom: 48 }}>
              {/* Phase header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{
                  ...dm, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const, padding: '4px 12px', borderRadius: 6,
                  background: phase.color + '18', color: phase.color,
                }}>
                  PHASE {phase.num}
                </span>
                <span style={{ ...cg, fontSize: 26, color: '#2C1A0E' }}>{phase.title}</span>
              </div>
              <p style={{ ...dm, fontSize: 14, color: '#6b5f52', fontWeight: 300, marginBottom: 20 }}>{phase.desc}</p>

              {/* Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {phase.tasks.map(task => {
                  const isDone = done[task.id] || false;
                  return (
                    <div key={task.id} style={{
                      display: 'flex', gap: 14, padding: '16px 18px',
                      background: '#fff', border: '1px solid #E0D8CC', borderRadius: 10,
                      opacity: isDone ? 0.5 : 1, transition: 'opacity 0.2s',
                    }}>
                      <div
                        onClick={() => toggle(task.id)}
                        style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                          border: `2px solid ${isDone ? '#1a7a5c' : '#E0D8CC'}`,
                          background: isDone ? '#1a7a5c' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isDone && (
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5L4.5 8.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          ...dm, fontWeight: 500, fontSize: 15, color: '#2C1A0E',
                          textDecoration: isDone ? 'line-through' : 'none',
                        }}>
                          {task.title}
                        </div>
                        <div style={{ ...dm, fontSize: 13, color: '#6b5f52', lineHeight: 1.5, marginTop: 2 }}>
                          {task.detail}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {task.tags.map((tag, i) => (
                            <span key={i} style={{
                              ...dm, fontSize: 10, fontWeight: 500, letterSpacing: '0.05em',
                              padding: '2px 8px', borderRadius: 4,
                              background: tagColors[tag.type].bg, color: tagColors[tag.type].fg,
                            }}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {phase.note && (
                <div style={{
                  ...dm, padding: '16px 18px', background: '#fef9ee', border: '1px solid #f0e6cc',
                  borderRadius: 10, marginTop: 12, fontSize: 13, color: '#b45309', lineHeight: 1.6,
                }}>
                  <strong>Note:</strong> {phase.note}
                </div>
              )}
            </section>
          ))}

          {/* Final state table */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ ...dm, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '4px 12px', borderRadius: 6, background: '#fce8f118', color: '#b91c6e' }}>RESULT</span>
              <span style={{ ...cg, fontSize: 26, color: '#2C1A0E' }}>Final State</span>
            </div>
            <p style={{ ...dm, fontSize: 14, color: '#6b5f52', fontWeight: 300, marginBottom: 20 }}>After all phases are complete, every supplier is automated.</p>

            <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, ...dm }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E0D8CC' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', ...lbl }}>Supplier</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', ...lbl }}>Method</th>
                    <th style={{ textAlign: 'center', padding: '10px 16px', ...lbl }}>Human Effort</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Triple Co Roast', method: 'Portal API (Orderspace)', color: '#1a7a5c', effort: 'None' },
                    { name: 'Cake Head', method: 'Portal API (WooCommerce)', color: '#1a7a5c', effort: 'None' },
                    { name: 'Cups Direct', method: 'Shopify checkout link', color: '#2563a8', effort: '1 click' },
                    { name: 'House of Cinn', method: 'Email = order', color: '#0f766e', effort: 'None' },
                    { name: 'Purpose Foods', method: 'Email = order', color: '#0f766e', effort: 'None' },
                    { name: 'Stores Supply', method: 'Rekki API', color: '#1a7a5c', effort: 'None' },
                    { name: 'Ambican', method: 'Rekki API', color: '#1a7a5c', effort: 'None' },
                    { name: 'The Estate Dairy', method: 'Rekki API', color: '#1a7a5c', effort: 'None' },
                    { name: 'Debaere', method: 'Debaere app API', color: '#1a7a5c', effort: 'None' },
                    { name: 'Amazon UK', method: 'RentAHuman bounty', color: '#b91c6e', effort: 'None (outsourced)' },
                    { name: 'Nisbets', method: 'RentAHuman bounty', color: '#b91c6e', effort: 'None (outsourced)' },
                    { name: 'Carrier Bag Shop', method: 'RentAHuman bounty', color: '#b91c6e', effort: 'None (outsourced)' },
                    { name: 'Booker', method: 'RentAHuman bounty', color: '#b91c6e', effort: 'None (outsourced)' },
                  ].map((row, i, arr) => (
                    <tr key={i} style={{ borderBottom: i < arr.length - 1 ? '1px solid #E0D8CC' : 'none' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: '#2C1A0E' }}>{row.name}</td>
                      <td style={{ padding: '10px 16px', color: row.color }}>{row.method}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: '#6b5f52' }}>{row.effort}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: 24, padding: 24, background: '#e8f5ef', borderRadius: 12, textAlign: 'center',
            }}>
              <div style={{ ...cg, fontSize: 28, color: '#1a7a5c' }}>13/13 suppliers automated</div>
              <div style={{ ...dm, fontSize: 14, color: '#6b5f52', marginTop: 4 }}>Send one message, approve on the dashboard, everything else happens automatically.</div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '32px 0 48px', borderTop: '1px solid #E0D8CC' }}>
          <div style={{ ...dm, fontSize: 11, letterSpacing: '0.1em', color: '#9e9285' }}>
            DEAR COCO · SUPPLIER AUTOMATION · MARCH 2026
          </div>
        </footer>
      </div>
    </>
  );
}
