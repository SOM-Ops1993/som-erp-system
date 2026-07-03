import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { listEmployees, listPages, listRoleDefaults, getPermissionsByRole, getEmployee, listCompanies } from "./get/employees.controller.js";
import { createEmployee, savePermissions, seedDefaultPermissions, upsertCompany } from "./create/employees.controller.js";
import { updateEmployee } from "./update/employees.controller.js";
import { deleteEmployee, deleteCompany } from "./delete/employees.controller.js";

const EmployeesRouter = express.Router();
const adminOnly = authorize(["admin"]);

// ── Employees ─────────────────────────────────────────────────────────────────
EmployeesRouter.get("/employees/pages", authenticate, listPages);
EmployeesRouter.get("/employees/role-defaults", authenticate, listRoleDefaults);
EmployeesRouter.get("/employees/permissions/:role", authenticate, getPermissionsByRole);
EmployeesRouter.post("/employees/permissions/save", authenticate, adminOnly, savePermissions);
EmployeesRouter.post("/employees/permissions/seed-defaults", authenticate, adminOnly, seedDefaultPermissions);
EmployeesRouter.get("/employees/companies/list", authenticate, listCompanies);
EmployeesRouter.post("/employees/companies", authenticate, adminOnly, upsertCompany);
EmployeesRouter.delete("/employees/companies/:code", authenticate, adminOnly, deleteCompany);
EmployeesRouter.get("/employees/:id", authenticate, getEmployee);
EmployeesRouter.put("/employees/:id", authenticate, adminOnly, updateEmployee);
EmployeesRouter.delete("/employees/:id", authenticate, adminOnly, deleteEmployee);
EmployeesRouter.get("/employees", authenticate, listEmployees);
EmployeesRouter.post("/employees", authenticate, adminOnly, createEmployee);

export default EmployeesRouter;
