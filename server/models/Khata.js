const mongoose = require('mongoose');

const KhataEntrySchema = new mongoose.Schema({
    type: { type: String, enum: ['gave', 'got'], required: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, maxlength: 200 },
    date: { type: Date, default: Date.now },
    proofUrl: { type: String, trim: true }   // uploaded proof file path
}, { timestamps: true });

const KhataSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    entries: [KhataEntrySchema]
}, { timestamps: true });

// Virtual: net balance (positive = they owe you, negative = you owe them)
KhataSchema.virtual('balance').get(function () {
    return this.entries.reduce((bal, e) => {
        return e.type === 'gave' ? bal + e.amount : bal - e.amount;
    }, 0);
});

KhataSchema.set('toJSON', { virtuals: true });
KhataSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Khata', KhataSchema);
