import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db.js';
import { config } from '../src/config.js';

export async function createUser(email = `test-${Date.now()}@example.com`) {
  const user = await prisma.user.create({
    data: { name: 'Test User', email, passwordHash: await bcrypt.hash('TestPassword123!', 4) }
  });
  const token = jwt.sign({}, config.jwtSecret, { subject: user.id, expiresIn: '1h' });
  return { user, cookie: `sweety_session=${token}` };
}
export async function cleanup() {
  await prisma.reading.deleteMany();
  await prisma.user.deleteMany();
}
