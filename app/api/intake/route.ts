import { NextRequest, NextResponse } from 'next/server';
import { saveOrder } from '@/lib/orderStore';
import type { Supplier, HoSOrderData, HoSDayOrder, PFOrderData, TCROrderData, GenericOrderData } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

function toNum(v: unknown): number {
  return Math.max(0, Number(v) || 0);
}

function normalizeHoSDay(d: unknown): HoSDayOrder {
  const s = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
  return {
    plain:                 toNum(s.plain),
    classicCreamCheese:    toNum(s.classicCreamCheese),
    saltedCaramelAndPecan: toNum(s.saltedCaramelAndPecan),
    lotusBiscoff:          toNum(s.lotusBiscoff),
  };
}

function normalizeHoS(raw: unknown): HoSOrderData {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    tuesday:  normalizeHoSDay(s.tuesday),
    thursday: normalizeHoSDay(s.thursday),
    saturday: normalizeHoSDay(s.saturday),
  };
}

function normalizePF(raw: unknown): PFOrderData {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    almondChocChip:   toNum(s.almondChocChip),
    raspberryCoconut: toNum(s.raspberryCoconut),
    crunchyBrownie:   toNum(s.crunchyBrownie),
    saltedCaramel:    toNum(s.saltedCaramel),
    lemonCoconut:     toNum(s.lemonCoconut),
  };
}

function normalizeTCR(raw: unknown): TCROrderData {
  // WF1 may wrap the order under a `tripleCo` key
  const outer = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const s = (outer.tripleCo && typeof outer.tripleCo === 'object' ? outer.tripleCo : outer) as Record<string, unknown>;
  return {
    bs1Espresso:     toNum(s.bs1Espresso),
    cruiseControl:   toNum(s.cruiseControl),
    jumpstart:       toNum(s.jumpstart),
    mixtape:         toNum(s.mixtape),
    shopFilter:      toNum(s.shopFilter),
    ethiopiaDanche:  toNum(s.ethiopiaDanche),
    rwandaRwamatamu: toNum(s.rwandaRwamatamu),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const callbackUrl: string =
      body.callbackUrl ?? 'https://joshuavtanner.app.n8n.cloud/webhook/order-approved';

    const supplier: Supplier =
      callbackUrl.includes('order-approved-tcr')      ? 'triple-co-roast' :
      callbackUrl.includes('order-approved-pf')       ? 'purpose-foods'   :
      callbackUrl.includes('order-approved-cups')     ? 'cups-direct'     :
      callbackUrl.includes('order-approved-cakehead') ? 'cakehead'        :
      callbackUrl.includes('order-approved-amazon')   ? 'amazon-uk'       :
      'house-of-sin';

    const rawOrder = typeof body.order === 'string' ? JSON.parse(body.order) : body.order;
    const isGeneric = supplier === 'cups-direct' || supplier === 'cakehead' || supplier === 'amazon-uk';
    const order =
      supplier === 'triple-co-roast' ? normalizeTCR(rawOrder) :
      supplier === 'purpose-foods'   ? normalizePF(rawOrder)  :
      isGeneric                      ? ((rawOrder ?? {}) as GenericOrderData) :
      normalizeHoS(rawOrder);

    saveOrder({
      supplier,
      venue:       body.venue     ?? 'Dear Coco',
      manager:     body.manager   ?? '',
      order,
      htmlEmail:   body.htmlEmail,
      callbackUrl,
      receivedAt:  new Date().toISOString(),
      status:      'pending',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('intake error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 400 });
  }
}
