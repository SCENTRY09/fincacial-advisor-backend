import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Upload, History, Home, Menu, X, BookOpen, PiggyBank } from 'lucide-react';
import NavBar from '../components/NavBar';
import Dashboard from '../components/Dashboard';
import TransactionForm from '../components/TransactionForm';
import ReceiptUpload from '../components/ReceiptUpload';
import TransactionHistory from '../components/TransactionHistory';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import KhataBook from '../components/KhataBook';
import BudgetManager from '../components/BudgetManager';

const ExpenseTracker = () => {
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState(null);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'add', label: 'Add Transaction', icon: Plus },
        { id: 'upload', label: 'Upload Receipt', icon: Upload },
        { id: 'history', label: 'Transaction History', icon: History },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'budget', label: 'Budget Manager', icon: PiggyBank },
        { id: 'khata', label: 'Khata Book', icon: BookOpen },
    ];

    const API = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

    useEffect(() => { fetchData(); }, []);

    const refreshStats = async () => {
        const res = await fetch(`${API}/api/transactions/stats`);
        if (res.ok) setStats(await res.json());
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tRes, sRes, cRes] = await Promise.all([
                fetch(`${API}/api/transactions`),
                fetch(`${API}/api/transactions/stats`),
                fetch(`${API}/api/transactions/categories`)
            ]);
            if (tRes.ok) setTransactions(await tRes.json());
            if (sRes.ok) setStats(await sRes.json());
            if (cRes.ok) setCategories(await cRes.json());
        } catch { setError('Failed to load data'); }
        finally { setLoading(false); }
    };

    const addTransaction = async (data) => {
        const res = await fetch(`${API}/api/transactions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, source: 'manual' })
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed'); }
        const t = await res.json();
        setTransactions(prev => [t, ...prev]);
        await refreshStats();
        return t;
    };

    const updateTransaction = async (id, data) => {
        const res = await fetch(`${API}/api/transactions/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update');
        const updated = await res.json();
        setTransactions(prev => prev.map(t => t._id === id ? updated : t));
        await refreshStats();
        return updated;
    };

    const deleteTransaction = async (id) => {
        const res = await fetch(`${API}/api/transactions/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        setTransactions(prev => prev.filter(t => t._id !== id));
        await refreshStats();
    };

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setActiveTab('add');
        setSidebarOpen(false);
    };

    const addReceiptTransaction = async (data) => {
        const res = await fetch(`${API}/api/transactions/receipt`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, receiptUrl: data.receiptUrl || 'manual-upload', source: 'receipt' })
        });
        if (!res.ok) throw new Error('Failed');
        const t = await res.json();
        setTransactions(prev => [t, ...prev]);
        await refreshStats();
        return t;
    };

    const addMultipleTransactionsFromReceipt = async (data) => {
        const res = await fetch(`${API}/api/transactions/receipt/batch`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiptUrl: 'manual-upload', transactions: data.map(t => ({ ...t, source: 'receipt' })) })
        });
        if (!res.ok) throw new Error('Failed');
        const result = await res.json();
        const newT = Array.isArray(result) ? result : (result.savedTransactions || []);
        setTransactions(prev => [...newT, ...prev]);
        await refreshStats();
        return newT;
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50"><NavBar />
            <div className="flex items-center justify-center h-screen pt-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50"><NavBar />
            <div className="flex items-center justify-center h-screen pt-16">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchData} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Try Again</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="flex pt-16 h-screen">
                {sidebarOpen && <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

                {/* Sidebar */}
                <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    style={{ top: '64px', height: 'calc(100vh - 64px)' }}>
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
                            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                        <nav className="space-y-1 flex-1 overflow-y-auto">
                            {navItems.map(({ id, label, icon: Icon }) => {
                                const isActive = activeTab === id;
                                return (
                                    <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); if (id !== 'add') setEditingTransaction(null); }}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${isActive ? 'bg-green-50 border border-green-200 text-green-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                        <Icon className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-green-600'}`} />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden">
                    <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
                        <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
                        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg bg-white shadow-sm border border-gray-200">
                            <Menu className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>

                    <div className="h-full overflow-y-auto p-4 lg:p-8">
                        <div className="max-w-7xl mx-auto">
                            {activeTab === 'dashboard' && <Dashboard stats={stats} transactions={transactions} />}

                            {activeTab === 'add' && (
                                <TransactionForm
                                    addTransaction={addTransaction}
                                    updateTransaction={updateTransaction}
                                    categories={categories}
                                    editingTransaction={editingTransaction}
                                    onCancelEdit={() => { setEditingTransaction(null); setActiveTab('history'); }}
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
                                    onEditTransaction={handleEditTransaction}
                                    categories={categories}
                                />
                            )}

                            {activeTab === 'analytics' && <AnalyticsDashboard transactions={transactions} stats={stats} />}

                            {activeTab === 'budget' && <BudgetManager />}

                            {activeTab === 'khata' && <KhataBook />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseTracker;
