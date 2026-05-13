import express from 'express';
import { protect, authorizeRoles } from '../middleware/Auth.midleware.js';
import {
  createBus,
  getCompanyBuses,
  getBusById,
  updateBus,
  deleteBus,
  getAllActiveBuses
} from '../controller/Bus/Bus.controller.js';
import { validateScope } from '../middleware/RBAC.middleware.js';

const router = express.Router();

router.get('/all', getAllActiveBuses);

router.use(protect);

router.post('/add', authorizeRoles('companyadmin', 'superadmin'), createBus);
router.get('/company', getCompanyBuses);
router.get('/:id', validateScope('bus', 'view'), getBusById);
router.put('/:id', authorizeRoles('companyadmin', 'superadmin'), validateScope('bus', 'manage'), updateBus);
router.delete('/:id', authorizeRoles('companyadmin', 'superadmin'), validateScope('bus', 'manage'), deleteBus);

export default router;