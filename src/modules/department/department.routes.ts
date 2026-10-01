import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { idParamSchema, listQuerySchema, nameFilter, paginate, paginationMeta } from "../../lib/pagination";

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1),
});

const updateDepartmentSchema = createDepartmentSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const departmentRouter = Router();

departmentRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where = nameFilter(query.name);

  const [data, total] = await prisma.$transaction([
    prisma.department.findMany({ where, ...paginate(query), orderBy: { id: "asc" } }),
    prisma.department.count({ where }),
  ]);

  res.json({ data, meta: paginationMeta(query, total) });
});

departmentRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const department = await prisma.department.findUniqueOrThrow({ where: { id } });
  res.json(department);
});

departmentRouter.post("/", async (req, res) => {
  const data = createDepartmentSchema.parse(req.body);
  const department = await prisma.department.create({ data });
  res.status(201).json(department);
});

departmentRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = updateDepartmentSchema.parse(req.body);
  const department = await prisma.department.update({ where: { id }, data });
  res.json(department);
});

// Fails with 409 while students or teachers still belong to the department (onDelete: Restrict)
departmentRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await prisma.department.delete({ where: { id } });
  res.status(204).end();
});
