import { Router } from "express";
import { departmentRouter } from "../modules/department/department.routes";
import { studentRouter } from "../modules/student/student.routes";
import { teacherRouter } from "../modules/teacher/teacher.routes";

// Every module router is mounted here, so all of them are served under /api/v1
export const v1Router = Router();

v1Router.use("/departments", departmentRouter);
v1Router.use("/students", studentRouter);
v1Router.use("/teachers", teacherRouter);
