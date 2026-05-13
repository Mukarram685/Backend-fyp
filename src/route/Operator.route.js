import express from "express";
import { GetCompanyOperators, UpdateOperatorScope } from "../controller/Auth/Operator.controller.js";
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";
import { ApproveOperator } from "../controller/Auth/ApproveOperator.controller.js";
import { 
  getMyTrips, 
  getTripPassengers, 
  completeTrip,
  startTrip 
} from "../controller/Operator/OperatorTrip.controller.js";
import { validateScope } from "../middleware/RBAC.middleware.js";
import { logActivity } from "../helper/Audit.helper.js";

const OperatorRouter = express.Router();

OperatorRouter.get(
  "/company",
  protect,
  authorizeRoles("companyadmin"),
  GetCompanyOperators
);

// Removed redundant register route - using common /api/v1/register instead

OperatorRouter.put(
  "/approve/:id",
  protect,
  authorizeRoles("companyadmin"),
  ApproveOperator
);

OperatorRouter.put(
  "/scope/:id",
  protect,
  authorizeRoles("companyadmin"),
  UpdateOperatorScope
);

OperatorRouter.get(
  "/my-trips",
  protect,
  authorizeRoles("operator"),
  getMyTrips
);

OperatorRouter.get(
  "/trips/:id/passengers",
  protect,
  authorizeRoles("operator"),
  validateScope("schedule"),
  getTripPassengers
);

OperatorRouter.patch(
  "/trips/:id/start",
  protect,
  authorizeRoles("operator"),
  validateScope("schedule"),
  startTrip
);

OperatorRouter.patch(
  "/trips/:id/complete",
  protect,
  authorizeRoles("operator"),
  validateScope("schedule"),
  completeTrip
);

export default OperatorRouter;
