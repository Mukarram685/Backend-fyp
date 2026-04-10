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

const router = express.Router();

router.get('/all', getAllActiveBuses);

router.use(protect);

router.post('/add', authorizeRoles('companyadmin', 'operator'), createBus);
router.get('/company', getCompanyBuses);
router.get('/:id', getBusById);
router.put('/:id', authorizeRoles('companyadmin', 'operator'), updateBus);
router.delete('/:id', authorizeRoles('companyadmin', 'operator'), deleteBus);

export default router;