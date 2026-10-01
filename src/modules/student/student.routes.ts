import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { idParamSchema, memberListQuerySchema, paginate, paginationMeta } from "../../lib/pagination";
import {
  departmentIdsSchema,
  departmentLinks,
  memberFilter,
  memberInclude as include,
  setUserDepartments,
  toMember,
  userFieldsSchema,
} from "../../lib/user";

const createStudentSchema = userFieldsSchema.extend({
  enrollmentNumber: z.string().trim().min(1),
  departmentIds: departmentIdsSchema,
});

const updateStudentSchema = createStudentSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const studentRouter = Router();

studentRouter.get("/", async (req, res) => {
  const query = memberListQuerySchema.parse(req.query);
  const where = memberFilter(query);

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({ where, include, ...paginate(query), orderBy: { id: "asc" } }),
    prisma.student.count({ where }),
  ]);

  res.json({ data: students.map(toMember), meta: paginationMeta(query, total) });
});

studentRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const student = await prisma.student.findUniqueOrThrow({ where: { id }, include });
  res.json(toMember(student));
});

// Creates the user, its student profile and its user_department rows in one write
studentRouter.post("/", async (req, res) => {
  const { firstName, lastName, enrollmentNumber, departmentIds } = createStudentSchema.parse(req.body);
  const { student } = await prisma.user.create({
    data: {
      firstName,
      lastName,
      userType: "student",
      student: { create: { enrollmentNumber } },
      departments: departmentLinks(departmentIds),
    },
    select: { student: { include } },
  });
  res.status(201).json(toMember(student!));
});

// departmentIds, when sent, replaces the student's departments
studentRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { firstName, lastName, departmentIds, ...data } = updateStudentSchema.parse(req.body);

  const student = await prisma.$transaction(async (tx) => {
    const { userId } = await tx.student.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    if (firstName !== undefined || lastName !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { firstName, lastName } });
    }
    if (departmentIds !== undefined) await setUserDepartments(tx, userId, departmentIds);
    return tx.student.update({ where: { id }, data, include });
  });
  res.json(toMember(student));
});

// Deleting the user cascades to the student and its user_department rows
studentRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { userId } = await prisma.student.findUniqueOrThrow({ where: { id }, select: { userId: true } });
  await prisma.user.delete({ where: { id: userId } });
  res.status(204).end();
});
