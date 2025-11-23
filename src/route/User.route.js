import express from 'express'
import { ApproveUser, RegisterUser, SignInUser, UpdateUser } from '../controller/User.controller.js';
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";

const Router = express.Router();


Router.post('/register', RegisterUser);
Router.post('/login', SignInUser);
Router.put('/update/:id', UpdateUser);
Router.put(
  "/approve/:id",
  protect,
  authorizeRoles("superadmin", "companyadmin"),
  ApproveUser
);


export default Router;

