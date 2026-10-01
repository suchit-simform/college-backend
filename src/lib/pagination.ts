import { z } from "zod";

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  name: z.string().trim().min(1).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

// Students and teachers can also be filtered by department. Query params are kebab-case,
// so ?department-id= is renamed to departmentId for the handlers
export const memberListQuerySchema = listQuerySchema
  .extend({ "department-id": z.coerce.number().int().positive().optional() })
  .transform(({ "department-id": departmentId, ...query }) => ({ ...query, departmentId }));

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function nameFilter(name?: string) {
  return name ? { name: { contains: name, mode: "insensitive" as const } } : {};
}

export function paginate({ page, limit }: ListQuery) {
  return { skip: (page - 1) * limit, take: limit };
}

export function paginationMeta({ page, limit }: ListQuery, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
