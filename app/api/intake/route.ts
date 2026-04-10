import { NextRequest, NextResponse } from 'next/server';
import { saveOrder } from '@/lib/orderStore';
import type { Supplier, OrderItem } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

// Supplier metadata defaults (used when WF1 doesn't send them yet — backward compat)
const SUPPLIER_META: Record<Supplier, { label: string; category: string; orderType: 'email' | 'portal' }> = {
  'house-of-sin':    { label: 'House of Sin',    category: 'Cinnamon Buns',            orderType: 'email' },
  'purpose-foods':   { label: 'Purpose Foods',   category: 'Protein Balls',            orderType: 'email' },
  'triple-co-roast': { label: 'Triple Co Roast', category: 'Coffee',                   orderType: 'portal' },
  'cups-direct':     { label: 'Cups Direct',     category: 'Disposable Packaging',     orderType: 'portal' },
  'cakehead':        { label: 'Cakehead',        category: 'Bakes',                    orderType: 'portal' },
  'amazon-uk':       { label: 'Amazon UK',       category: 'Miscellaneous',            orderType: 'portal' },
  'carrier-bag-shop':{ label: 'Carrier Bag Shop', category: 'Paper Bags',              orderType: 'portal' },
  'nisbets':         { label: 'Nisbets',         category: 'Catering Supplies',        orderType: 'portal' },
  'booker':          { label: 'Booker',          category: 'Fresh Ingredients & Sundries', orderType: 'portal' },
  'stores-supply':   { label: 'Stores Supply',   category: 'Milk & Bottled Drinks',         orderType: 'portal' },
  'ambican':         { label: 'Ambican',         category: 'Disposable Packaging',           orderType: 'portal' },
  'the-estate-dairy':{ label: 'The Estate Dairy', category: 'Milk (Emergency Cover)',        orderType: 'portal' },
  'debaere':         { label: 'Debaere',         category: 'Pastries',                       orderType: 'portal' },
};

function toNum(v: unknown): number {
  return Math.max(0, Number(v) || 0);
}

function identifySupplier(callbackUrl: string): Supplier {
  if (callbackUrl.includes('order-approved-tcr'))             return 'triple-co-roast';
  if (callbackUrl.includes('order-approved-pf'))              return 'purpose-foods';
  if (callbackUrl.includes('order-approved-cups'))            return 'cups-direct';
  if (callbackUrl.includes('order-approved-cakehead'))        return 'cakehead';
  if (callbackUrl.includes('order-approved-amazon'))          return 'amazon-uk';
  if (callbackUrl.includes('order-approved-carrier-bag-shop'))return 'carrier-bag-shop';
  if (callbackUrl.includes('order-approved-nisbets'))         return 'nisbets';
  if (callbackUrl.includes('order-approved-booker'))          return 'booker';
  if (callbackUrl.includes('order-approved-stores-supply'))    return 'stores-supply';
  if (callbackUrl.includes('order-approved-ambican'))          return 'ambican';
  if (callbackUrl.includes('order-approved-estate-dairy'))     return 'the-estate-dairy';
  if (callbackUrl.includes('order-approved-debaere'))          return 'debaere';
  return 'house-of-sin';
}

// Convert legacy HoS order format to OrderItem[]
function legacyHoSToItems(raw: Record<string, unknown>): OrderItem[] {
  const items: OrderItem[] = [];
  const flavourLabels: Record<string, string> = {
    plain: 'Plain', classicCreamCheese: 'Classic Cream Cheese',
    saltedCaramelAndPecan: 'Salted Caramel & Pecan', lotusBiscoff: 'Lotus Biscoff',
  };
  for (const day of ['tuesday', 'thursday', 'saturday']) {
    const dayData = (raw[day] ?? {}) as Record<string, unknown>;
    for (const [key, label] of Object.entries(flavourLabels)) {
      const qty = toNum(dayData[key]);
      if (qty > 0) items.push({ name: label, quantity: qty, group: day.charAt(0).toUpperCase() + day.slice(1) });
    }
  }
  return items;
}

// Convert legacy PF order format to OrderItem[]
function legacyPFToItems(raw: Record<string, unknown>): OrderItem[] {
  const labels: Record<string, string> = {
    almondChocChip: 'Almond Choc Chip', raspberryCoconut: 'Raspberry Coconut',
    crunchyBrownie: 'Crunchy Brownie', saltedCaramel: 'Salted Caramel', lemonCoconut: 'Lemon Coconut',
  };
  return Object.entries(labels).map(([key, label]) => ({ name: label, quantity: toNum(raw[key]) })).filter(i => i.quantity > 0);
}

// Convert legacy TCR order format to OrderItem[]
function legacyTCRToItems(raw: Record<string, unknown>): OrderItem[] {
  const outer = (raw.tripleCo && typeof raw.tripleCo === 'object' ? raw.tripleCo : raw) as Record<string, unknown>;
  const labels: Record<string, string> = {
    bs1Espresso: 'BS1 Espresso', cruiseControl: 'Cruise Control', jumpstart: 'Jumpstart',
    mixtape: 'Mixtape', shopFilter: 'Shop Filter', ethiopiaDanche: 'Ethiopia Danche', rwandaRwamatamu: 'Rwanda Rwamatamu',
  };
  return Object.entries(labels).map(([key, label]) => ({ name: label, quantity: toNum(outer[key]), unit: '1kg bags' })).filter(i => i.quantity > 0);
}

// Convert legacy generic Record<string, number> to OrderItem[]
function legacyGenericToItems(raw: Record<string, unknown>): OrderItem[] {
  return Object.entries(raw).map(([name, qty]) => ({ name, quantity: toNum(qty) })).filter(i => i.quantity > 0);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const callbackUrl: string =
      body.callbackUrl ?? 'https://joshuavtanner.app.n8n.cloud/webhook/order-approved';

    const supplier: Supplier = body.supplier ?? identifySupplier(callbackUrl);
    const meta = SUPPLIER_META[supplier];

    // Determine items: new format sends `items` array (or JSON string), old format sends `order` object
    let items: OrderItem[];
    const parsedItems = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;
    if (Array.isArray(parsedItems)) {
      items = parsedItems;
    } else {
      // Legacy format — convert to OrderItem[]
      const rawOrder = typeof body.order === 'string' ? JSON.parse(body.order) : (body.order ?? {});
      if (supplier === 'house-of-sin') {
        items = legacyHoSToItems(rawOrder);
      } else if (supplier === 'purpose-foods') {
        items = legacyPFToItems(rawOrder);
      } else if (supplier === 'triple-co-roast') {
        items = legacyTCRToItems(rawOrder);
      } else {
        items = legacyGenericToItems(rawOrder);
      }
    }

    await saveOrder({
      supplier,
      supplierLabel: body.supplierLabel ?? meta.label,
      category:      body.category ?? meta.category,
      orderType:     body.orderType ?? meta.orderType,
      venue:         body.venue ?? 'Dear Coco',
      manager:       body.manager ?? '',
      items,
      htmlEmail:     body.htmlEmail,
      callbackUrl,
      receivedAt:    new Date().toISOString(),
      status:        'pending',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('intake error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 400 });
  }
}
