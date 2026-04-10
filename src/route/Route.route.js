import express from 'express';
import { protect, authorizeRoles } from '../middleware/Auth.midleware.js';
import {
  createRoute,
  getCompanyRoutes,
  getRouteById,
  updateRoute,
  deleteRoute
} from '../controller/Route/Route.controller.js';

const BusRoute = express.Router();

BusRoute.use(protect);

BusRoute.use(authorizeRoles('companyadmin', 'operator'));

BusRoute.post('/createRoute', createRoute);
BusRoute.get('/allRoutes', getCompanyRoutes);
BusRoute.get('/getRouteByCompany/:id', getRouteById);
BusRoute.patch('/updateRoute/:id', updateRoute);
BusRoute.delete('/deleteRoute/:id', deleteRoute);

export default BusRoute;