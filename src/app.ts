import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import { errorHandler, notFound } from "./middleware/error";
import { v1Router } from "./routes/v1";

export const app = express();

// Comma-separated list of browser origins allowed to call the API; defaults to the
// college-frontend dev server (5173) and its Docker container (8080)
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins.includes("*") ? "*" : corsOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/docs.json", (_req, res) => {
  res.json(openApiSpec);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/v1", v1Router);

app.use(notFound);
app.use(errorHandler);
