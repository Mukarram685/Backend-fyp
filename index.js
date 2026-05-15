import 'dotenv/config';
import express from 'express'
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import ConnectDB from './src/DB/Connection.js';
import Router from './src/route/User.route.js';
import CompanyRouter from './src/route/Company.route.js';
import OperatorRouter from './src/route/Operator.route.js';
import BusRouter from './src/route/Bus.route.js';
import BusRoute from './src/route/Route.route.js';
import ScheduleRouter from './src/route/Schedule.route.js';
import BookingRouter from './src/route/Booking.route.js';
import PaymentRouter from './src/route/Payment.route.js';
const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URL) {
    console.warn("WARNING: MONGO_URL environment variable is missing. Database connection will fail.");
}

console.log(`Server initializing... NODE_ENV: ${process.env.NODE_ENV}`);

app.use(helmet());

app.use(morgan('dev'));
app.use(compression());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

import { stripeWebhook } from './src/controller/Payment/Payment.controller.js';
import ProfileRouter from './src/route/Profile.route.js';
app.post('/api/v1/payment/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

ConnectDB();

app.get('/', (req, res) => {
    res.send('Welcome to the Bus Booking API');
});

app.use('/api/v1/operator', OperatorRouter);
app.use('/api/v1/companies', CompanyRouter);
app.use('/api/v1/routes', BusRoute);
app.use('/api/v1/buses', BusRouter);
app.use('/api/v1/schedules', ScheduleRouter);
app.use('/api/v1/bookings', BookingRouter);
app.use('/api/v1/payment', PaymentRouter);
app.use('/api/v1', Router);
app.use('/api/v1/profile', ProfileRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
//     app.listen(PORT, () => {
//         console.log(`Server is running on port ${PORT}`);
//     });
// }

export default app;
