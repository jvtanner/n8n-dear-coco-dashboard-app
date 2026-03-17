import type { HoSOrderData, HoSDayOrder, PFOrderData, TCROrderData } from './orderStore';

const DELIVERY_ADDRESS =
  'Dear Coco Coffee Bar, The Gessner Apartments, 3 Watermead Way, London N17 9QZ (Contact: Remi Lord, 07718 380 482)';

const thL = 'padding:8px;border:1px solid #ccc;background:#f5f5f5;text-align:left;';
const thC = 'padding:8px;border:1px solid #ccc;background:#f5f5f5;text-align:center;';
const tdN = 'padding:8px;border:1px solid #ccc;';
const tdC = 'padding:8px;border:1px solid #ccc;text-align:center;';
const tbl = 'border-collapse:collapse;width:100%;max-width:500px;';
const body = 'font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;';

const HOS_FLAVOURS: { key: keyof HoSDayOrder; label: string }[] = [
  { key: 'plain',                 label: 'Plain' },
  { key: 'classicCreamCheese',    label: 'Classic Cream Cheese' },
  { key: 'saltedCaramelAndPecan', label: 'Salted Caramel & Pecan' },
  { key: 'lotusBiscoff',          label: 'Lotus Biscoff' },
];

const TCR_PRODUCTS: { key: keyof TCROrderData; label: string }[] = [
  { key: 'bs1Espresso',     label: 'BS1 Espresso' },
  { key: 'cruiseControl',   label: 'Cruise Control (Brazil Classico)' },
  { key: 'jumpstart',       label: 'Jumpstart' },
  { key: 'mixtape',         label: 'Mixtape' },
  { key: 'shopFilter',      label: 'Shop Filter' },
  { key: 'ethiopiaDanche',  label: 'Ethiopia Danche' },
  { key: 'rwandaRwamatamu', label: 'Rwanda Rwamatamu' },
];

const PF_FLAVOURS: { key: keyof PFOrderData; label: string }[] = [
  { key: 'almondChocChip',    label: 'Almond Choc Chip' },
  { key: 'raspberryCoconut',  label: 'Raspberry Coconut' },
  { key: 'crunchyBrownie',    label: 'Crunchy Brownie' },
  { key: 'saltedCaramel',     label: 'Salted Caramel' },
  { key: 'lemonCoconut',      label: 'Lemon Coconut' },
];

function dayTable(dayLabel: string, day: HoSDayOrder): string {
  const rows = HOS_FLAVOURS.map(
    f => `<tr><td style="${tdN}">${f.label}</td><td style="${tdC}">${day[f.key] ?? 0}</td></tr>`
  ).join('');
  return (
    `<h3 style="margin-top:24px;">${dayLabel}</h3>` +
    `<table style="${tbl}"><thead><tr>` +
    `<th style="${thL}">Medium buns, 140g</th><th style="${thC}">Amount Required</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`
  );
}

export function generateHoSEmail(
  order: HoSOrderData,
  venue: string,
  manager: string,
  notes?: string
): string {
  const notesHtml = notes ? `<p><strong>Adjustment notes:</strong> ${notes}</p>` : '';
  const inner =
    `<p>Hi team, below is next week's order for ${venue}</p>` +
    `<p><strong>Delivery address:</strong> ${DELIVERY_ADDRESS}</p>` +
    notesHtml +
    dayTable('Tuesday',  order.tuesday  ?? { plain: 0, classicCreamCheese: 0, saltedCaramelAndPecan: 0, lotusBiscoff: 0 }) +
    dayTable('Thursday', order.thursday ?? { plain: 0, classicCreamCheese: 0, saltedCaramelAndPecan: 0, lotusBiscoff: 0 }) +
    dayTable('Saturday', order.saturday ?? { plain: 0, classicCreamCheese: 0, saltedCaramelAndPecan: 0, lotusBiscoff: 0 }) +
    `<br><p>Thanks,<br>${manager}</p>`;
  return `<!DOCTYPE html><html><body style="${body}">${inner}</body></html>`;
}

export function generatePFEmail(
  order: PFOrderData,
  venue: string,
  manager: string,
  notes?: string
): string {
  const rows = PF_FLAVOURS.map(
    f => `<tr><td style="${tdN}">${f.label}</td><td style="${tdC}">${order[f.key] ?? 0}</td></tr>`
  ).join('');
  const table =
    `<table style="${tbl}"><thead><tr>` +
    `<th style="${thL}">Protein Ball Flavour</th><th style="${thC}">Amount Required</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`;
  const notesHtml = notes ? `<p><strong>Adjustment notes:</strong> ${notes}</p>` : '';
  const inner =
    `<p>Hi team, below is our protein ball order for ${venue}</p>` +
    `<p><strong>Delivery address:</strong> ${DELIVERY_ADDRESS}</p>` +
    notesHtml +
    table +
    `<br><p>Thanks,<br>${manager}</p>`;
  return `<!DOCTYPE html><html><body style="${body}">${inner}</body></html>`;
}

export function generateTCREmail(
  order: TCROrderData,
  venue: string,
  manager: string,
  notes?: string
): string {
  const rows = TCR_PRODUCTS.map(
    p => `<tr><td style="${tdN}">${p.label}</td><td style="${tdC}">${order[p.key] ?? 0}</td></tr>`
  ).join('');
  const table =
    `<table style="${tbl}"><thead><tr>` +
    `<th style="${thL}">Coffee (1kg bags)</th><th style="${thC}">Amount Required</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`;
  const notesHtml = notes ? `<p><strong>Adjustment notes:</strong> ${notes}</p>` : '';
  const inner =
    `<p>Hi team, below is our coffee order for ${venue}</p>` +
    `<p><strong>Delivery address:</strong> ${DELIVERY_ADDRESS}</p>` +
    notesHtml +
    table +
    `<br><p>Thanks,<br>${manager}</p>`;
  return `<!DOCTYPE html><html><body style="${body}">${inner}</body></html>`;
}
