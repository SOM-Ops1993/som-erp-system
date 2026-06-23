import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { listEmployees, listPages, listRoleDefaults, getPermissionsByRole, getEmployee, createEmployee, updateEmployee, deleteEmployee, savePermissions, seedDefaultPermissions, listCompanies, upsertCompany, deleteCompany } from "./employees/employees.controller.js";

const HRRouter = express.Router();
const adminOnly = authorize(["admin"]);

// ── Employees ─────────────────────────────────────────────────────────────────
HRRouter.get("/erp/employees/pages", authenticate, listPages);
HRRouter.get("/erp/employees/role-defaults", authenticate, listRoleDefaults);
HRRouter.get("/erp/employees/permissions/:role", authenticate, getPermissionsByRole);
HRRouter.post("/erp/employees/permissions/save", authenticate, adminOnly, savePermissions);
HRRouter.post("/erp/employees/permissions/seed-defaults", authenticate, adminOnly, seedDefaultPermissions);
HRRouter.get("/erp/employees/companies/list", authenticate, listCompanies);
HRRouter.post("/erp/employees/companies", authenticate, adminOnly, upsertCompany);
HRRouter.delete("/erp/employees/companies/:code", authenticate, adminOnly, deleteCompany);
HRRouter.get("/erp/employees/:id", authenticate, getEmployee);
HRRouter.put("/erp/employees/:id", authenticate, updateEmployee);
HRRouter.delete("/erp/employees/:id", authenticate, adminOnly, deleteEmployee);
HRRouter.get("/erp/employees", authenticate, listEmployees);
HRRouter.post("/erp/employees", authenticate, createEmployee);

export default HRRouter;
