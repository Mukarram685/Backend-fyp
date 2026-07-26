import mongoose from 'mongoose';

const PayoutSchema = new mongoose.Schema(
  {
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      required: true,
      unique: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    recipientNumber: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'transferred', 'failed'],
      default: 'pending'
    },
    scheduledTime: {
      type: Date,
      required: true
    },
    transferredAt: {
      type: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model('Payout', PayoutSchema);
