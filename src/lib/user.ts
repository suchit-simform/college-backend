import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";

// Students and teachers keep their names on the linked user
export const userFieldsSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

// Departments are linked through user_department, so a member can belong to several (duplicates dropped)
export const departmentIdsSchema = z
  .array(z.number().int().positive())
  .min(1)
  .transform((ids) => [...new Set(ids)]);

// Load the user and its departments alongside the member
export const memberInclude = {
  user: { include: { departments: { include: { department: true }, orderBy: { departmentId: "asc" } } } },
} as const;

type MemberRow = {
  user: { departments: { department: { id: number; name: string } }[] };
};

// Flatten user.departments[].department into a top-level departments list
export function toMember<T extends MemberRow>({ user: { departments, ...user }, ...member }: T) {
  return { ...member, user, departments: departments.map((d) => d.department) };
}

// Every word must match the first or last name, so "ada love" finds "Ada Lovelace".
// With a departmentId, only users linked to that department through user_department match
export function memberFilter({ name, departmentId }: { name?: string; departmentId?: number }) {
  const words = name?.split(/\s+/).filter(Boolean) ?? [];
  const conditions: Prisma.UserWhereInput[] = words.map((word) => ({
    OR: [
      { firstName: { contains: word, mode: "insensitive" } },
      { lastName: { contains: word, mode: "insensitive" } },
    ],
  }));
  if (departmentId !== undefined) conditions.push({ departments: { some: { departmentId } } });
  return conditions.length ? { user: { AND: conditions } } : {};
}

export function departmentLinks(departmentIds: number[]) {
  return { createMany: { data: departmentIds.map((departmentId) => ({ departmentId })) } };
}

// Replace the user's user_department rows with the given departments
export async function setUserDepartments(tx: Prisma.TransactionClient, userId: number, departmentIds: number[]) {
  await tx.userDepartment.deleteMany({ where: { userId } });
  await tx.userDepartment.createMany({ data: departmentIds.map((departmentId) => ({ userId, departmentId })) });
}
