import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { idParamSchema, listQuerySchema, nameFilter, paginate, paginationMeta } from "../../lib/pagination";

const createTeacherSchema = z.object({
  name: z.string().trim().min(1),
  designation: z.string().trim().min(1),
  expertise: z.string().trim().min(1),
});

const updateTeacherSchema = createTeacherSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const teacherRouter = Router();

teacherRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where = nameFilter(query.name);

  const [data, total] = await prisma.$transaction([
    prisma.teacher.findMany({ where, ...paginate(query), orderBy: { id: "asc" } }),
    prisma.teacher.count({ where }),
  ]);

  res.json({ data, meta: paginationMeta(query, total) });
});

teacherRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const teacher = await prisma.teacher.findUniqueOrThrow({ where: { id } });
  res.json(teacher);
});

teacherRouter.post("/", async (req, res) => {
  const data = createTeacherSchema.parse(req.body);
  const teacher = await prisma.teacher.create({ data });
  res.status(201).json(teacher);
});

teacherRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = updateTeacherSchema.parse(req.body);
  const teacher = await prisma.teacher.update({ where: { id }, data });
  res.json(teacher);
});

teacherRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await prisma.teacher.delete({ where: { id } });
  res.status(204).end();
});
