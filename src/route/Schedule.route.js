import express from 'express';
import { authorizeRoles, protect } from '../middleware/Auth.midleware.js';
import { createSchedule, getCompanySchedules, searchSchedules, updateSchedule } from '../controller/Schedule/Schedule.controller.js';

const router = express.Router();

router.get('/search', searchSchedules);


router.use(protect);

router.post('/create', authorizeRoles('superadmin', 'companyadmin', 'operator'), createSchedule);
router.get('/company', authorizeRoles('superadmin', 'companyadmin', 'operator'), getCompanySchedules);
router.put('/update/:id', authorizeRoles('superadmin', 'companyadmin', 'operator'), updateSchedule);
router.put('/:id', authorizeRoles('superadmin', 'companyadmin', 'operator'), updateSchedule);

export default router;