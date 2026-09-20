import express from "express";
import {
  CreateCompany,
  ApproveCompany,
  GetCompanies,
  GetCompany,
  ChangeCompanyPassword,
  deteleCompany,
} from "../controller/Company/Company.controller.js";
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";

const CompanyRoute = express.Router();

CompanyRoute.post("/company-requests", CreateCompany);

CompanyRoute.use(protect);

CompanyRoute.put("/approve/:id", authorizeRoles("superadmin"), ApproveCompany);
CompanyRoute.put("/status/:id", authorizeRoles("superadmin"), ApproveCompany);

CompanyRoute.put("/change-password/:id", authorizeRoles("superadmin", "companyadmin"), ChangeCompanyPassword);

CompanyRoute.get("/list", GetCompanies);

CompanyRoute.get("/one/:id", GetCompany);

CompanyRoute.delete("/delete/:id", authorizeRoles("superadmin"), deteleCompany);

export default CompanyRoute;