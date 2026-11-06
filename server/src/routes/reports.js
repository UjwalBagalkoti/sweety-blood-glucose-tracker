import { Router } from 'express';
import { prisma } from '../db.js';
import { parseDateOnly, dateOnly, summarize } from '../utils.js';

const router = Router();

function selectedDate(value) {
  if (!value) return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  return parseDateOnly(value);
}
function bounds(date, mode) {
  const y = date.getUTCFullYear(), m = date.getUTCMonth(), d = date.getUTCDate();
  if (mode === 'daily') return [new Date(Date.UTC(y, m, d)), new Date(Date.UTC(y, m, d + 1))];
  if (mode === 'month-to-date') return [new Date(Date.UTC(y, m, 1)), new Date(Date.UTC(y, m, d + 1))];
  return [new Date(Date.UTC(y, m - 1, 1)), new Date(Date.UTC(y, m, 1))];
}
async function report(req, res, mode, next) {
  try {
    const date = selectedDate(req.query.date);
    if (!date) return res.status(400).json({ error: 'Please provide a valid date in YYYY-MM-DD format.' });
    const [start, end] = bounds(date, mode);
    const readings = await prisma.reading.findMany({
      where: { userId: req.user.id, readingDate: { gte: start, lt: end } },
      orderBy: [{ readingDate: 'asc' }, { timeSlot: 'asc' }]
    });
    res.json({
      range: { start: dateOnly(start), end: dateOnly(new Date(end.getTime() - 86400000)) },
      summary: summarize(readings),
      ...(mode === 'daily' ? { readings } : {})
    });
  } catch (err) { next(err); }
}
router.get('/daily', (req, res, next) => report(req, res, 'daily', next));
router.get('/month-to-date', (req, res, next) => report(req, res, 'month-to-date', next));
router.get('/monthly', (req, res, next) => report(req, res, 'monthly', next));

router.get('/trend', async (req, res, next) => {
  try {
    const date = selectedDate(req.query.date);
    if (!date) return res.status(400).json({ error: 'Please provide a valid date in YYYY-MM-DD format.' });
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const readings = await prisma.reading.findMany({
      where: { userId: req.user.id, readingDate: { gte: start, lt: end } },
      orderBy: [{ readingDate: 'asc' }, { timeSlot: 'asc' }]
    });
    res.json({ points: readings.map(r => ({ date: dateOnly(r.readingDate), timeSlot: r.timeSlot, value: r.glucoseValue })) });
  } catch (err) { next(err); }
});
export default router;
