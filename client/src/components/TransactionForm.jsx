import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, Tag, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DEFAULT_CATEGORIES = {
    income: ['Salary', 'Freelance', 'Business', 'Investment', 'Bonus', 'Other Income'],
    expense: ['Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Healthcare',
        'Entertainment', 'Shopping', 'Education', 'Travel', 'Insurance', 'Other']
};

const TransactionForm = ({ addTransaction, categories }) => {
    const [transactionInfo, setTransactionInfo] = useState({
        type: 'expense',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        notes: '',
        text: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field, value) => {
        setTransactionInfo(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!transactionInfo.text.trim()) {
            alert('Please enter a description');
            return;
        }
        if (!transactionInfo.amount || parseFloat(transactionInfo.amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!transactionInfo.category) {
            alert('Please select a category');
            return;
        }

        setIsSubmitting(true);
        
        try {
            await addTransaction({
                ...transactionInfo,
                amount: parseFloat(transactionInfo.amount),
                date: transactionInfo.date || new Date().toISOString().split('T')[0]
            });
            
            // Reset form
            setTransactionInfo({
                type: 'expense',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                category: '',
                notes: '',
                text: ''
            });
            
            alert('Transaction added successfully!');
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert(`Failed to add transaction: ${error.message || 'Please try again.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCategories = categories && categories.length > 0
        ? categories.filter(cat => DEFAULT_CATEGORIES[transactionInfo.type]?.includes(cat))
        : DEFAULT_CATEGORIES[transactionInfo.type];

    const isIncome = transactionInfo.type === 'income';

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gradient-to-r from-green-500 to-green-600">
                        <Plus className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Add New Transaction</h2>
                    <p className="text-gray-600 mt-2">Enter the details of your transaction</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Transaction Type Toggle */}
                    <div className="flex items-center justify-center p-1 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            onClick={() => handleChange('type', 'expense')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                !isIncome 
                                    ? 'bg-white text-red-600 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <ArrowDownRight className="h-4 w-4" />
                            <span>Expense</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleChange('type', 'income')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                isIncome 
                                    ? 'bg-white text-green-600 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <ArrowUpRight className="h-4 w-4" />
                            <span>Income</span>
                        </button>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FileText className="inline h-4 w-4 mr-1" />
                            Description *
                        </label>
                        <input
                            type="text"
                            value={transactionInfo.text}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder={`Enter ${isIncome ? 'income' : 'expense'} description`}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                            required
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <DollarSign className="inline h-4 w-4 mr-1" />
                            Amount (₹) *
                        </label>
                        <input
                            type="number"
                            value={transactionInfo.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                            required
                        />
                    </div>

                    {/* Date and Category Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Date *
                            </label>
                            <input
                                type="date"
                                value={transactionInfo.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Tag className="inline h-4 w-4 mr-1" />
                                Category *
                            </label>
                            <select
                                value={transactionInfo.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                                required
                            >
                                <option value="">Select category</option>
                                {filteredCategories.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FileText className="inline h-4 w-4 mr-1" />
                            Notes (Optional)
                        </label>
                        <textarea
                            value={transactionInfo.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Add any additional notes..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
                            isSubmitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : isIncome
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                        }`}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Adding Transaction...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center space-x-2">
                                <Plus className="h-4 w-4" />
                                <span>Add {isIncome ? 'Income' : 'Expense'}</span>
                            </div>
                        )}
                    </button>
                </form>

                {/* Quick Tips */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Quick Tips</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Use clear, descriptive names for better tracking</li>
                        <li>• Categorize transactions accurately for better insights</li>
                        <li>• Add notes for important transactions</li>
                        <li>• Regular categorization helps with financial planning</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TransactionForm;