import Stripe from 'stripe';
import Booking from '../../model/Booking.model.js';
import Schedule from '../../model/Schedule.model.js';
import { sendError } from '../../helper/Error.helper.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return sendError(res, 404, "Booking not found");

        if (booking.paymentStatus === 'paid') {
            return sendError(res, 400, "Booking is already paid");
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: booking.totalAmount * 100, // Stripe expects amount in cents
            currency: 'pkr', // Adjust currency as needed
            metadata: { bookingId: booking._id.toString() },
            automatic_payment_methods: { enabled: true },
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            amount: booking.totalAmount
        });

    } catch (error) {
        console.error("Stripe Error:", error);
        sendError(res, 500, "Failed to create payment intent");
    }
};

export const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;

        try {
            const booking = await Booking.findById(bookingId);
            if (booking && booking.paymentStatus !== 'paid') {
                booking.paymentStatus = 'paid';
                await booking.save();
                console.log(`Booking ${bookingId} marked as paid.`);
            }
        } catch (dbError) {
            console.error("Database Update Error (Webhook):", dbError);
        }
    } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;

        try {
            await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'failed' });
            console.log(`Booking ${bookingId} marked as failed.`);
        } catch (dbError) {
            console.error("Database Update Error (Webhook):", dbError);
        }
    }

    res.json({ received: true });
};
