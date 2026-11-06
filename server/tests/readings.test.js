import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import { createUser, cleanup } from './helpers.js';

describe('reading API', () => {
  let account;
  beforeEach(async () => { await cleanup(); account = await createUser(); });
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

  test('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/readings');
    expect(res.status).toBe(401);
  });

  test('creates and returns a reading for its owner', async () => {
    const date = new Date().toISOString().slice(0, 10);
    const res = await request(app).post('/api/readings').set('Cookie', account.cookie)
      .send({ readingDate: date, timeSlot: 'MORNING', glucoseValue: 108 });
    expect(res.status).toBe(201);
    expect(res.body.reading.glucoseValue).toBe(108);
    const list = await request(app).get('/api/readings').set('Cookie', account.cookie);
    expect(list.body.readings).toHaveLength(1);
  });

  test('rejects values outside the allowed range', async () => {
    const date = new Date().toISOString().slice(0, 10);
    const res = await request(app).post('/api/readings').set('Cookie', account.cookie)
      .send({ readingDate: date, timeSlot: 'MORNING', glucoseValue: 601 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/40 and 600/);
  });

  test('rejects duplicate date and slot', async () => {
    const date = new Date().toISOString().slice(0, 10);
    const body = { readingDate: date, timeSlot: 'MORNING', glucoseValue: 108 };
    await request(app).post('/api/readings').set('Cookie', account.cookie).send(body);
    const res = await request(app).post('/api/readings').set('Cookie', account.cookie).send(body);
    expect(res.status).toBe(409);
  });

  test('does not expose another user reading', async () => {
    const other = await createUser('other@example.com');
    const date = new Date().toISOString().slice(0, 10);
    const created = await request(app).post('/api/readings').set('Cookie', other.cookie)
      .send({ readingDate: date, timeSlot: 'MORNING', glucoseValue: 120 });
    const res = await request(app).get(`/api/readings/${created.body.reading.id}`).set('Cookie', account.cookie);
    expect(res.status).toBe(404);
  });
});
