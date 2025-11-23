import express from "express";
import { CreateCompany, ApproveCompany } from "../controller/Company.controller.js";
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";

const CompanyRoute = express.Router();

CompanyRoute.post("/create", protect, authorizeRoles("superadmin"), CreateCompany);

CompanyRoute.put("/approve/:id", protect, authorizeRoles("superadmin"), ApproveCompany);

export default CompanyRoute;
