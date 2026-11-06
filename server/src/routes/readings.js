import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { parseDateOnly, todayUtc } from '../utils.js';

const router = Router();
const slots = ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER'];
const readingSchema = z.object({
  readingDate: z.string().refine(v => !!parseDateOnly(v), 'Please enter a valid date.'),
  timeSlot: z.enum(slots),
  glucoseValue: z.coerce.number().int('Value must be a whole number.').min(40, 'Value must be between 40 and 600 mg/dl.').max(600, 'Value must be between 40 and 600 mg/dl.')
});

function validateDate(dateString) {
  const date = parseDateOnly(dateString);
  if (!date) return { error: 'Please enter a valid date.' };
  if (date > todayUtc()) return { error: 'Date cannot be in the future.' };
  return { date };
}

router.post('/', async (req, res, next) => {
  try {
    if (req.body?.glucoseValue === undefined || req.body?.glucoseValue === null || req.body?.glucoseValue === '') {
      return res.status(400).json({ error: 'Please enter a glucose value.' });
    }
    const parsed = readingSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue.path[0] === 'glucoseValue' && issue.code === 'invalid_type'
        ? 'Value must be a whole number between 40 and 600 mg/dl.' : issue.message;
      return res.status(400).json({ error: message });
    }
    const dateResult = validateDate(parsed.data.readingDate);
    if (dateResult.error) return res.status(400).json({ error: dateResult.error });

    const { timeSlot, glucoseValue } = parsed.data;
    const readingDate = dateResult.date;
    const existing = await prisma.reading.findUnique({
      where: { user_date_slot: { userId: req.user.id, readingDate, timeSlot } }
    });
    const slotLabel = { MORNING: 'Morning (fasting)', AFTER_BREAKFAST: 'After breakfast', AFTER_LUNCH: 'After lunch', AFTER_DINNER: 'After dinner' }[timeSlot];
    if (existing) return res.status(409).json({ error: `You already have a ${slotLabel} reading for this date.` });
    const count = await prisma.reading.count({ where: { userId: req.user.id, readingDate } });
    if (count >= 4) return res.status(400).json({ error: 'You can add only 4 readings per day.' });

    const reading = await prisma.reading.create({
      data: { userId: req.user.id, readingDate, timeSlot, glucoseValue }
    });
    res.status(201).json({ reading });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10) || 20));
    const where = { userId: req.user.id };
    if (req.query.date) {
      const date = parseDateOnly(req.query.date);
      if (!date) return res.status(400).json({ error: 'Please enter a valid date.' });
      where.readingDate = date;
    }
    const [readings, total] = await Promise.all([
      prisma.reading.findMany({ where, orderBy: [{ readingDate: 'desc' }, { timeSlot: 'asc' }], skip: (page - 1) * limit, take: limit }),
      prisma.reading.count({ where })
    ]);
    res.json({ readings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const reading = await prisma.reading.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!reading) return res.status(404).json({ error: 'Reading not found.' });
    res.json({ reading });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (req.body?.glucoseValue === undefined || req.body?.glucoseValue === null || req.body?.glucoseValue === '') {
      return res.status(400).json({ error: 'Please enter a glucose value.' });
    }
    const parsed = readingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const dateResult = validateDate(parsed.data.readingDate);
    if (dateResult.error) return res.status(400).json({ error: dateResult.error });

    const current = await prisma.reading.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!current) return res.status(404).json({ error: 'Reading not found.' });
    const { timeSlot, glucoseValue } = parsed.data;
    const readingDate = dateResult.date;
    const duplicate = await prisma.reading.findFirst({
      where: { userId: req.user.id, readingDate, timeSlot, NOT: { id: current.id } }
    });
    const slotLabel = { MORNING: 'Morning (fasting)', AFTER_BREAKFAST: 'After breakfast', AFTER_LUNCH: 'After lunch', AFTER_DINNER: 'After dinner' }[timeSlot];
    if (duplicate) return res.status(409).json({ error: `You already have a ${slotLabel} reading for this date.` });
    if (current.readingDate.getTime() !== readingDate.getTime()) {
      const count = await prisma.reading.count({ where: { userId: req.user.id, readingDate } });
      if (count >= 4) return res.status(400).json({ error: 'You can add only 4 readings per day.' });
    }
    const reading = await prisma.reading.update({
      where: { id: current.id },
      data: { readingDate, timeSlot, glucoseValue }
    });
    res.json({ reading });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await prisma.reading.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    if (!result.count) return res.status(404).json({ error: 'Reading not found.' });
    res.json({ message: 'Reading deleted successfully.' });
  } catch (err) { next(err); }
});

export default router;
