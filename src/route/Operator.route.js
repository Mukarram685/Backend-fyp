import express from "express";
import { RegisterOperator } from "../controller/Operator.controller.js";
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";
import { ApproveOperator } from "../controller/ApproveOperator.controller.js";

const OperatorRouter = express.Router();

OperatorRouter.post(
  "/register",
  protect,
  authorizeRoles("companyadmin"),
  RegisterOperator
);


OperatorRouter.put(
  "/approve/:id",
  protect,
  authorizeRoles("companyadmin"),
  ApproveOperator
);

export default OperatorRouter;
