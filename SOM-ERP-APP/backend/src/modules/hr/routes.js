import express from "express";
import EmployeesRouter from "./employees/router.js";

const HRRouter = express.Router();
HRRouter.use("/", EmployeesRouter);

export default HRRouter;
