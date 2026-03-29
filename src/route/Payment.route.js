import express from 'express';
import { protect } from '../middleware/Auth.midleware.js';
import { createPaymentIntent, stripeWebhook } from '../controller/Payment/Payment.controller.js';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.post('/create-intent', protect, createPaymentIntent);

export default router;
