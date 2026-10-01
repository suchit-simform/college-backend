import { faker } from "@faker-js/faker";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const DEPARTMENT_COUNT = 5;
const TEACHER_COUNT = 5;
const STUDENT_COUNT = 500;

const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Applied Mathematics",
  "Applied Physics",
  "Biotechnology",
];
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
  const [departments, students, teachers] = await Promise.all([
    prisma.department.count(),
    prisma.student.count(),
    prisma.teacher.count(),
  ]);

  if (!force && (departments > 0 || students > 0 || teachers > 0)) {
    console.log(
      `Seed skipped: database already has ${departments} departments, ${students} students and ${teachers} teachers`,
    );
    return;
  }

  // TRUNCATE (not deleteMany) so ids restart from 1 on a forced reseed
  await prisma.$executeRaw`TRUNCATE TABLE "student", "teacher", "department" RESTART IDENTITY`;

  // Names are unique, so pick distinct ones
  await prisma.department.createMany({
    data: faker.helpers.arrayElements(DEPARTMENTS, DEPARTMENT_COUNT).map((name) => ({ name })),
  });
  const departmentIds = (await prisma.department.findMany({ select: { id: true } })).map((d) => d.id);

  await prisma.teacher.createMany({
    data: Array.from({ length: TEACHER_COUNT }, () => ({
      name: faker.person.fullName(),
      designation: faker.helpers.arrayElement(DESIGNATIONS),
      expertise: faker.helpers.arrayElement(EXPERTISE),
      departmentId: faker.helpers.arrayElement(departmentIds),
    })),
  });

  await prisma.student.createMany({
    data: Array.from({ length: STUDENT_COUNT }, (_, i) => ({
      name: faker.person.fullName(),
      enrollmentNumber: `ENR${new Date().getFullYear()}${String(i + 1).padStart(5, "0")}`,
      departmentId: faker.helpers.arrayElement(departmentIds),
    })),
  });

  console.log(`Seeded ${DEPARTMENT_COUNT} departments, ${TEACHER_COUNT} teachers and ${STUDENT_COUNT} students`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
