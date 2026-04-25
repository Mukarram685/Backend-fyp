import express from "express";
import { getUser, updateUser, changePassword } from "../controller/User/Profile/Profile.contoller.js";


const ProfileRouter = express.Router();

ProfileRouter.get('/getUser/:id', getUser);
ProfileRouter.patch('/updateUser/:id', updateUser);
ProfileRouter.patch('/changePassword/:id', changePassword);

export default ProfileRouter;