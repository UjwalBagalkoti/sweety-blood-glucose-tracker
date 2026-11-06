import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@sweety.local';
  const passwordHash = await bcrypt.hash('SweetyDemo123!', 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: 'Sweety Demo', passwordHash },
    create: { name: 'Sweety Demo', email, passwordHash }
  });

  const today = new Date();
  const date = (offset) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  };
  const samples = [
    [-6, 'MORNING', 112], [-6, 'AFTER_BREAKFAST', 148],
    [-5, 'MORNING', 106], [-5, 'AFTER_LUNCH', 139],
    [-4, 'MORNING', 118], [-4, 'AFTER_DINNER', 154],
    [-3, 'MORNING', 101], [-3, 'AFTER_BREAKFAST', 143],
    [-2, 'MORNING', 109], [-2, 'AFTER_LUNCH', 132],
    [-1, 'MORNING', 104], [-1, 'AFTER_DINNER', 146],
    [0, 'MORNING', 107]
  ];

  for (const [offset, timeSlot, glucoseValue] of samples) {
    await prisma.reading.upsert({
      where: { user_date_slot: { userId: user.id, readingDate: date(offset), timeSlot } },
      update: { glucoseValue },
      create: { userId: user.id, readingDate: date(offset), timeSlot, glucoseValue }
    });
  }
  console.log(`Seeded ${email}`);
}

main().finally(() => prisma.$disconnect());
