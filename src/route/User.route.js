import express from 'express'
import { RegisterUser, SignInUser, UpdateUser } from '../controller/User.controller.js';


const Router = express.Router();


Router.post('/register', RegisterUser);
Router.post('/login', SignInUser);
Router.put('/update/:id', UpdateUser);


export default Router;

