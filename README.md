# TestPad

TestPad is a full-stack online testing platform built for educational institutions. It supports role-based access (Admin, Teacher, Student), timed tests with randomised question banks, proctoring via suspicious-event detection, and detailed result reporting including CSV export and per-question statistics.

---

## Quick Start (Docker Compose)

> Prerequisites: Docker 24+ and Docker Compose v2

```bash
# Clone the repository
git clone <repo-url> && cd TestPad

# Start all services (MySQL, Redis, backend, frontend)
docker compose up --build

# Run database migrations (first run only)
docker compose exec backend npx prisma migrate deploy
```

The frontend is available at http://localhost and the API at http://localhost:3000.

---

## Manual Setup

### Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate deploy
npm run dev                   # starts ts-node-dev on port 3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # starts Vite dev server on port 5173
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | MySQL connection string (`mysql://user:pass@host:3306/db`) |
| `JWT_SECRET` | Yes | — | Secret for signing access tokens (min 64 chars in production) |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing refresh tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `REDIS_URL` | Yes | — | Redis connection string (`redis://host:6379`) |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin |
| `NODE_ENV` | No | `development` | Set to `production` to enable stricter settings |

---

## API Overview

All endpoints are prefixed with `/api`. Protected routes require a Bearer token obtained from `POST /api/auth/login`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Obtain access + refresh tokens |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `POST` | `/api/auth/logout` | Invalidate refresh token |

### Tests

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/api/tests` | All | List tests (students see only open/assigned) |
| `POST` | `/api/tests` | Admin, Teacher | Create a test |
| `GET` | `/api/tests/:id` | All | Get test details |
| `PATCH` | `/api/tests/:id` | Admin, Teacher | Update a test |
| `DELETE` | `/api/tests/:id` | Admin | Delete a test |
| `GET` | `/api/tests/:id/results` | Admin, Teacher | Paginated attempt results |
| `GET` | `/api/tests/:id/results/export` | Admin, Teacher | Download results as CSV (`?groupId=` optional) |
| `GET` | `/api/tests/:id/stats/questions` | Admin, Teacher | Per-question correctness statistics |

### Attempts

| Method | Path | Roles | Description |
|---|---|---|---|
| `POST` | `/api/attempts` | Student | Start a new attempt |
| `GET` | `/api/attempts/:id` | Student | Get current attempt state |
| `POST` | `/api/attempts/:id/answer` | Student | Submit an answer |
| `POST` | `/api/attempts/:id/finish` | Student | Finish the attempt |
| `POST` | `/api/attempts/:id/suspicious` | Student | Report a suspicious event |

### Users & Groups

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List users |
| `GET` | `/api/groups` | Admin, Teacher | List groups |
| `POST` | `/api/groups` | Admin | Create a group |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma 5 |
| Database | MySQL 8 |
| Cache / Queue | Redis 7, BullMQ |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Validation | Zod |
| Frontend | React 18, TypeScript, Vite |
| State / Data | Zustand, TanStack Query |
| Styling | Tailwind CSS |
| Container | Docker, Docker Compose |
