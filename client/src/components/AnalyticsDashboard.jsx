import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ArrowUp, ArrowDown } from 'lucide-react';

const API = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
            <p className="font-semibold text-gray-900 mb-1">{label}</p>
            {payload.map((e, i) => (
                <p key={i} style={{ color: e.color }}>
                    {e.name}: ₹{Number(e.value).toLocaleString()}
                </p>
            ))}
        </div>
    );
};

const AnalyticsDashboard = ({ transactions, stats }) => {
    const [timeRange, setTimeRange] = useState('6months');
    const [budgets, setBudgets] = useState([]);
    const currentMonth = new Date().toISOString().slice(0, 7);

    useEffect(() => {
        fetch(`${API}/api/budgets?month=${currentMonth}`)
            .then(r => r.json()).then(setBudgets).catch(() => {});
    }, [currentMonth]);

    const months = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;

    // Monthly chart data
    const chartData = useMemo(() => {
        if (!transactions?.length) return [];
        const now = new Date();
        const map = {};
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            map[key] = { month: key, income: 0, expense: 0, balance: 0 };
        }
        transactions.forEach(t => {
            const d = new Date(t.date);
            const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
            if (diff < months) {
                const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (map[key]) {
                    if (t.type === 'income') map[key].income += t.amount;
                    else map[key].expense += t.amount;
                }
            }
        });
        return Object.values(map).map(m => ({ ...m, balance: m.income - m.expense }));
    }, [transactions, months]);

    // Month-over-month comparison
    const momData = useMemo(() => {
        if (chartData.length < 2) return null;
        const cur = chartData[chartData.length - 1];
        const prev = chartData[chartData.length - 2];
        const incomeChange = prev.income > 0 ? ((cur.income - prev.income) / prev.income) * 100 : 0;
        const expenseChange = prev.expense > 0 ? ((cur.expense - prev.expense) / prev.expense) * 100 : 0;
        return { cur, prev, incomeChange, expenseChange };
    }, [chartData]);

    // Spending forecast (linear regression on last 3 months expenses)
    const forecastData = useMemo(() => {
        if (chartData.length < 3) return [];
        const last3 = chartData.slice(-3);
        const avg = last3.reduce((s, m) => s + m.expense, 0) / 3;
        const trend = (last3[2].expense - last3[0].expense) / 2;
        const now = new Date();
        const forecastMonths = 3;
        const result = [...chartData];
        for (let i = 1; i <= forecastMonths; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            result.push({ month: key, forecast: Math.max(avg + trend * i, 0), income: null, expense: null });
        }
        return result;
    }, [chartData]);

    // Category breakdown
    const categoryData = useMemo(() => {
        if (!transactions?.length) return [];
        const map = {};
        transactions.forEach(t => { if (t.type === 'expense') map[t.category] = (map[t.category] || 0) + t.amount; });
        return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
    }, [transactions]);

    // Budget vs Actual (current month)
    const budgetVsActual = useMemo(() => {
        if (!budgets.length) return [];
        return budgets.map(b => ({
            category: b.category.split(' ')[0], // shorten label
            budget: b.monthlyLimit,
            actual: b.spent,
            over: b.spent > b.monthlyLimit
        }));
    }, [budgets]);

    const MoMCard = ({ label, value, change, color }) => (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>₹{value?.toLocaleString()}</p>
            {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm mt-1 ${change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    <span>{Math.abs(change).toFixed(1)}% vs last month</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-500 mt-1">Visual insights into your financial patterns</p>
                </div>
                <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm">
                    <option value="3months">Last 3 Months</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="12months">Last 12 Months</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MoMCard label="Total Income" value={stats?.totalIncome} color="text-green-600" />
                <MoMCard label="Total Expenses" value={stats?.totalExpense} color="text-red-600" />
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-sm text-gray-500">Savings Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{stats?.savingsRate ? `${(stats.savingsRate * 100).toFixed(1)}%` : '0%'}</p>
                    <p className="text-xs text-gray-400 mt-1">{transactions?.length || 0} total transactions</p>
                </div>
            </div>

            {/* Month-over-Month Comparison */}
            {momData && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Month-over-Month Comparison</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Last Month Income</p>
                            <p className="font-bold text-green-600">₹{momData.prev.income.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                            <p className="text-xs text-gray-500 mb-1">This Month Income</p>
                            <p className="font-bold text-green-700">₹{momData.cur.income.toLocaleString()}</p>
                            <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${momData.incomeChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {momData.incomeChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {Math.abs(momData.incomeChange).toFixed(1)}%
                            </div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Last Month Expense</p>
                            <p className="font-bold text-red-500">₹{momData.prev.expense.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs text-gray-500 mb-1">This Month Expense</p>
                            <p className="font-bold text-red-600">₹{momData.cur.expense.toLocaleString()}</p>
                            <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${momData.expenseChange <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {momData.expenseChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {Math.abs(momData.expenseChange).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Income vs Expense + Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="income" fill="#10B981" name="Income" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Spending Forecast */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Spending Forecast</h3>
                    <p className="text-xs text-gray-400 mb-4">Projected next 3 months based on trend</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} name="Actual" dot={{ r: 3 }} connectNulls={false} />
                                <Line type="monotone" dataKey="forecast" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" name="Forecast" dot={{ r: 3 }} connectNulls={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Budget vs Actual */}
            {budgetVsActual.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Budget vs Actual — {currentMonth}</h3>
                    <p className="text-xs text-gray-400 mb-4">Red bars indicate over-budget categories</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetVsActual} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="category" stroke="#9ca3af" tick={{ fontSize: 11 }} width={70} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="budget" fill="#10B981" name="Budget" radius={[0, 3, 3, 0]} />
                                <Bar dataKey="actual" name="Actual" radius={[0, 3, 3, 0]}
                                    fill="#EF4444"
                                    label={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Category Pie + Balance Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense by Category</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="amount"
                                    label={({ category, percent }) => `${category.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}>
                                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Amount']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                                <Area type="monotone" dataKey="balance" stroke="#10B981" fill="#10B981" fillOpacity={0.2} name="Balance" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-1">Top Spending</h4>
                        <p className="text-blue-700 text-sm">{categoryData[0]?.category || 'No data'} — ₹{categoryData[0]?.amount?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-1">Best Month</h4>
                        <p className="text-green-700 text-sm">
                            {chartData.reduce((best, m) => m.balance > best.balance ? m : best, { balance: -Infinity, month: 'No data' }).month}
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-1">Avg Monthly Expense</h4>
                        <p className="text-purple-700 text-sm">₹{stats?.averageMonthlyExpense?.toLocaleString() || '0'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
