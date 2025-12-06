import express from 'express';
import { authorizeRoles, protect } from '../middleware/Auth.midleware.js';
import { createSchedule, getCompanySchedules, searchSchedules } from '../controller/Schedule.controller.js';

const router = express.Router();

router.get('/search', searchSchedules);


router.use(protect);

router.post('/create', authorizeRoles('operator', 'companyadmin'), createSchedule);
router.get('/company', getCompanySchedules);

export default router;