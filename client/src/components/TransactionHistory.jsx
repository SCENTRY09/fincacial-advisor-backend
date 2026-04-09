import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, Download, Trash2, Edit, RefreshCw, FileText } from 'lucide-react';

const TransactionHistory = ({ transactions, onDeleteTransaction, onEditTransaction, categories }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSource, setSelectedSource] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);

    const itemsPerPage = 10;

    const toggleCategory = (cat) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
        setCurrentPage(1);
    };

    const filteredTransactions = useMemo(() => {
        let filtered = transactions || [];

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.text.toLowerCase().includes(q) ||
                t.category.toLowerCase().includes(q) ||
                t.notes?.toLowerCase().includes(q)
            );
        }
        if (selectedType !== 'all') filtered = filtered.filter(t => t.type === selectedType);
        if (selectedCategories.length > 0) filtered = filtered.filter(t => selectedCategories.includes(t.category));
        if (selectedSource !== 'all') filtered = filtered.filter(t => t.source === selectedSource);
        if (dateRange.start) filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRange.start));
        if (dateRange.end) filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRange.end + 'T23:59:59'));

        filtered = [...filtered].sort((a, b) => {
            let av, bv;
            if (sortBy === 'amount') { av = a.amount; bv = b.amount; }
            else if (sortBy === 'category') { av = a.category; bv = b.category; }
            else { av = new Date(a.date); bv = new Date(b.date); }
            return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });

        return filtered;
    }, [transactions, searchTerm, selectedType, selectedCategories, selectedSource, dateRange, sortBy, sortOrder]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

    const handleSort = (field) => {
        if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        else { setSortBy(field); setSortOrder('desc'); }
    };

    const clearFilters = () => {
        setSearchTerm(''); setSelectedType('all'); setSelectedCategories([]);
        setSelectedSource('all'); setDateRange({ start: '', end: '' }); setCurrentPage(1);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this transaction?')) {
            try { await onDeleteTransaction(id); }
            catch { alert('Failed to delete'); }
        }
    };

    // CSV Export
    const exportCSV = () => {
        const rows = [
            ['Date', 'Type', 'Amount', 'Category', 'Description', 'Notes', 'Source', 'Recurring'],
            ...filteredTransactions.map(t => [
                new Date(t.date).toLocaleDateString('en-IN'),
                t.type, t.amount, t.category, t.text, t.notes || '', t.source,
                t.isRecurring ? t.recurringFrequency : 'No'
            ])
        ].map(r => r.map(v => `"${v}"`).join(',')).join('\n');

        const blob = new Blob([rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // PDF Export (print-based)
    const exportPDF = () => {
        const html = `
            <html><head><title>Transactions</title>
            <style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f4f6}
            .income{color:#16a34a}.expense{color:#dc2626}</style></head>
            <body><h2>Transaction History — ${new Date().toLocaleDateString('en-IN')}</h2>
            <table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Description</th><th>Notes</th></tr></thead>
            <tbody>${filteredTransactions.map(t => `
                <tr><td>${new Date(t.date).toLocaleDateString('en-IN')}</td>
                <td class="${t.type}">${t.type}</td>
                <td class="${t.type}">${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString()}</td>
                <td>${t.category}</td><td>${t.text}</td><td>${t.notes || ''}</td></tr>`).join('')}
            </tbody></table></body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html); w.document.close(); w.print();
    };

    const SortIcon = ({ field }) => sortBy === field ? <span className="ml-1 text-gray-400">{sortOrder === 'asc' ? '↑' : '↓'}</span> : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
                    <p className="text-gray-600 mt-1">{filteredTransactions.length} of {transactions?.length || 0} transactions</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={exportCSV} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Download className="h-4 w-4 mr-1" /> CSV
                    </button>
                    <button onClick={exportPDF} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <FileText className="h-4 w-4 mr-1" /> PDF
                    </button>
                    <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Filter className="h-4 w-4 mr-1" /> Filters {selectedCategories.length > 0 && <span className="ml-1 bg-green-500 text-white text-xs rounded-full px-1.5">{selectedCategories.length}</span>}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Search transactions..." value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={selectedType} onChange={e => { setSelectedType(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="all">All Types</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                            <select value={selectedSource} onChange={e => { setSelectedSource(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="all">All Sources</option>
                                <option value="manual">Manual</option>
                                <option value="receipt">Receipt</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                            <input type="date" value={dateRange.start}
                                onChange={e => { setDateRange(p => ({ ...p, start: e.target.value })); setCurrentPage(1); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                            <input type="date" value={dateRange.end}
                                onChange={e => { setDateRange(p => ({ ...p, end: e.target.value })); setCurrentPage(1); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                        </div>
                    </div>

                    {/* Multi-category chips */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Categories (multi-select)</label>
                        <div className="flex flex-wrap gap-2">
                            {(categories || []).map(cat => (
                                <button key={cat} onClick={() => toggleCategory(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedCategories.includes(cat) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 underline">Clear all filters</button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                                    <div className="flex items-center"><Calendar className="h-3 w-3 mr-1" />Date<SortIcon field="date" /></div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
                                    Amount<SortIcon field="amount" />
                                </th>
                                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('category')}>
                                    Category<SortIcon field="category" />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTransactions.length > 0 ? paginatedTransactions.map((t, i) => (
                                <tr key={t._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                        {new Date(t.date).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {t.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                        <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{t.category}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        <div className="font-medium">{t.text}</div>
                                        {t.notes && <div className="text-xs text-gray-400 mt-0.5">{t.notes}</div>}
                                        {t.isRecurring && (
                                            <span className="inline-flex items-center gap-1 text-xs text-purple-600 mt-0.5">
                                                <RefreshCw className="h-3 w-3" />{t.recurringFrequency}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => onEditTransaction(t)} className="text-gray-400 hover:text-blue-600 transition" title="Edit">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(t._id)} className="text-gray-400 hover:text-red-600 transition" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <div className="text-4xl mb-3">📋</div>
                                        <p className="font-medium">No transactions found</p>
                                        <p className="text-sm">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                        <p className="text-sm text-gray-700">
                            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                        </p>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                                className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1 border rounded text-sm ${p === currentPage ? 'bg-green-600 text-white border-green-600' : 'hover:bg-gray-50'}`}>{p}</button>
                            ))}
                            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;
