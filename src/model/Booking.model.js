import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
    schedule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule',
        required: true
    },
    passenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seats: [{
        seatNumber: { type: Number, required: true },
        passengerName: { type: String, required: true },
        passengerCNIC: { type: String, required: true },
        passengerPhone: { type: String, required: true },
        gender: { type: String, enum: ['Male', 'Female'], required: true }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    pnr: {
        type: String,
        unique: true
    }, // Ticket number
    bookingStatus: {
        type: String,
        enum: ['confirmed', 'cancelled'],
        default: 'confirmed'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    bookingStatus: {
        type: String,
        enum: ['confirmed', 'cancelled', 'refunded'],
        default: 'confirmed'
    },
    cancelledAt: {
        type: Date
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    cancellationReason: {
        type: String
    }
}, { timestamps: true });

BookingSchema.pre('save', function (next) {
    if (!this.pnr) {
        this.pnr = 'TKT' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    }
    next();
});

export default mongoose.model('Booking', BookingSchema);