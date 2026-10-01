import express from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import { errorHandler, notFound } from "./middleware/error";
import { departmentRouter } from "./modules/department/department.routes";
import { studentRouter } from "./modules/student/student.routes";
import { teacherRouter } from "./modules/teacher/teacher.routes";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/docs.json", (_req, res) => {
  res.json(openApiSpec);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/departments", departmentRouter);
app.use("/api/students", studentRouter);
app.use("/api/teachers", teacherRouter);

app.use(notFound);
app.use(errorHandler);
