import express from "express";
import { CreateCompany, ApproveCompany, GetCompanies, GetCompany, deteleCompany } from "../controller/Company/Company.controller.js";
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";

const CompanyRoute = express.Router();

CompanyRoute.use(protect);

CompanyRoute.post("/company-requests", CreateCompany);

CompanyRoute.put("/approve/:id", authorizeRoles("superadmin"), ApproveCompany);

CompanyRoute.get("/list", GetCompanies);

CompanyRoute.get("/one/:id", GetCompany);

CompanyRoute.delete("/delete/:id", authorizeRoles("superadmin"), deteleCompany);

export default CompanyRoute;
