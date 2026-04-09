const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
    category: { type: String, required: true, trim: true },
    monthlyLimit: { type: Number, required: true, min: 1 },
    month: { type: String, required: true } // format: "YYYY-MM"
}, { timestamps: true });

BudgetSchema.index({ category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
