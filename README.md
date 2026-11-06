# Sweety — Blood Glucose Tracker

A full-stack glucose tracking app built with React, Node.js, Express, Prisma and PostgreSQL.

## Features

- Email/password registration and login (bcrypt password hashing).
- JWT authentication in an HTTP-only cookie.
- User-scoped reading access.
- Create, list, edit and delete glucose readings.
- Four daily slots: Morning (fasting), After breakfast, After lunch, After dinner.
- Server-side validation and PostgreSQL uniqueness protection.
- Daily, month-to-date and previous-month reports.
- Daily reading list, summary statistics and monthly trend chart.
- Pagination for reading history.
- Responsive UI, loading states, empty states, toast feedback and delete confirmation.
- API tests with Jest/Supertest and frontend component tests with Vitest/React Testing Library.
- Docker Compose for PostgreSQL, API and web app.

## Requirements

- Node.js 20+
- npm 10+
- Docker Desktop (recommended), or PostgreSQL 15+

## Quick start with Docker

1. Copy `.env.example` to `.env`.
2. Change `JWT_SECRET` to a long random value.
3. Run:

```bash
docker compose up --build
```

4. Open http://localhost:5173

The API is available at http://localhost:4000 and health check at http://localhost:4000/api/health.

The API container runs Prisma migrations and seeds a demo account on startup.

**Demo login**
- Email: `demo@sweety.local`
- Password: `SweetyDemo123!`

The seed is for local evaluation only. Do not use demo credentials in production.

## Run without Docker

### 1. Database

Create a PostgreSQL database named `sweety`.

### 2. API

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

The API listens on port 4000 by default.

### 3. Frontend

In another terminal:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173.

The Vite development server proxies `/api` requests to the API. Set `VITE_API_BASE_URL` only if the frontend and API are hosted on different origins.

## Environment variables

See the root `.env.example` and `server/.env.example`. Never commit real `.env` files or secrets.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign session tokens |
| `JWT_EXPIRES_IN` | Token lifetime |
| `COOKIE_SECURE` | Set `true` behind HTTPS |
| `CLIENT_ORIGIN` | Allowed browser origin |
| `PORT` | API port |
| `NODE_ENV` | Runtime environment |
| `VITE_API_BASE_URL` | Optional API base URL for frontend |

## API overview

All reading and report endpoints require authentication.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/readings` | Create reading |
| GET | `/api/readings?page=1&limit=20&date=YYYY-MM-DD` | List readings |
| GET | `/api/readings/:id` | Get one reading |
| PUT | `/api/readings/:id` | Update reading |
| DELETE | `/api/readings/:id` | Delete reading |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | Month-to-date report |
| GET | `/api/reports/monthly?date=YYYY-MM-DD` | Previous full month |
| GET | `/api/reports/trend?date=YYYY-MM-DD` | Selected month chart data |
| GET | `/api/health` | Health check |

### Validation behavior

- Value is required and must be a whole number from 40 through 600 mg/dL.
- Only one reading per slot per user per date.
- A user can have at most four readings per day.
- Future dates are rejected.
- Validation is performed on the server; the database also enforces unique user/date/slot combinations.
- Reports and readings are scoped to the authenticated user.

## Tests

API tests:

```bash
cd server
npm install
npm test
```

The API test suite uses an isolated test database. Set `DATABASE_URL` to a disposable PostgreSQL database before running tests. Do not point tests at production data.

Frontend tests:

```bash
cd client
npm install
npm test
```

## Project structure

```text
sweety-blood-glucose-tracker/
├── client/                 # React + Vite frontend
├── server/                 # Express API + Prisma
├── docker-compose.yml
├── .env.example
└── README.md
```

## Notes and assumptions

- The assignment's explicit PostgreSQL requirement takes precedence over the "MERN" label (which traditionally implies MongoDB).
- A reading is uniquely identified by user, calendar date and time slot.
- The app stores dates as PostgreSQL `DATE` values and uses date-only strings (`YYYY-MM-DD`) at the API boundary to avoid timezone shifts.
- The monthly report means the entire previous calendar month relative to the selected date.
- The month-to-date report includes the first day of the selected month through the selected date, inclusive.
- The average is rounded to one decimal place.
- Glucose readings are informational records, not diagnoses or treatment advice. The app does not provide medical recommendations.
- JWT sessions are held in HTTP-only cookies. In production, deploy behind HTTPS and set `COOKIE_SECURE=true`.
- For production deployment, use managed PostgreSQL, configure a strong secret, set the correct client origin, and apply migrations with `npx prisma migrate deploy`.

## Improvements with more time

- Add CSRF protection and rate limiting tuned to production traffic.
- Add account email verification, password reset and session revocation.
- Add audit history for edited/deleted readings.
- Add accessibility and cross-browser automated end-to-end tests.
- Add deployment CI, monitoring and structured request tracing.
- Add clinician sharing only after designing explicit patient consent and access controls.
