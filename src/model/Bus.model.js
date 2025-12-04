import mongoose from 'mongoose';

const BusSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['AC', 'Non-AC', 'Sleeper', 'Semi-Sleeper', 'Luxury'],
    required: true
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 20,
    max: 60
  },
  seatLayout: {
    type: String,
    enum: ['2x2', '2x1', '3x2', 'sleeper'],
    default: '2x2'
  },
  amenities: [{
    type: String,
    enum: ['WiFi', 'Charging Port', 'TV', 'Blanket', 'Water', 'Snacks']
  }],
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  }
}, { timestamps: true });

BusSchema.index({ busNumber: 1, company: 1 }, { unique: true });

export default mongoose.model('Bus', BusSchema);