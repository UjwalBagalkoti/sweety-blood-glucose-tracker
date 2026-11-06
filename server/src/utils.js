export const SLOT_LABELS = {
  MORNING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner'
};

export function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function summarize(readings) {
  if (!readings.length) return { highest: null, lowest: null, average: null, count: 0 };
  const values = readings.map(r => r.glucoseValue);
  return {
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    count: values.length
  };
}
