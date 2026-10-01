-- Departments are now linked only through "user_department". The API already kept it in step
-- with student/teacher.department_id; copy any missing pairs anyway so no membership is lost.
INSERT INTO "user_department" ("user_id", "department_id")
SELECT "user_id", "department_id" FROM "student"
UNION
SELECT "user_id", "department_id" FROM "teacher"
ON CONFLICT ("user_id", "department_id") DO NOTHING;

-- DropForeignKey
ALTER TABLE "student" DROP CONSTRAINT "student_department_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher" DROP CONSTRAINT "teacher_department_id_fkey";

-- DropIndex
DROP INDEX "student_department_id_idx";

-- DropIndex
DROP INDEX "teacher_department_id_idx";

-- AlterTable
ALTER TABLE "student" DROP COLUMN "department_id";

-- AlterTable
ALTER TABLE "teacher" DROP COLUMN "department_id";
