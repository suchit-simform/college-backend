import { faker } from "@faker-js/faker";
import "dotenv/config";
import type { UserType } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

const DEPARTMENT_COUNT = 5;
const TEACHER_COUNT = 10;
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

// Create one user per member and return their ids in order
async function createUsers(count: number, userType: UserType) {
  const users = await prisma.user.createManyAndReturn({
    data: Array.from({ length: count }, () => ({
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      userType,
    })),
    select: { id: true },
  });
  return users.map((u) => u.id);
}

async function main() {
  // Pass --force to wipe and reseed; otherwise skip when data already exists
  const force = process.argv.includes("--force");
  const [departments, users] = await Promise.all([prisma.department.count(), prisma.user.count()]);

  if (!force && (departments > 0 || users > 0)) {
    console.log(`Seed skipped: database already has ${departments} departments and ${users} users`);
    return;
  }

  // TRUNCATE (not deleteMany) so ids restart from 1 on a forced reseed
  await prisma.$executeRaw`TRUNCATE TABLE "user_department", "student", "teacher", "user", "department" RESTART IDENTITY`;

  // Names are unique, so pick distinct ones
  await prisma.department.createMany({
    data: faker.helpers.arrayElements(DEPARTMENTS, DEPARTMENT_COUNT).map((name) => ({ name })),
  });
  const departmentIds = (await prisma.department.findMany({ select: { id: true } })).map((d) => d.id);

  const teacherUserIds = await createUsers(TEACHER_COUNT, "teacher");
  const teachers = teacherUserIds.map((userId) => ({
    userId,
    designation: faker.helpers.arrayElement(DESIGNATIONS),
    expertise: faker.helpers.arrayElement(EXPERTISE),
    departmentId: faker.helpers.arrayElement(departmentIds),
  }));
  await prisma.teacher.createMany({ data: teachers });

  const studentUserIds = await createUsers(STUDENT_COUNT, "student");
  const students = studentUserIds.map((userId, i) => ({
    userId,
    enrollmentNumber: `ENR${new Date().getFullYear()}${String(i + 1).padStart(5, "0")}`,
    departmentId: faker.helpers.arrayElement(departmentIds),
  }));
  await prisma.student.createMany({ data: students });

  // user_department mirrors each member's department
  await prisma.userDepartment.createMany({
    data: [...teachers, ...students].map(({ userId, departmentId }) => ({ userId, departmentId })),
  });

  console.log(
    `Seeded ${DEPARTMENT_COUNT} departments, ${TEACHER_COUNT + STUDENT_COUNT} users ` +
      `(${TEACHER_COUNT} teachers, ${STUDENT_COUNT} students) and their user_department rows`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
