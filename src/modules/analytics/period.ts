/** "2026-03" → "T3/26", "2026-Q2" → "Q2/26"; kỳ năm giữ nguyên. */
export function formatPeriod(period: string) {
  if (/^\d{4}-\d{2}$/.test(period)) return `T${Number(period.slice(5))}/${period.slice(2, 4)}`;
  const quarter = /^(\d{4})-Q(\d)$/.exec(period);
  if (quarter) return `Q${quarter[2]}/${quarter[1].slice(2)}`;
  return period;
}
