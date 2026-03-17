import type { OrderData } from './orderStore';

const FLAVOURS: { key: keyof import('./orderStore').DayOrder; label: string }[] = [
  { key: 'plain', label: 'Plain' },
  { key: 'classicCreamCheese', label: 'Classic Cream Cheese' },
  { key: 'saltedCaramelAndPecan', label: 'Salted Caramel & Pecan' },
  { key: 'lotusBiscoff', label: 'Lotus Biscoff' },
];

function buildDayTable(dayLabel: string, dayData: import('./orderStore').DayOrder | undefined): string {
  const safe = dayData ?? { plain: 0, classicCreamCheese: 0, saltedCaramelAndPecan: 0, lotusBiscoff: 0 };
  const rows = FLAVOURS.map(
    (f) =>
      `<tr><td style="padding:8px;border:1px solid #ccc;">${f.label}</td>` +
      `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${safe[f.key]}</td></tr>`
  ).join('');
  return (
    `<h3 style="margin-top:24px;">${dayLabel}</h3>` +
    `<table style="border-collapse:collapse;width:100%;max-width:500px;">` +
    `<thead><tr>` +
    `<th style="padding:8px;border:1px solid #ccc;background:#f5f5f5;text-align:left;">Medium buns, 140g</th>` +
    `<th style="padding:8px;border:1px solid #ccc;background:#f5f5f5;text-align:center;">Amount Required</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`
  );
}

export function generateHtmlEmail(
  order: OrderData,
  venue: string,
  manager: string,
  adjustmentNotes?: string
): string {
  const tuesdayHtml = buildDayTable('Tuesday', order.tuesday);
  const thursdayHtml = buildDayTable('Thursday', order.thursday);
  const saturdayHtml = buildDayTable('Saturday', order.saturday);

  const notesHtml = adjustmentNotes
    ? `<p><strong>Adjustment notes:</strong> ${adjustmentNotes}</p>`
    : '';

  return (
    `<!DOCTYPE html><html>` +
    `<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">` +
    `<p>Hi team, below is next week's order for ${venue}</p>` +
    `<p><strong>Delivery address:</strong> Dear Coco Coffee Bar, The Gessner Apartments, 3 Watermead Way, London N17 9QZ (Contact: Remi Lord, 07718 380 482)</p>` +
    notesHtml +
    tuesdayHtml +
    thursdayHtml +
    saturdayHtml +
    `<br><p>Thanks,<br>${manager}</p>` +
    `</body></html>`
  );
}
