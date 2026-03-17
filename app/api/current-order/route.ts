import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const order = getOrder();
  return NextResponse.json({ order });
}
