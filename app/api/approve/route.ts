import { NextRequest, NextResponse } from 'next/server';
import { getOrder, clearOrder } from '@/lib/orderStore';
import { generateHtmlEmail } from '@/lib/htmlEmail';
import type { OrderData } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, order, adjustmentNotes } = body as {
      action: 'approved' | 'rejected';
      order: OrderData;
      adjustmentNotes?: string;
    };

    const stored = getOrder();
    if (!stored) {
      return NextResponse.json({ success: false, error: 'No pending order found' }, { status: 404 });
    }

    const htmlEmail = generateHtmlEmail(order, stored.venue, stored.manager, adjustmentNotes);

    const payload = {
      action,
      htmlEmail,
      venue: stored.venue,
      manager: stored.manager,
      order,
      ...(adjustmentNotes ? { adjustmentNotes } : {}),
    };

    const callbackUrl = stored.callbackUrl || 'https://joshuavtanner.app.n8n.cloud/webhook/order-approved';
    const n8nRes = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!n8nRes.ok) {
      const text = await n8nRes.text();
      return NextResponse.json(
        { success: false, error: `n8n returned ${n8nRes.status}: ${text}` },
        { status: 502 }
      );
    }

    clearOrder();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('approve error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
