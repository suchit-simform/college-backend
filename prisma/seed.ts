import { faker } from "@faker-js/faker";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const TEACHER_COUNT = 5;
const STUDENT_COUNT = 500;

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Head of Department"];
const EXPERTISE = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Data Science",
];

async function main() {
  // Pass --force to wipe and reseed; otherwise skip when data already exists
  const force = process.argv.includes("--force");
  const [students, teachers] = await Promise.all([prisma.student.count(), prisma.teacher.count()]);

  if (!force && (students > 0 || teachers > 0)) {
    console.log(`Seed skipped: database already has ${students} students and ${teachers} teachers`);
    return;
  }

  // TRUNCATE (not deleteMany) so ids restart from 1 on a forced reseed
  await prisma.$executeRaw`TRUNCATE TABLE "student", "teacher" RESTART IDENTITY`;

  await prisma.teacher.createMany({
    data: Array.from({ length: TEACHER_COUNT }, () => ({
      name: faker.person.fullName(),
      designation: faker.helpers.arrayElement(DESIGNATIONS),
      expertise: faker.helpers.arrayElement(EXPERTISE),
    })),
  });

  await prisma.student.createMany({
    data: Array.from({ length: STUDENT_COUNT }, (_, i) => ({
      name: faker.person.fullName(),
      enrollmentNumber: `ENR${new Date().getFullYear()}${String(i + 1).padStart(5, "0")}`,
    })),
  });

  console.log(`Seeded ${TEACHER_COUNT} teachers and ${STUDENT_COUNT} students`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
