import express from 'express';
import { triggerPayoutCheck } from '../controller/Payout/Payout.controller.js';
import { protect, authorizeRoles } from '../middleware/Auth.midleware.js';

const router = express.Router();

// Allow Superadmin to manually trigger the payout check
router.post('/trigger', protect, authorizeRoles('superadmin'), triggerPayoutCheck);

export default router;
