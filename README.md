# WEOPC.ORG - Flexible Work & Side Gig Platform

A modern web platform connecting project providers with flexible workers for side gigs and freelance opportunities.

## Tech Stack

### Backend
- Node.js 18+ with TypeScript
- Express.js
- Prisma ORM with PostgreSQL
- JWT Authentication
- Redis for caching

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + Shadcn/ui
- TanStack Query
- NextAuth.js

### Infrastructure
- Turborepo monorepo
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### Installation

1. Clone the repository
```bash
cd weopc
```

2. Install dependencies
```bash
pnpm install
```

3. Start database services
```bash
cd tools/docker
docker-compose up -d
```

4. Set up environment variables
```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

5. Run database migrations
```bash
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
```

6. Start development servers
```bash
# From root directory
pnpm dev
```

The API will be available at http://localhost:3002
The web app will be available at http://localhost:3003

## Project Structure

```
weopc/
├── apps/
│   ├── api/          # Backend API (Express + TypeScript)
│   └── web/          # Frontend (Next.js)
├── packages/         # Shared packages
├── tools/
│   ├── docker/       # Docker configs
│   └── scripts/      # Utility scripts
└── docs/            # Documentation
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Projects
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/:id` - Get project details
- `POST /api/v1/projects` - Create project (PROVIDER)
- `PATCH /api/v1/projects/:id` - Update project (PROVIDER)
- `DELETE /api/v1/projects/:id` - Delete project (PROVIDER)

### Leads
- `POST /api/v1/projects/:projectId/leads` - Submit lead (USER)
- `GET /api/v1/users/me/leads` - Get my leads (USER)
- `GET /api/v1/projects/:projectId/leads` - Get project leads (PROVIDER)
- `PATCH /api/v1/leads/:id` - Update lead status (PROVIDER)

## User Roles

- **USER**: Can browse projects and submit leads
- **PROVIDER**: Can post projects and manage leads
- **ADMIN**: Full platform access

## Development

### Run tests
```bash
pnpm test
```

### Build for production
```bash
pnpm build
```

### Database management
```bash
# Open Prisma Studio
pnpm db:studio

# Create migration
cd apps/api
pnpm prisma migrate dev --name migration_name

# Reset database
pnpm prisma migrate reset
```

## License

Private - All rights reserved
