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

const createTeacherSchema = userFieldsSchema.extend({
  designation: z.string().trim().min(1),
  expertise: z.string().trim().min(1),
  departmentIds: departmentIdsSchema,
});

const updateTeacherSchema = createTeacherSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const teacherRouter = Router();

teacherRouter.get("/", async (req, res) => {
  const query = memberListQuerySchema.parse(req.query);
  const where = memberFilter(query);

  const [teachers, total] = await prisma.$transaction([
    prisma.teacher.findMany({ where, include, ...paginate(query), orderBy: { id: "asc" } }),
    prisma.teacher.count({ where }),
  ]);

  res.json({ data: teachers.map(toMember), meta: paginationMeta(query, total) });
});

teacherRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const teacher = await prisma.teacher.findUniqueOrThrow({ where: { id }, include });
  res.json(toMember(teacher));
});

// Creates the user, its teacher profile and its user_department rows in one write
teacherRouter.post("/", async (req, res) => {
  const { firstName, lastName, designation, expertise, departmentIds } = createTeacherSchema.parse(req.body);
  const { teacher } = await prisma.user.create({
    data: {
      firstName,
      lastName,
      userType: "teacher",
      teacher: { create: { designation, expertise } },
      departments: departmentLinks(departmentIds),
    },
    select: { teacher: { include } },
  });
  res.status(201).json(toMember(teacher!));
});

// departmentIds, when sent, replaces the teacher's departments
teacherRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { firstName, lastName, departmentIds, ...data } = updateTeacherSchema.parse(req.body);

  const teacher = await prisma.$transaction(async (tx) => {
    const { userId } = await tx.teacher.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    if (firstName !== undefined || lastName !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { firstName, lastName } });
    }
    if (departmentIds !== undefined) await setUserDepartments(tx, userId, departmentIds);
    return tx.teacher.update({ where: { id }, data, include });
  });
  res.json(toMember(teacher));
});

// Deleting the user cascades to the teacher and its user_department rows
teacherRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { userId } = await prisma.teacher.findUniqueOrThrow({ where: { id }, select: { userId: true } });
  await prisma.user.delete({ where: { id: userId } });
  res.status(204).end();
});
