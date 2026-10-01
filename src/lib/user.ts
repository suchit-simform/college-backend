import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";

// Students and teachers keep their names on the linked user
export const userFieldsSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

// Return the user and department alongside their ids
export const memberInclude = { user: true, department: true } as const;

// Every word must match the first or last name, so "ada love" finds "Ada Lovelace"
export function userNameFilter(name?: string) {
  if (!name) return {};
  const words = name.split(/\s+/).filter(Boolean);
  return {
    user: {
      AND: words.map((word) => ({
        OR: [
          { firstName: { contains: word, mode: "insensitive" as const } },
          { lastName: { contains: word, mode: "insensitive" as const } },
        ],
      })),
    },
  };
}

// user_department mirrors the member's department: replace the user's row with the new one
export async function setUserDepartment(tx: Prisma.TransactionClient, userId: number, departmentId: number) {
  await tx.userDepartment.deleteMany({ where: { userId } });
  await tx.userDepartment.create({ data: { userId, departmentId } });
}
