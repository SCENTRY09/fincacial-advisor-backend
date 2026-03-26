import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Upload, History, Home, Menu, X } from 'lucide-react';
import NavBar from '../components/NavBar';
import Dashboard from '../components/Dashboard';
import TransactionForm from '../components/TransactionForm';
import ReceiptUpload from '../components/ReceiptUpload';
import TransactionHistory from '../components/TransactionHistory';
import AnalyticsDashboard from '../components/AnalyticsDashboard'; // Added import for AnalyticsDashboard

const ExpenseTracker = () => {
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState(null);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Add sidebar state

    // Navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'text-green-600' },
        { id: 'add', label: 'Add Transaction', icon: Plus, color: 'text-green-600' },
        { id: 'upload', label: 'Upload Receipt', icon: Upload, color: 'text-green-600' },
        { id: 'history', label: 'Transaction History', icon: History, color: 'text-green-600' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-green-600' }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const API = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

    const fetchData = async () => {
        try {
            setLoading(true);
            const [transactionsRes, statsRes, categoriesRes] = await Promise.all([
                fetch(`${API}/api/transactions`),
                fetch(`${API}/api/transactions/stats`),
                fetch(`${API}/api/transactions/categories`)
            ]);

            if (transactionsRes.ok) {
                const transactionsData = await transactionsRes.json();
                setTransactions(transactionsData);
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            if (categoriesRes.ok) {
                const categoriesData = await categoriesRes.json();
                setCategories(categoriesData);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const addTransaction = async (transactionData) => {
        try {
            const response = await fetch(`${API}/api/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...transactionData,
                    source: 'manual'
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to add transaction');
            }

            const newTransaction = await response.json();
            setTransactions(prev => [newTransaction, ...prev]);
            
            // Refresh stats
            const statsRes = await fetch(`${API}/api/transactions/stats`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            return newTransaction;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    };

    const addReceiptTransaction = async (transactionData) => {
        try {
            const response = await fetch(`${API}/api/transactions/receipt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...transactionData,
                    receiptUrl: transactionData.receiptUrl || 'manual-upload',
                    source: 'receipt'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add receipt transaction');
            }

            const newTransaction = await response.json();
            setTransactions(prev => [newTransaction, ...prev]);
            
            // Refresh stats
            const statsRes = await fetch(`${API}/api/transactions/stats`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            return newTransaction;
        } catch (error) {
            console.error('Error adding receipt transaction:', error);
            throw error;
        }
    };

    const addMultipleTransactionsFromReceipt = async (transactionsData) => {
        try {
            const response = await fetch(`${API}/api/transactions/receipt/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    receiptUrl: 'manual-upload',
                    transactions: transactionsData.map(t => ({
                        ...t,
                        source: 'receipt'
                    }))
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add multiple transactions');
            }

            const result = await response.json();
            const newTransactions = Array.isArray(result) ? result : (result.savedTransactions || []);
            setTransactions(prev => [...newTransactions, ...prev]);
            
            // Refresh stats
            const statsRes = await fetch(`${API}/api/transactions/stats`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            return newTransactions;
        } catch (error) {
            console.error('Error adding multiple transactions:', error);
            throw error;
        }
    };

    const deleteTransaction = async (id) => {
        try {
            const response = await fetch(`${API}/api/transactions/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            setTransactions(prev => prev.filter(t => t._id !== id));
            
            // Refresh stats
            const statsRes = await fetch(`${API}/api/transactions/stats`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <NavBar />
                <div className="flex items-center justify-center h-screen pt-16"> {/* Add pt-16 */}
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <NavBar />
                <div className="flex items-center justify-center h-screen pt-16"> {/* Add pt-16 */}
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={fetchData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            
            <div className="flex pt-16 h-screen"> {/* Fixed height container */}
                {/* Mobile Menu Overlay */}
                {sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar Navigation - Fixed height */}
                <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`} style={{ top: '64px', height: 'calc(100vh - 64px)' }}>
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                        <nav className="space-y-2 flex-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setSidebarOpen(false); // Close sidebar on mobile
                                        }}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                                            isActive
                                                ? 'bg-green-50 border border-green-200 text-green-700'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <Icon className={`h-5 w-5 ${isActive ? 'text-green-600' : item.color}`} />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Main Content - Scrollable */}
                <div className="flex-1 overflow-hidden">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
                        <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg bg-white shadow-sm border border-gray-200"
                        >
                            <Menu className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="h-full overflow-y-auto p-4 lg:p-8">
                        <div className="max-w-7xl mx-auto">
                            {/* Tab Content */}
                            {activeTab === 'dashboard' && (
                                <Dashboard stats={stats} transactions={transactions} />
                            )}
                            
                            {activeTab === 'add' && (
                                <TransactionForm 
                                    addTransaction={addTransaction} 
                                    categories={categories} 
                                />
                            )}
                            
                            {activeTab === 'upload' && (
                                <ReceiptUpload 
                                    addReceiptTransaction={addReceiptTransaction}
                                    addMultipleTransactionsFromReceipt={addMultipleTransactionsFromReceipt}
                                />
                            )}
                            
                            {activeTab === 'history' && (
                                <TransactionHistory 
                                    transactions={transactions}
                                    onDeleteTransaction={deleteTransaction}
                                    categories={categories}
                                />
                            )}
                            
                            {activeTab === 'analytics' && (
                                <AnalyticsDashboard transactions={transactions} stats={stats} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseTracker;