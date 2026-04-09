import React, { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign, Tag, FileText, ArrowUpRight, ArrowDownRight, RefreshCw, Save } from 'lucide-react';

const DEFAULT_CATEGORIES = {
    income: ['Salary', 'Freelance', 'Business', 'Investment', 'Bonus', 'Other Income'],
    expense: ['Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Healthcare',
        'Entertainment', 'Shopping', 'Education', 'Travel', 'Insurance', 'Other']
};

const EMPTY_FORM = {
    type: 'expense', amount: '', date: new Date().toISOString().split('T')[0],
    category: '', notes: '', text: '', isRecurring: false, recurringFrequency: 'monthly'
};

const TransactionForm = ({ addTransaction, updateTransaction, categories, editingTransaction, onCancelEdit }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const isEditMode = !!editingTransaction;

    useEffect(() => {
        if (editingTransaction) {
            setForm({
                type: editingTransaction.type,
                amount: editingTransaction.amount,
                date: editingTransaction.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                category: editingTransaction.category,
                notes: editingTransaction.notes || '',
                text: editingTransaction.text,
                isRecurring: editingTransaction.isRecurring || false,
                recurringFrequency: editingTransaction.recurringFrequency || 'monthly'
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editingTransaction]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.text.trim()) return showToast('Please enter a description', 'error');
        if (!form.amount || parseFloat(form.amount) <= 0) return showToast('Please enter a valid amount', 'error');
        if (!form.category) return showToast('Please select a category', 'error');

        setIsSubmitting(true);
        try {
            const payload = { ...form, amount: parseFloat(form.amount) };
            if (isEditMode) {
                await updateTransaction(editingTransaction._id, payload);
                showToast('Transaction updated!');
                onCancelEdit();
            } else {
                await addTransaction(payload);
                showToast('Transaction added!');
                setForm(EMPTY_FORM);
            }
        } catch (err) {
            showToast(err.message || 'Failed. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCategories = categories?.length
        ? categories.filter(c => DEFAULT_CATEGORIES[form.type]?.includes(c))
        : DEFAULT_CATEGORIES[form.type];

    const isIncome = form.type === 'income';

    return (
        <div className="max-w-2xl mx-auto">
            {toast && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {toast.msg}
                </div>
            )}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isEditMode ? 'bg-blue-500' : 'bg-gradient-to-r from-green-500 to-green-600'}`}>
                        {isEditMode ? <Save className="h-8 w-8 text-white" /> : <Plus className="h-8 w-8 text-white" />}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Transaction' : 'Add New Transaction'}</h2>
                    {isEditMode && <p className="text-sm text-blue-600 mt-1">Editing: {editingTransaction.text}</p>}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Type Toggle */}
                    <div className="flex items-center justify-center p-1 bg-gray-100 rounded-lg">
                        <button type="button" onClick={() => set('type', 'expense')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${!isIncome ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                            <ArrowDownRight className="h-4 w-4" /><span>Expense</span>
                        </button>
                        <button type="button" onClick={() => set('type', 'income')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${isIncome ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                            <ArrowUpRight className="h-4 w-4" /><span>Income</span>
                        </button>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2"><FileText className="inline h-4 w-4 mr-1" />Description *</label>
                        <input type="text" value={form.text} onChange={e => set('text', e.target.value)}
                            placeholder={`Enter ${isIncome ? 'income' : 'expense'} description`}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2"><DollarSign className="inline h-4 w-4 mr-1" />Amount (₹) *</label>
                        <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                            placeholder="0.00" step="0.01" min="0.01"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                    </div>

                    {/* Date + Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2"><Calendar className="inline h-4 w-4 mr-1" />Date *</label>
                            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2"><Tag className="inline h-4 w-4 mr-1" />Category *</label>
                            <select value={form.category} onChange={e => set('category', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required>
                                <option value="">Select category</option>
                                {filteredCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2"><FileText className="inline h-4 w-4 mr-1" />Notes (Optional)</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                            placeholder="Add any additional notes..." rows={2}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
                    </div>

                    {/* Recurring Toggle */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Recurring Transaction</span>
                            </div>
                            <button type="button" onClick={() => set('isRecurring', !form.isRecurring)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isRecurring ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isRecurring ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        {form.isRecurring && (
                            <div className="mt-3">
                                <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                                <select value={form.recurringFrequency} onChange={e => set('recurringFrequency', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">This transaction will be auto-added each {form.recurringFrequency === 'weekly' ? 'week' : form.recurringFrequency === 'monthly' ? 'month' : 'year'}.</p>
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        {isEditMode && (
                            <button type="button" onClick={onCancelEdit}
                                className="flex-1 py-3 px-6 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                        )}
                        <button type="submit" disabled={isSubmitting}
                            className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : isEditMode ? 'bg-blue-600 hover:bg-blue-700' : isIncome ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'}`}>
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    <span>{isEditMode ? 'Saving...' : 'Adding...'}</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    {isEditMode ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    <span>{isEditMode ? 'Save Changes' : `Add ${isIncome ? 'Income' : 'Expense'}`}</span>
                                </div>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionForm;
