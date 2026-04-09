const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Get all budgets for a month with actual spending
exports.getBudgets = async (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
        const budgets = await Budget.find({ month });

        const [year, mon] = month.split('-').map(Number);
        const start = new Date(year, mon - 1, 1);
        const end = new Date(year, mon, 0, 23, 59, 59);

        const expenses = await Transaction.find({ type: 'expense', date: { $gte: start, $lte: end } });

        const spendingMap = {};
        expenses.forEach(t => {
            spendingMap[t.category] = (spendingMap[t.category] || 0) + t.amount;
        });

        const result = budgets.map(b => ({
            _id: b._id,
            category: b.category,
            monthlyLimit: b.monthlyLimit,
            month: b.month,
            spent: spendingMap[b.category] || 0,
            remaining: b.monthlyLimit - (spendingMap[b.category] || 0),
            percentage: Math.min(((spendingMap[b.category] || 0) / b.monthlyLimit) * 100, 100)
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch budgets' });
    }
};

// Set (upsert) a budget
exports.setBudget = async (req, res) => {
    try {
        const { category, monthlyLimit, month } = req.body;
        if (!category || !monthlyLimit || !month) return res.status(400).json({ message: 'category, monthlyLimit, month required' });

        const budget = await Budget.findOneAndUpdate(
            { category, month },
            { monthlyLimit },
            { upsert: true, new: true }
        );
        res.json(budget);
    } catch (err) {
        res.status(500).json({ message: 'Failed to set budget' });
    }
};

// Delete a budget
exports.deleteBudget = async (req, res) => {
    try {
        await Budget.findByIdAndDelete(req.params.id);
        res.json({ message: 'Budget deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete budget' });
    }
};
