import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

const API = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

const EXPENSE_CATEGORIES = ['Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Healthcare',
    'Entertainment', 'Shopping', 'Education', 'Travel', 'Insurance', 'Other'];

export default function BudgetManager() {
    const [budgets, setBudgets] = useState([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [form, setForm] = useState({ category: '', monthlyLimit: '' });
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchBudgets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/budgets?month=${month}`);
            setBudgets(await res.json());
        } catch { showToast('Failed to load budgets', 'error'); }
        finally { setLoading(false); }
    }, [month, showToast]);

    useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

    const saveBudget = async () => {
        if (!form.category || !form.monthlyLimit || form.monthlyLimit <= 0)
            return showToast('Select a category and enter a valid limit', 'error');
        try {
            const res = await fetch(`${API}/api/budgets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, monthlyLimit: Number(form.monthlyLimit), month })
            });
            if (!res.ok) throw new Error();
            setForm({ category: '', monthlyLimit: '' });
            fetchBudgets();
            showToast('Budget saved!');
        } catch { showToast('Failed to save budget', 'error'); }
    };

    const deleteBudget = async (id) => {
        await fetch(`${API}/api/budgets/${id}`, { method: 'DELETE' });
        setBudgets(prev => prev.filter(b => b._id !== id));
        showToast('Budget removed');
    };

    const usedCategories = budgets.map(b => b.category);
    const availableCategories = EXPENSE_CATEGORIES.filter(c => !usedCategories.includes(c));

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {toast && (
                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Budget Manager</h2>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Add Budget Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Set Category Budget</h3>
                <div className="flex gap-3 flex-wrap">
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                        className="flex-1 min-w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500">
                        <option value="">Select category</option>
                        {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="Monthly limit (₹)" value={form.monthlyLimit}
                        onChange={e => setForm(p => ({ ...p, monthlyLimit: e.target.value }))}
                        className="flex-1 min-w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                    <button onClick={saveBudget}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                        <Plus className="h-4 w-4" /> Set Budget
                    </button>
                </div>
            </div>

            {/* Budget List */}
            {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
            ) : budgets.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg">No budgets set for {month}</p>
                    <p className="text-sm mt-1">Add a category budget above to start tracking.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {budgets.map(b => {
                        const pct = b.percentage;
                        const isOver = pct >= 100;
                        const isWarning = pct >= 80 && pct < 100;
                        return (
                            <div key={b._id} className={`bg-white border rounded-xl p-4 shadow-sm ${isOver ? 'border-red-300' : isWarning ? 'border-yellow-300' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {isOver ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
                                            isWarning ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                                                <CheckCircle className="h-4 w-4 text-green-500" />}
                                        <span className="font-semibold text-gray-900">{b.category}</span>
                                        {isOver && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Over Budget!</span>}
                                        {isWarning && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Near Limit</span>}
                                    </div>
                                    <button onClick={() => deleteBudget(b._id)} className="text-gray-300 hover:text-red-400 transition">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Spent: <strong className={isOver ? 'text-red-600' : 'text-gray-900'}>₹{b.spent.toLocaleString()}</strong></span>
                                    <span>Limit: <strong>₹{b.monthlyLimit.toLocaleString()}</strong></span>
                                    <span>Remaining: <strong className={b.remaining < 0 ? 'text-red-600' : 'text-green-600'}>₹{b.remaining.toLocaleString()}</strong></span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className={`h-2.5 rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-400' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <p className="text-xs text-gray-400 mt-1 text-right">{pct.toFixed(1)}% used</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
