import express from 'express'
import { ApproveUser, RegisterUser, SignInUser, UpdateUser, RefreshToken, LogoutUser } from '../controller/Auth/User.controller.js';
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";

const UserRouter = express.Router();


UserRouter.post('/register', RegisterUser);
UserRouter.post('/login', SignInUser);
UserRouter.post('/refresh-token', RefreshToken);
UserRouter.post('/logout', protect, LogoutUser);
UserRouter.put('/update/:id', UpdateUser);
UserRouter.put(
  "/approve/:id",
  protect,
  authorizeRoles("superadmin", "companyadmin"),
  ApproveUser
);


export default UserRouter;

