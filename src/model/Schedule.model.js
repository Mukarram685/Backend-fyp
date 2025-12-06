// models/Schedule.model.js
import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
  },
  departureDate: {
    type: Date,           // e.g., 2025-04-10
    required: true
  },
  departureTime: {
    type: String,         // "14:30"
    required: true
  },
  arrivalTime: {
    type: String,         // "20:00"
    required: true
  },
  fare: {
    type: Number,
    required: true,
    min: 500
  },
  availableSeats: {
    type: Number,
    required: true
  },
  bookedSeats: [{
    type: Number,
    default: []
  }],
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });


ScheduleSchema.index({ bus: 1, departureDate: 1 }, { unique: true });

export default mongoose.model('Schedule', ScheduleSchema);