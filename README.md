# Mochat

A full-stack real-time chat application built with Next.js and NestJS, supporting direct messages, private groups, and public group chats with live presence and typing indicators.

## Repos Structure

```
mochat/
├── backend/          # built with nest
├── frontend/         # built with nextjs
├── packages/         # shared types / utilities (optional)
├── .env.example
└── README.md
```

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | Next.js, TypeScript                     |
| Backend    | NestJS, TypeScript                      |
| Database   | PostgreSQL + Prisma ORM                 |
| Real-time  | Socket.io                               |
| Auth       | JWT (access token)                      |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- pnpm (recommended) or npm

### 1. Clone and install

```bash
git clone https://github.com/M0Leo/mochat
cd mochat
```
individually install backend with pnpm and then the forntend (order won't matter) 

### 2. Set up environment variables

```bash
cp .env.example .env
# fill in the values — see Environment Variables below
```

### 3. Run the database

```bash
# start PostgreSQL locally (or point DATABASE_URL at a remote instance)
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed      # optional seed data
```
### 4. Build and Run both apps

```bash
pnpm run start:prod #for backend
npm run start #for front end
```

## Environment Variables

Copy `.env.example` and fill in the values:

```env
# ── Database ──────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/chatapp

# ── JWT ───────────────────────────────────────────
JWT_ACCESS_PRIVATE_KEY=your_access_secret
JWT_REFRESH_PRIVATE_KEY=your_refresh_secret
```

> Each app may have its own `.env` as well — see their individual READMEs.

## Features

- **Direct messages** — one-to-one private chats
- **Group chats** — private and public groups
- **Real-time messaging** — Socket.io with room-based delivery
- **Presence** — online/offline status and `lastSeenAt`
- **JWT authentication** — access token auth on both REST and WebSocket

## Contributing

1. Branch off `main` — `git checkout -b feat/your-feature`
2. Commit using conventional commits — `feat:`, `fix:`, `chore:`, etc.
3. Open a pull request against `main`
