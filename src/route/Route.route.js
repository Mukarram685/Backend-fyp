<<<<<<< HEAD
import express from 'express';
import { protect, authorizeRoles } from '../middleware/Auth.midleware.js';
import {
  createRoute,
  getCompanyRoutes,
  getRouteById,
  updateRoute,
  deleteRoute
} from '../controller/Route/Route.controller.js';
import { validateScope } from '../middleware/RBAC.middleware.js';

const BusRoute = express.Router();

BusRoute.use(protect);

BusRoute.use(authorizeRoles('companyadmin', 'superadmin'));

BusRoute.post('/createRoute', createRoute);
BusRoute.get('/allRoutes', getCompanyRoutes);
BusRoute.get('/getRouteByCompany/:id', validateScope('route', 'view'), getRouteById);
BusRoute.patch('/updateRoute/:id', validateScope('route', 'manage'), updateRoute);
BusRoute.delete('/deleteRoute/:id', validateScope('route', 'manage'), deleteRoute);

=======
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

>>>>>>> 6cd5ccecbe2dd260873edaf9dbf5f315b9bd5afa
export default BusRoute;