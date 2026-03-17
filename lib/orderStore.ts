import { writeFileSync, readFileSync, existsSync } from 'fs';

const TMP_PATH = '/tmp/dear-coco-order.json';

export type DayOrder = {
  plain: number;
  classicCreamCheese: number;
  saltedCaramelAndPecan: number;
  lotusBiscoff: number;
};

export type OrderData = {
  tuesday: DayOrder;
  thursday: DayOrder;
  saturday: DayOrder;
};

export type PendingOrder = {
  venue: string;
  manager: string;
  order: OrderData;
  callbackUrl: string;
  receivedAt: string;
  status: 'pending' | 'approved' | 'rejected';
};

// Module-level store — survives within a warm Lambda instance
let currentOrder: PendingOrder | null = null;

export function saveOrder(order: PendingOrder): void {
  currentOrder = order;
  try {
    writeFileSync(TMP_PATH, JSON.stringify(order));
  } catch {
    // /tmp may not be writable in all environments; in-memory is sufficient
  }
}

export function getOrder(): PendingOrder | null {
  if (currentOrder) return currentOrder;
  // Try hydrating from /tmp (warm instance that lost in-memory state)
  try {
    if (existsSync(TMP_PATH)) {
      const raw = readFileSync(TMP_PATH, 'utf-8');
      currentOrder = JSON.parse(raw) as PendingOrder;
      return currentOrder;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearOrder(): void {
  currentOrder = null;
  try {
    if (existsSync(TMP_PATH)) writeFileSync(TMP_PATH, '');
  } catch {
    // ignore
  }
}
