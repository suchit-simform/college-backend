-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_name_key" ON "department"("name");

-- AlterTable: add as nullable first so existing rows can be backfilled
ALTER TABLE "student" ADD COLUMN "department_id" INTEGER;
ALTER TABLE "teacher" ADD COLUMN "department_id" INTEGER;

-- Backfill: existing students/teachers go to an "Unassigned" department (only created if needed)
INSERT INTO "department" ("name")
SELECT 'Unassigned'
WHERE EXISTS (SELECT 1 FROM "student") OR EXISTS (SELECT 1 FROM "teacher");

UPDATE "student" SET "department_id" = (SELECT "id" FROM "department" WHERE "name" = 'Unassigned');
UPDATE "teacher" SET "department_id" = (SELECT "id" FROM "department" WHERE "name" = 'Unassigned');

ALTER TABLE "student" ALTER COLUMN "department_id" SET NOT NULL;
ALTER TABLE "teacher" ALTER COLUMN "department_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "student_department_id_idx" ON "student"("department_id");

-- CreateIndex
CREATE INDEX "teacher_department_id_idx" ON "teacher"("department_id");

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
