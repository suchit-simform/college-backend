-- CreateEnum
CREATE TYPE "user_type" AS ENUM ('student', 'teacher');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "user_type" "user_type" NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_department" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,

    CONSTRAINT "user_department_pkey" PRIMARY KEY ("id")
);

-- Backfill: every existing student/teacher becomes a user. The old "name" is split on the
-- first space into first_name / last_name. A temporary column remembers which row each user came from.
ALTER TABLE "student" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "teacher" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "user" ADD COLUMN "source_id" INTEGER;

INSERT INTO "user" ("first_name", "last_name", "user_type", "source_id")
SELECT split_part(trim("name"), ' ', 1), trim(substr(trim("name"), length(split_part(trim("name"), ' ', 1)) + 1)), 'student', "id"
FROM "student" ORDER BY "id";
UPDATE "student" s SET "user_id" = u."id" FROM "user" u WHERE u."user_type" = 'student' AND u."source_id" = s."id";

INSERT INTO "user" ("first_name", "last_name", "user_type", "source_id")
SELECT split_part(trim("name"), ' ', 1), trim(substr(trim("name"), length(split_part(trim("name"), ' ', 1)) + 1)), 'teacher', "id"
FROM "teacher" ORDER BY "id";
UPDATE "teacher" t SET "user_id" = u."id" FROM "user" u WHERE u."user_type" = 'teacher' AND u."source_id" = t."id";

ALTER TABLE "user" DROP COLUMN "source_id";

INSERT INTO "user_department" ("user_id", "department_id")
SELECT "user_id", "department_id" FROM "student"
UNION ALL
SELECT "user_id", "department_id" FROM "teacher";

ALTER TABLE "student" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "teacher" ALTER COLUMN "user_id" SET NOT NULL;

-- Names now live on "user"
DROP INDEX "student_name_idx";
DROP INDEX "teacher_name_idx";
ALTER TABLE "student" DROP COLUMN "name";
ALTER TABLE "teacher" DROP COLUMN "name";

-- CreateIndex
CREATE INDEX "user_first_name_idx" ON "user"("first_name");

-- CreateIndex
CREATE INDEX "user_last_name_idx" ON "user"("last_name");

-- CreateIndex
CREATE INDEX "user_department_department_id_idx" ON "user_department"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_department_user_id_department_id_key" ON "user_department"("user_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_user_id_key" ON "student"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_user_id_key" ON "teacher"("user_id");

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department" ADD CONSTRAINT "user_department_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department" ADD CONSTRAINT "user_department_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
