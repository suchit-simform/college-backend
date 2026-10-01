import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { idParamSchema, memberListQuerySchema, paginate, paginationMeta } from "../../lib/pagination";
import { memberInclude as include, setUserDepartment, userFieldsSchema, userNameFilter } from "../../lib/user";

const createStudentSchema = userFieldsSchema.extend({
  enrollmentNumber: z.string().trim().min(1),
  departmentId: z.number().int().positive(),
});

const updateStudentSchema = createStudentSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const studentRouter = Router();

studentRouter.get("/", async (req, res) => {
  const query = memberListQuerySchema.parse(req.query);
  const where = { ...userNameFilter(query.name), departmentId: query.departmentId };

  const [data, total] = await prisma.$transaction([
    prisma.student.findMany({ where, include, ...paginate(query), orderBy: { id: "asc" } }),
    prisma.student.count({ where }),
  ]);

  res.json({ data, meta: paginationMeta(query, total) });
});

studentRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const student = await prisma.student.findUniqueOrThrow({ where: { id }, include });
  res.json(student);
});

// Creates the user, its student profile and its user_department row in one write
studentRouter.post("/", async (req, res) => {
  const { firstName, lastName, enrollmentNumber, departmentId } = createStudentSchema.parse(req.body);
  const { student } = await prisma.user.create({
    data: {
      firstName,
      lastName,
      userType: "student",
      student: { create: { enrollmentNumber, departmentId } },
      departments: { create: { departmentId } },
    },
    select: { student: { include } },
  });
  res.status(201).json(student);
});

studentRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { firstName, lastName, ...data } = updateStudentSchema.parse(req.body);

  const student = await prisma.$transaction(async (tx) => {
    const { userId } = await tx.student.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    if (firstName !== undefined || lastName !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { firstName, lastName } });
    }
    if (data.departmentId !== undefined) await setUserDepartment(tx, userId, data.departmentId);
    return tx.student.update({ where: { id }, data, include });
  });
  res.json(student);
});

// Deleting the user cascades to the student and its user_department rows
studentRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { userId } = await prisma.student.findUniqueOrThrow({ where: { id }, select: { userId: true } });
  await prisma.user.delete({ where: { id: userId } });
  res.status(204).end();
});
