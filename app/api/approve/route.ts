import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, clearOrder } from '@/lib/orderStore';
import { generateHoSEmail, generatePFEmail, generateTCREmail } from '@/lib/htmlEmail';
import type { Supplier, HoSOrderData, PFOrderData, TCROrderData } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, supplier, order, adjustmentNotes } = body as {
      action: 'approved' | 'rejected';
      supplier: Supplier;
      order: HoSOrderData | PFOrderData;
      adjustmentNotes?: string;
    };

    const stored = getAllOrders().find(o => o.supplier === supplier);
    if (!stored) {
      return NextResponse.json({ success: false, error: 'No pending order found for supplier' }, { status: 404 });
    }

    const htmlEmail =
      supplier === 'triple-co-roast' ? generateTCREmail(order as unknown as TCROrderData, stored.venue, stored.manager, adjustmentNotes) :
      supplier === 'purpose-foods'   ? generatePFEmail(order as unknown as PFOrderData, stored.venue, stored.manager, adjustmentNotes)   :
      generateHoSEmail(order as unknown as HoSOrderData, stored.venue, stored.manager, adjustmentNotes);

    const n8nRes = await fetch(stored.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        htmlEmail,
        venue:   stored.venue,
        manager: stored.manager,
        order,
        ...(adjustmentNotes ? { adjustmentNotes } : {}),
      }),
    });

    if (!n8nRes.ok) {
      const text = await n8nRes.text();
      return NextResponse.json(
        { success: false, error: `n8n returned ${n8nRes.status}: ${text}` },
        { status: 502 }
      );
    }

    clearOrder(supplier);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('approve error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
