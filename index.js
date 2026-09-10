import 'dotenv/config';
import express from 'express';
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import ConnectDB from './src/DB/Connection.js';
import UserRouter from './src/route/User.route.js';
import CompanyRouter from './src/route/Company.route.js';
import OperatorRouter from './src/route/Operator.route.js';
import BusRouter from './src/route/Bus.route.js';
import BusRoute from './src/route/Route.route.js';
import ScheduleRouter from './src/route/Schedule.route.js';
import BookingRouter from './src/route/Booking.route.js';
import PaymentRouter from './src/route/Payment.route.js';
import PayoutRouter from './src/route/Payout.route.js';
import ProfileRouter from './src/route/Profile.route.js';
import FeedbackRouter from './src/route/Feedback.route.js';
import NotificationRouter from './src/route/Notification.route.js';
import { stripeWebhook } from './src/controller/Payment/Payment.controller.js';
import { processAutomaticPayouts } from './src/controller/Payout/Payout.controller.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './src/config/swagger.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (needed for rate-limiting on Vercel/proxies/load balancers)
app.set('trust proxy', 1);

// Enable CORS as the first middleware to handle all preflight and regular requests
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

if (!process.env.MONGO_URL) {
    console.warn("WARNING: MONGO_URL environment variable is missing. Database queries will fail.");
}

console.log(`Server initializing... NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Configure helmet without blocking Swagger UI assets
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(morgan('dev'));
app.use(compression());

// Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/api-docs') || req.path.startsWith('/docs') || req.path === '/health' || req.path === '/swagger.json'
});
app.use('/api/', limiter);

// Stripe Webhook (Raw Body must be parsed BEFORE express.json)
app.post('/api/v1/payment/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger CDN Assets for 100% Reliability on Vercel/Serverless/Local
const SWAGGER_CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.min.css";
const SWAGGER_JS_BUNDLE = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.min.js";
const SWAGGER_JS_STANDALONE = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-standalone-preset.min.js";

const swaggerOptions = {
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 24px 0 }
        .swagger-ui .info .title { color: #4f46e5; }
        .swagger-ui .btn.authorize { background: #4f46e5; color: white; border-color: #4f46e5; }
    `,
    customCssUrl: SWAGGER_CSS_URL,
    customJs: [
        SWAGGER_JS_BUNDLE,
        SWAGGER_JS_STANDALONE
    ],
    customSiteTitle: "BookNGo API Documentation"
};

// Raw Swagger JSON endpoint
app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDocument);
});

// Standalone Direct CDN HTML Swagger UI (Guaranteed to load anywhere)
app.get('/api-docs-ui', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BookNGo API Documentation</title>
  <link rel="stylesheet" href="${SWAGGER_CSS_URL}" />
  <style>
    body { margin: 0; padding: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 24px 0; }
    .swagger-ui .info .title { color: #4f46e5; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_JS_BUNDLE}"></script>
  <script src="${SWAGGER_JS_STANDALONE}"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(swaggerDocument)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`);
});

// Standard Swagger UI Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Health Check Endpoint
app.get(['/health', '/api/health'], (req, res) => {
    res.status(200).json({
        status: "healthy",
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? "connected" : "connecting/disconnected",
        timestamp: new Date().toISOString()
    });
});

// Root Landing Page
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <div style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 650px; margin: 0 auto;">
            <h1 style="color: #4f46e5;">🚌 BookNGo Backend API</h1>
            <p>The enterprise bus booking logistics and ticketing API service is online and operational.</p>
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <a href="/api-docs" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">Interactive API Docs (Swagger)</a>
                <a href="/health" style="display: inline-block; background: #f3f4f6; color: #111827; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">System Health</a>
            </div>
        </div>
    `);
});

// Middleware to ensure DB connection is ready before executing API routes (Critical for Serverless/Vercel)
app.use(async (req, res, next) => {
    if (req.path === '/' || req.path.startsWith('/api-docs') || req.path.startsWith('/docs') || req.path === '/health' || req.path === '/api/health' || req.path === '/swagger.json' || req.path === '/api-docs-ui') {
        return next();
    }
    try {
        await ConnectDB();
        next();
    } catch (err) {
        console.error("DB connection error in request middleware:", err.message);
        return res.status(503).json({
            success: false,
            message: "Database connection failed. Please ensure MONGO_URL environment variable is properly configured on deployment.",
            error: err.message
        });
    }
});

// API Routes
app.use('/api/v1/operator', OperatorRouter);
app.use('/api/v1/companies', CompanyRouter);
app.use('/api/v1/routes', BusRoute);
app.use('/api/v1/buses', BusRouter);
app.use('/api/v1/schedules', ScheduleRouter);
app.use('/api/v1/bookings', BookingRouter);
app.use('/api/v1/payment', PaymentRouter);
app.use('/api/v1/payout', PayoutRouter);
app.use('/api/v1', UserRouter);
app.use('/', UserRouter);
app.use('/api/v1/profile', ProfileRouter);
app.use('/api/v1/feedback', FeedbackRouter);
app.use('/api/v1/feedbacks', FeedbackRouter);
app.use('/feedback', FeedbackRouter);
app.use('/api/v1/notifications', NotificationRouter);
app.use('/notifications', NotificationRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Express Error Handler:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Run automatic payout engine check in background (only when in standalone node server)
if (!process.env.VERCEL) {
    setInterval(processAutomaticPayouts, 5 * 60 * 1000);
    setTimeout(processAutomaticPayouts, 10000);
}

// Start standalone server
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
    });
}

export default app;
