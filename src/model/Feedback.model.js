import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
            default: '',
        },
        description: {
            type: String,
            required: [true, 'Feedback description is required'],
            trim: true,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        status: {
            type: String,
            enum: ['unread', 'read', 'in_progress', 'resolved'],
            default: 'unread',
        },
    },
    { timestamps: true }
);

const Feedback = mongoose.model('Feedback', FeedbackSchema);
export default Feedback;
