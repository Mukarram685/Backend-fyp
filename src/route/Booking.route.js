import express from 'express';
import { authorizeRoles, protect } from '../middleware/Auth.midleware.js';
import { bookSeats, getCompanyBookings, getRouteBookings, getScheduleBookings, myBookings } from '../controller/Booking.controller.js';

const router = express.Router();

router.use(protect);

router.post('/book', bookSeats)
.get('/my', myBookings);


router.get('/schedule/:scheduleId', authorizeRoles('operator', 'companyadmin', 'superadmin'), getScheduleBookings);
router.get('/route/:routeId', authorizeRoles('companyadmin', 'operator', 'superadmin'), getRouteBookings);
router.get('/company/all', authorizeRoles('companyadmin', 'superadmin'), getCompanyBookings);

export default router;