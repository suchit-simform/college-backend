# College Backend

A CRUD API for departments, students and teachers, built with Node.js, TypeScript, Express 5, Prisma 7, PostgreSQL 16 and Swagger UI.

## Quick start

```bash
docker compose up --build --watch     # or: pnpm docker:up
```

That one command:

1. Starts Postgres (also reachable from your machine on `localhost:5433`).
2. Builds the API image (this generates the Prisma client) and applies the migrations.
3. Seeds 5 departments, 5 teachers and 500 students with Faker (each student and teacher is put in a random department). If the database already has data, this step is skipped.
4. Starts the API on http://localhost:3000 and watches your files:
   - **Edits in `src/`** are copied into the container and the server restarts within a couple of seconds.
   - **Changes to `prisma/`, `prisma.config.ts`, `package.json` or `pnpm-lock.yaml`** rebuild the image and restart the API, which applies any new migrations. Your data is kept.

It runs in the foreground with logs. Press `Ctrl+C` to stop watching, then run `pnpm docker:down` to stop the containers. Plain `docker compose up --build` still works, but without hot reload.

| URL | What |
| --- | --- |
| http://localhost:3000/docs | Swagger UI for trying the endpoints |
| http://localhost:3000/docs.json | Raw OpenAPI spec |
| http://localhost:3000/health | Health check |

### Docker scripts

| Script | What it does |
| --- | --- |
| `pnpm docker:up` | Builds and starts the stack with hot reload (foreground) |
| `pnpm docker:down` | Stops the stack (data is kept) |
| `pnpm docker:reset` | Deletes the database volume and starts fresh with a new migration, seed and hot reload |
| `pnpm docker:seed` | Wipes all three tables and reseeds them (IDs restart at 1); run it in a second terminal while the stack is up |
| `pnpm docker:logs` | Follows the API logs (from another terminal) |

## Endpoints

`/api/departments`, `/api/students` and `/api/teachers` all have:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `?page=1&limit=10&name=foo` (limit at most 100; name is a case-insensitive partial match) |
| GET | `/:id` | 404 if not found |
| POST | `/` | 201; 409 on a duplicate department `name` or student `enrollmentNumber` |
| PUT | `/:id` | Partial bodies allowed |
| DELETE | `/:id` | 204 |

A list response looks like `{ data: [...], meta: { page, limit, total, totalPages } }`.

### Departments

- Every student and teacher belongs to one department. The body of a create request must include `departmentId`. If no department has that id, the API returns 400.
- Student and teacher lists also take `?departmentId=1` to show only that department's members.
- Student and teacher responses include the department: `{ ..., departmentId: 1, department: { id: 1, name: "..." } }`.
- You can't delete a department while it still has students or teachers (409). Move them to another department or delete them first.

### Upgrading an existing database

The `add_department` migration keeps your data. If the database already has students or teachers, it creates an `Unassigned` department and puts all of them in it. Because the database isn't empty, the automatic seed is skipped. To get the 5 Faker departments, run `pnpm docker:seed` (this wipes everything and reseeds) or `pnpm docker:reset`.

## Running locally without the API container

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:deploy && pnpm db:seed
pnpm dev
```

After changing `prisma/schema.prisma`, run `pnpm db:migrate --name <change>` to create a new migration, then `pnpm exec prisma generate`. In Prisma 7, `migrate dev` no longer regenerates the client for you.

## Prisma 7 notes

- The database URL is set in `prisma.config.ts`, not in `schema.prisma`. That file loads `.env` itself, because Prisma 7 no longer does.
- The client is generated into `src/generated/prisma/` (ignored by git). Import from there, not from `@prisma/client`.
- Queries go through the `pg` driver adapter (`@prisma/adapter-pg`), set up in `src/lib/prisma.ts`.

## Layout

```
prisma.config.ts   Prisma CLI config (datasource URL, migrations, seed)
prisma/            schema, migrations, seed
src/app.ts         express app, routes, swagger
src/server.ts      entry point
src/lib/           prisma client (pg adapter), pagination helpers
src/generated/     generated Prisma client (do not edit)
src/middleware/    404 and error handling (zod → 400, P2025 → 404, P2002 → 409, P2003 → 400 or 409 on delete)
src/modules/       department, student and teacher routers
src/docs/          OpenAPI spec
```
