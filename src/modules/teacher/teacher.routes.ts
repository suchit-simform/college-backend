import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { idParamSchema, memberListQuerySchema, paginate, paginationMeta } from "../../lib/pagination";
import { memberInclude as include, setUserDepartment, userFieldsSchema, userNameFilter } from "../../lib/user";

const createTeacherSchema = userFieldsSchema.extend({
  designation: z.string().trim().min(1),
  expertise: z.string().trim().min(1),
  departmentId: z.number().int().positive(),
});

const updateTeacherSchema = createTeacherSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const teacherRouter = Router();

teacherRouter.get("/", async (req, res) => {
  const query = memberListQuerySchema.parse(req.query);
  const where = { ...userNameFilter(query.name), departmentId: query.departmentId };

  const [data, total] = await prisma.$transaction([
    prisma.teacher.findMany({ where, include, ...paginate(query), orderBy: { id: "asc" } }),
    prisma.teacher.count({ where }),
  ]);

  res.json({ data, meta: paginationMeta(query, total) });
});

teacherRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const teacher = await prisma.teacher.findUniqueOrThrow({ where: { id }, include });
  res.json(teacher);
});

// Creates the user, its teacher profile and its user_department row in one write
teacherRouter.post("/", async (req, res) => {
  const { firstName, lastName, designation, expertise, departmentId } = createTeacherSchema.parse(req.body);
  const { teacher } = await prisma.user.create({
    data: {
      firstName,
      lastName,
      userType: "teacher",
      teacher: { create: { designation, expertise, departmentId } },
      departments: { create: { departmentId } },
    },
    select: { teacher: { include } },
  });
  res.status(201).json(teacher);
});

teacherRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { firstName, lastName, ...data } = updateTeacherSchema.parse(req.body);

  const teacher = await prisma.$transaction(async (tx) => {
    const { userId } = await tx.teacher.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    if (firstName !== undefined || lastName !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { firstName, lastName } });
    }
    if (data.departmentId !== undefined) await setUserDepartment(tx, userId, data.departmentId);
    return tx.teacher.update({ where: { id }, data, include });
  });
  res.json(teacher);
});

// Deleting the user cascades to the teacher and its user_department rows
teacherRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { userId } = await prisma.teacher.findUniqueOrThrow({ where: { id }, select: { userId: true } });
  await prisma.user.delete({ where: { id: userId } });
  res.status(204).end();
});
