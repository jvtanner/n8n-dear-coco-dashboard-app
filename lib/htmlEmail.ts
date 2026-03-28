import type { OrderItem } from './orderStore';

const DELIVERY_ADDRESS =
  'Dear Coco Coffee Bar, The Gessner Apartments, 3 Watermead Way, London N17 9QZ (Contact: Remi Lord, 07718 380 482)';

const thL = 'padding:8px;border:1px solid #ccc;background:#f5f5f5;text-align:left;';
const thC = 'padding:8px;border:1px solid #ccc;background:#f5f5f5;text-align:center;';
const tdN = 'padding:8px;border:1px solid #ccc;';
const tdC = 'padding:8px;border:1px solid #ccc;text-align:center;';
const tbl = 'border-collapse:collapse;width:100%;max-width:500px;';
const bodyStyle = 'font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;';

function buildTable(items: OrderItem[], columnLabel: string): string {
  const unitLabel = items[0]?.unit || 'Qty';
  const rows = items
    .map(
      (i) =>
        `<tr><td style="${tdN}">${i.name}</td><td style="${tdC}">${i.quantity}</td></tr>`
    )
    .join('');
  return (
    `<table style="${tbl}"><thead><tr>` +
    `<th style="${thL}">${columnLabel}</th><th style="${thC}">${unitLabel}</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`
  );
}

export function generateUniversalEmail(
  items: OrderItem[],
  supplierLabel: string,
  orderType: 'email' | 'portal',
  venue: string,
  manager: string,
  category?: string,
  notes?: string
): string {
  const notesHtml = notes
    ? `<p><strong>Adjustment notes:</strong> ${notes}</p>`
    : '';

  const greeting =
    orderType === 'email'
      ? `<p>Hi team, below is our ${category?.toLowerCase() || 'order'} order for ${venue}</p>`
      : `<p>Hi ${manager || 'team'}, the ${supplierLabel} order has been approved.</p>`;

  // Group items by the group field (e.g., "Tuesday", "Thursday", "Saturday" for HoS)
  const groups: Record<string, OrderItem[]> = {};
  for (const item of items) {
    const g = item.group || '_default';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  }

  let tablesHtml = '';
  const columnLabel = category || 'Product';

  for (const [groupName, groupItems] of Object.entries(groups)) {
    if (groupName !== '_default') {
      tablesHtml += `<h3 style="margin-top:24px;">${groupName}</h3>`;
    }
    tablesHtml += buildTable(groupItems, columnLabel);
  }

  const inner =
    greeting +
    `<p><strong>Delivery address:</strong> ${DELIVERY_ADDRESS}</p>` +
    notesHtml +
    tablesHtml +
    `<br><p>Thanks,<br>${manager || 'Dear Coco Automation'}</p>`;

  return `<!DOCTYPE html><html><body style="${bodyStyle}">${inner}</body></html>`;
}
