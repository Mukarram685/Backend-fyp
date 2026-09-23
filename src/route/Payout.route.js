import express from 'express';
import { 
  triggerPayoutCheck,
  getPayoutsList,
  getPayoutStats,
  processManualSchedulePayout
} from '../controller/Payout/Payout.controller.js';
import { protect, authorizeRoles } from '../middleware/Auth.midleware.js';

const router = express.Router();

router.use(protect);

// Listing and statistics (Superadmin & Company Admin)
router.get('/list', authorizeRoles('superadmin', 'companyadmin'), getPayoutsList);
router.get('/stats', authorizeRoles('superadmin', 'companyadmin'), getPayoutStats);

// Manual and automated controls (Superadmin only)
router.post('/trigger', authorizeRoles('superadmin'), triggerPayoutCheck);
router.post('/process/:scheduleId', authorizeRoles('superadmin'), processManualSchedulePayout);

export default router;
