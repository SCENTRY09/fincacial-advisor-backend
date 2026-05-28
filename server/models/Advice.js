const mongoose = require('mongoose');

const AdviceSchema = new mongoose.Schema({
    // User relationship — links every advice record to its owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },

    // The raw form data the user submitted when requesting advice
    inputData: {
        type: Object,
        required: [true, 'Input data is required']
    },

    // The full AI-generated advice text
    generatedAdvice: {
        type: String,
        required: [true, 'Generated advice is required']
    },

    // Risk profile assessed from the input (e.g. "low", "medium", "high")
    riskScore: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: null
    },

    // Numeric financial health score (0–100)
    financialScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },

    // User feedback on the quality of the advice
    feedback: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
        default: 'neutral'
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index — fetch all advice for a user sorted by newest first
AdviceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Advice', AdviceSchema);
