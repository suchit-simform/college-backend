import express from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import { errorHandler, notFound } from "./middleware/error";
import { v1Router } from "./routes/v1";

export const app = express();

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
