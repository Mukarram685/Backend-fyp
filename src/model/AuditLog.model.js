import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    enum: ['Bus', 'Route', 'Schedule', 'Booking', 'Operator', 'Other'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: String
  },
  metadata: {
    type: Object,
    default: {}
  },
  ip: {
    type: String
  }
}, { timestamps: true });

// Index for fast searching by company or operator
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ operatorId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', AuditLogSchema);