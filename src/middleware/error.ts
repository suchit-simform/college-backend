import { Prisma } from "../generated/prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

type ConstraintMeta = { fields?: string[]; index?: string };

// With driver adapters (Prisma 7) the constraint is under driverAdapterError, not meta.target
function uniqueTarget(err: Prisma.PrismaClientKnownRequestError) {
  const meta = err.meta as
    | { target?: unknown; modelName?: string; driverAdapterError?: { cause?: { constraint?: ConstraintMeta } } }
    | undefined;
  if (meta?.target) return String(meta.target);

  const constraint = meta?.driverAdapterError?.cause?.constraint;
  if (constraint?.fields?.length) return constraint.fields.join(", ");
  if (constraint?.index) {
    // Postgres names unique indexes <table>_<columns>_key
    const table = meta?.modelName?.toLowerCase();
    return constraint.index.replace(new RegExp(`^${table}_`), "").replace(/_key$/, "");
  }
  return "field";
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: `Unique constraint failed on ${uniqueTarget(err)}` });
      return;
    }
  }

  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
