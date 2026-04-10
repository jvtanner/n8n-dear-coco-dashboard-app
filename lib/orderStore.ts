import { kv } from '@vercel/kv';

const KV_KEY = 'dear-coco-orders';

export type Supplier =
  | 'house-of-sin'
  | 'purpose-foods'
  | 'triple-co-roast'
  | 'cups-direct'
  | 'cakehead'
  | 'amazon-uk'
  | 'carrier-bag-shop'
  | 'nisbets'
  | 'booker'
  | 'stores-supply'
  | 'ambican'
  | 'the-estate-dairy'
  | 'debaere';

export type OrderItem = {
  name: string;
  quantity: number;
  group?: string;
  unit?: string;
  confidence?: number;
  matchedTo?: string;
};

export type PendingOrder = {
  supplier: Supplier;
  supplierLabel: string;
  category: string;
  orderType: 'email' | 'portal';
  venue: string;
  manager: string;
  items: OrderItem[];
  htmlEmail?: string;
  callbackUrl: string;
  receivedAt: string;
  status: 'pending';
};

// --- Legacy types for backward compatibility during migration ---
export type HoSDayOrder = {
  plain: number;
  classicCreamCheese: number;
  saltedCaramelAndPecan: number;
  lotusBiscoff: number;
};

export type HoSOrderData = {
  tuesday: HoSDayOrder;
  thursday: HoSDayOrder;
  saturday: HoSDayOrder;
};

export type PFOrderData = {
  almondChocChip: number;
  raspberryCoconut: number;
  crunchyBrownie: number;
  saltedCaramel: number;
  lemonCoconut: number;
};

export type TCROrderData = {
  bs1Espresso: number;
  cruiseControl: number;
  jumpstart: number;
  mixtape: number;
  shopFilter: number;
  ethiopiaDanche: number;
  rwandaRwamatamu: number;
};

export type GenericOrderData = Record<string, number>;
// --- End legacy types ---

async function readAll(): Promise<Map<Supplier, PendingOrder>> {
  try {
    const arr = (await kv.get<PendingOrder[]>(KV_KEY)) ?? [];
    const map = new Map<Supplier, PendingOrder>();
    for (const o of arr) map.set(o.supplier, o);
    return map;
  } catch {
    return new Map();
  }
}

async function writeAll(map: Map<Supplier, PendingOrder>): Promise<void> {
  try {
    await kv.set(KV_KEY, Array.from(map.values()));
  } catch {
    // swallow — caller will see stale data but app keeps running
  }
}

export async function saveOrder(order: PendingOrder): Promise<void> {
  const map = await readAll();
  map.set(order.supplier, order);
  await writeAll(map);
}

export async function getAllOrders(): Promise<PendingOrder[]> {
  const map = await readAll();
  return Array.from(map.values());
}

export async function clearOrder(supplier: Supplier): Promise<void> {
  const map = await readAll();
  map.delete(supplier);
  await writeAll(map);
}
