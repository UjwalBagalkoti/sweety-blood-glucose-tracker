import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72)
});
const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.')
});

function setSession(res, userId) {
  const token = jwt.sign({}, config.jwtSecret, { subject: userId, expiresIn: config.jwtExpiresIn });
  res.cookie('sweety_session', token, {
    httpOnly: true, secure: config.cookieSecure, sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, path: '/'
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash },
      select: { id: true, name: true, email: true }
    });
    setSession(res, user.id);
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    setSession(res, user.id);
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('sweety_session', { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/' });
  res.json({ message: 'Logged out successfully.' });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true }
    });
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    res.json({ user });
  } catch (err) { next(err); }
});

export default router;
