# College Backend

A CRUD API for departments, students and teachers, built with Node.js, TypeScript, Express 5, Prisma 7, PostgreSQL 16 and Swagger UI.

## Quick start

```bash
docker compose up --build --watch     # or: pnpm docker:up
```

That one command:

1. Starts Postgres (also reachable from your machine on `localhost:5433`).
2. Builds the API image (this generates the Prisma client) and applies the migrations.
3. Seeds 5 departments and 510 users (10 teachers and 500 students) with Faker. Each student and teacher gets its own user. Students are linked to 1 random department and teachers to 1 or 2, through `user_department`. If the database already has data, this step is skipped.
4. Starts the API on http://localhost:3000 and watches your files:
   - **Edits in `src/`** are copied into the container and the server restarts within a couple of seconds.
   - **Changes to `prisma/`, `prisma.config.ts`, `package.json` or `pnpm-lock.yaml`** rebuild the image and restart the API, which applies any new migrations. Your data is kept.

It runs in the foreground with logs. Press `Ctrl+C` to stop watching, then run `pnpm docker:down` to stop the containers. Plain `docker compose up --build` still works, but without hot reload.

| URL | What |
| --- | --- |
| http://localhost:3000/docs | Swagger UI for trying the endpoints |
| http://localhost:3000/docs.json | Raw OpenAPI spec |
| http://localhost:3000/health | Health check |

### CORS

Browsers may call the API only from the origins in `CORS_ORIGIN`, a comma-separated list. The default allows the college-frontend dev server (`http://localhost:5173`) and its Docker container (`http://localhost:8080`). Use `*` to allow any origin. Set it in `.env` for local runs, or in your shell before `docker compose up` (the compose file passes it to the API).

### Docker scripts

| Script | What it does |
| --- | --- |
| `pnpm docker:up` | Builds and starts the stack with hot reload (foreground) |
| `pnpm docker:down` | Stops the stack (data is kept) |
| `pnpm docker:reset` | Deletes the database volume and starts fresh with a new migration, seed and hot reload |
| `pnpm docker:seed` | Wipes all tables and reseeds them (IDs restart at 1); run it in a second terminal while the stack is up |
| `pnpm docker:logs` | Follows the API logs (from another terminal) |

## Endpoints

All routes are versioned under `/api/v1`. `/api/v1/departments`, `/api/v1/students` and `/api/v1/teachers` all have:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `?page=1&limit=10&name=foo` (query params are kebab-case; limit at most 100; name is a case-insensitive partial match, see [Users](#users)) |
| GET | `/:id` | 404 if not found |
| POST | `/` | 201; 409 on a duplicate department `name` or student `enrollmentNumber` |
| PUT | `/:id` | Partial bodies allowed |
| DELETE | `/:id` | 204 |

A list response looks like `{ data: [...], meta: { page, limit, total, totalPages } }`.

### Departments

- Students and teachers are linked to departments only through `user_department`, so a member can belong to several. The body of a create request must include `departmentIds` (at least one id; duplicates are ignored). If any id doesn't match a department, the API returns 400.
- On update, sending `departmentIds` replaces the member's departments. Leave it out to keep them as they are.
- Student and teacher lists also take `?department-id=1` to show only members linked to that department.
- Student and teacher responses list the departments: `{ ..., departments: [{ id: 1, name: "..." }] }`.
- You can't delete a department while users are still linked to it (409). Move them to another department or delete them first.

### Users

- Every student and teacher is linked to its own `user` (`first_name`, `last_name`, `user_type` = `student` or `teacher`). Names are stored only on the user.
- Create and update bodies send the names flat: `{ firstName, lastName, enrollmentNumber, departmentIds }` for students, `{ firstName, lastName, designation, expertise, departmentIds }` for teachers. Creating a student or teacher also creates its user.
- Responses include the user: `{ id, ..., userId: 11, user: { id: 11, firstName, lastName, userType }, departments: [...] }`.
- On students and teachers, `?name=` splits the search into words, and every word has to match part of the first or last name. For example, `?name=ada love` finds Ada Lovelace.
- Deleting a student or teacher also deletes its user.

### Upgrading an existing database

The `add_department` migration keeps your data. If the database already has students or teachers, it creates an `Unassigned` department and puts all of them in it. Because the database isn't empty, the automatic seed is skipped. To get the 5 Faker departments, run `pnpm docker:seed` (this wipes everything and reseeds) or `pnpm docker:reset`.

The `add_user` migration also keeps your data. It creates a user for each existing student and teacher by splitting the old `name` at the first space: the first word becomes `first_name` and the rest becomes `last_name`. It also adds the matching `user_department` rows. The old `name` columns are then dropped.

The `user_department_only` migration drops `department_id` from `student` and `teacher`. Before dropping it, it copies any department link that `user_department` doesn't already have, so no memberships are lost.

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
src/app.ts         express app, swagger, mounts /api/v1
src/routes/        versioned routers (v1.ts mounts every module)
src/server.ts      entry point
src/lib/           prisma client (pg adapter), pagination and user helpers
src/generated/     generated Prisma client (do not edit)
src/middleware/    404 and error handling (zod → 400, P2025 → 404, P2002 → 409, P2003 → 400 or 409 on delete)
src/modules/       department, student and teacher routers
src/docs/          OpenAPI spec
```
