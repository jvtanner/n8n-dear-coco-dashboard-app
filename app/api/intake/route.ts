import { NextRequest, NextResponse } from 'next/server';
import { saveOrder } from '@/lib/orderStore';
import type { OrderData } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawOrder = typeof body.order === 'string' ? JSON.parse(body.order) : body.order;
    const order = rawOrder as OrderData;

    saveOrder({
      venue: body.venue ?? 'Dear Coco',
      manager: body.manager ?? '',
      order,
      callbackUrl: body.callbackUrl ?? 'https://joshuavtanner.app.n8n.cloud/webhook/order-approved',
      receivedAt: new Date().toISOString(),
      status: 'pending',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('intake error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 400 });
  }
}
