const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Get all budgets for the logged-in user for a given month, with actual spending
exports.getBudgets = async (req, res) => {
    try {
        const userId = req.user._id;
        const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

        // Fetch only this user's budgets for the month
        const budgets = await Budget.find({ userId, month });

        const [year, mon] = month.split('-').map(Number);
        const start = new Date(year, mon - 1, 1);
        const end = new Date(year, mon, 0, 23, 59, 59);

        // Fetch only this user's expenses in the date range
        const expenses = await Transaction.find({
            userId,
            type: 'expense',
            date: { $gte: start, $lte: end }
        });

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
        console.error('getBudgets error:', err.message);
        res.status(500).json({ message: 'Failed to fetch budgets' });
    }
};

// Set (upsert) a budget for the logged-in user
exports.setBudget = async (req, res) => {
    try {
        const userId = req.user._id;
        const { category, monthlyLimit, month } = req.body;

        if (!category || !monthlyLimit || !month) {
            return res.status(400).json({ message: 'category, monthlyLimit, month required' });
        }

        // Upsert scoped to this user
        const budget = await Budget.findOneAndUpdate(
            { userId, category, month },
            { userId, monthlyLimit },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(budget);
    } catch (err) {
        console.error('setBudget error:', err.message);
        res.status(500).json({ message: 'Failed to set budget' });
    }
};

// Delete a budget — only if it belongs to the logged-in user
exports.deleteBudget = async (req, res) => {
    try {
        const deleted = await Budget.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });
        if (!deleted) return res.status(404).json({ message: 'Budget not found' });
        res.json({ message: 'Budget deleted' });
    } catch (err) {
        console.error('deleteBudget error:', err.message);
        res.status(500).json({ message: 'Failed to delete budget' });
    }
};
