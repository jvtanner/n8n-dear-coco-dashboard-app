import { writeFileSync, readFileSync, existsSync } from 'fs';

const TMP_PATH = '/tmp/dear-coco-orders.json';

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

const orders = new Map<Supplier, PendingOrder>();

function persist() {
  try {
    writeFileSync(TMP_PATH, JSON.stringify(Array.from(orders.values())));
  } catch {
    // /tmp may not be writable in all environments
  }
}

function hydrate() {
  if (orders.size > 0) return;
  try {
    if (existsSync(TMP_PATH)) {
      const raw = readFileSync(TMP_PATH, 'utf-8');
      if (!raw) return;
      const arr = JSON.parse(raw) as PendingOrder[];
      for (const o of arr) orders.set(o.supplier, o);
    }
  } catch {
    // ignore
  }
}

export function saveOrder(order: PendingOrder): void {
  orders.set(order.supplier, order);
  persist();
}

export function getAllOrders(): PendingOrder[] {
  hydrate();
  return Array.from(orders.values());
}

export function clearOrder(supplier: Supplier): void {
  orders.delete(supplier);
  persist();
}
