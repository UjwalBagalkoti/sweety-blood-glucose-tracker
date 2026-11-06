import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.sweety_session;
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub };
    next();
  } catch {
    res.clearCookie('sweety_session');
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'The requested resource was not found.' });
}

export function errorHandler(err, req, res, next) {
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'You already have a reading for this time slot and date.' });
  }
  if (err?.code === 'P2025') return res.status(404).json({ error: 'Reading not found.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
