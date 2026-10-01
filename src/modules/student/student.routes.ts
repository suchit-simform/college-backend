import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { idParamSchema, memberListQuerySchema, nameFilter, paginate, paginationMeta } from "../../lib/pagination";

const createStudentSchema = z.object({
  name: z.string().trim().min(1),
  enrollmentNumber: z.string().trim().min(1),
  departmentId: z.number().int().positive(),
});

const updateStudentSchema = createStudentSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

// Return the department alongside its id
const include = { department: true };

export const studentRouter = Router();

studentRouter.get("/", async (req, res) => {
  const query = memberListQuerySchema.parse(req.query);
  const where = { ...nameFilter(query.name), departmentId: query.departmentId };

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

studentRouter.post("/", async (req, res) => {
  const data = createStudentSchema.parse(req.body);
  const student = await prisma.student.create({ data, include });
  res.status(201).json(student);
});

studentRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = updateStudentSchema.parse(req.body);
  const student = await prisma.student.update({ where: { id }, data, include });
  res.json(student);
});

studentRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await prisma.student.delete({ where: { id } });
  res.status(204).end();
});
