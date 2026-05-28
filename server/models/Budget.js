const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
    // User relationship — each budget belongs to exactly one user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    category: { type: String, required: true, trim: true },
    monthlyLimit: { type: Number, required: true, min: 1 },
    month: { type: String, required: true } // format: "YYYY-MM"
}, { timestamps: true });

// Unique budget per user per category per month
BudgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
