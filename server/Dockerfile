FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY prisma/seed.js ./prisma/seed.js
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
