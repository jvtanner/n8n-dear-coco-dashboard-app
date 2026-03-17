import { NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const orders = getAllOrders();
  return NextResponse.json({ orders });
}
