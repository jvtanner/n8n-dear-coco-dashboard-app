import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, clearOrder } from '@/lib/orderStore';
import { generateUniversalEmail } from '@/lib/htmlEmail';
import type { Supplier, OrderItem } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, supplier, items, adjustmentNotes } = body as {
      action: 'approved' | 'rejected';
      supplier: Supplier;
      items?: OrderItem[];
      adjustmentNotes?: string;
    };

    const stored = getAllOrders().find(o => o.supplier === supplier);
    if (!stored) {
      return NextResponse.json({ success: false, error: 'No pending order found for supplier' }, { status: 404 });
    }

    const orderItems = items ?? stored.items;

    const htmlEmail = generateUniversalEmail(
      orderItems,
      stored.supplierLabel,
      stored.orderType,
      stored.venue,
      stored.manager,
      stored.category,
      adjustmentNotes
    );

    const n8nRes = await fetch(stored.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        htmlEmail,
        venue: stored.venue,
        manager: stored.manager,
        items: orderItems,
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
