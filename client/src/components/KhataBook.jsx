import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, TrendingUp, TrendingDown, Users, Paperclip, X, FileText, Eye, CheckCircle, MessageCircle, Share2, RefreshCw, Search, Edit2, Check } from 'lucide-react';

const API = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

export default function KhataBook() {
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);
    const [showAddParty, setShowAddParty] = useState(false);
    const [showAddEntry, setShowAddEntry] = useState(null);
    const [partyForm, setPartyForm] = useState({ name: '', phone: '' });
    const [entryForm, setEntryForm] = useState({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [viewProof, setViewProof] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [showLedgerFilter, setShowLedgerFilter] = useState(false);
    const [ledgerFilter, setLedgerFilter] = useState({ search: '', type: 'all', dateFrom: '', dateTo: '' });
    const fileInputRef = useRef(null);
    
    // NEW: Party list enhancements
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('updated'); // 'name' | 'balance' | 'updated'
    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'receive' | 'pay' | 'settled'
    const [editingParty, setEditingParty] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', phone: '' });

    useEffect(() => { fetchParties(); }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchParties = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/khata`);
            setParties(await res.json());
        } catch { showToast('Failed to load', 'error'); }
        finally { setLoading(false); }
    };

    const fetchParty = async (id) => {
        const res = await fetch(`${API}/api/khata/${id}`);
        setSelectedParty(await res.json());
        setLedgerFilter({ search: '', type: 'all', dateFrom: '', dateTo: '' });
        setShowLedgerFilter(false);
    };

    const createParty = async () => {
        if (!partyForm.name.trim()) return;
        const res = await fetch(`${API}/api/khata`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partyForm)
        });
        const data = await res.json();
        setParties(prev => [data, ...prev]);
        setPartyForm({ name: '', phone: '' });
        setShowAddParty(false);
        showToast('Party added!');
    };

    const deleteParty = async (id) => {
        if (!window.confirm('Delete this party and all entries?')) return;
        await fetch(`${API}/api/khata/${id}`, { method: 'DELETE' });
        setParties(prev => prev.filter(p => p._id !== id));
        if (selectedParty?._id === id) setSelectedParty(null);
        showToast('Party deleted');
    };

    // NEW: Update party name/phone
    const updateParty = async (id) => {
        if (!editForm.name.trim()) return showToast('Name required', 'error');
        const res = await fetch(`${API}/api/khata/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
        });
        const updated = await res.json();
        setParties(prev => prev.map(p => p._id === id ? updated : p));
        if (selectedParty?._id === id) setSelectedParty(updated);
        setEditingParty(null);
        showToast('Party updated!');
    };

    const addEntry = async () => {
        if (!entryForm.amount || entryForm.amount <= 0) return showToast('Enter a valid amount', 'error');
        const formData = new FormData();
        formData.append('type', showAddEntry);
        formData.append('amount', entryForm.amount);
        formData.append('note', entryForm.note);
        formData.append('date', entryForm.date);
        if (proofFile) formData.append('proof', proofFile);

        const res = await fetch(`${API}/api/khata/${selectedParty._id}/entries`, { method: 'POST', body: formData });
        const updated = await res.json();
        setSelectedParty(updated);
        setParties(prev => prev.map(p => p._id === updated._id ? updated : p));
        setEntryForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
        clearProof(); setShowAddEntry(null);
        showToast('Entry added!');
    };

    const deleteEntry = async (entryId) => {
        const res = await fetch(`${API}/api/khata/${selectedParty._id}/entries/${entryId}`, { method: 'DELETE' });
        const updated = await res.json();
        setSelectedParty(updated);
        setParties(prev => prev.map(p => p._id === updated._id ? updated : p));
        showToast('Entry deleted');
    };

    // Mark as settled — add a "got" entry equal to remaining balance
    const markSettled = async () => {
        const balance = selectedParty.balance;
        if (balance === 0) return showToast('Already settled!');
        if (!window.confirm(`Mark ₹${Math.abs(balance).toLocaleString()} as settled?`)) return;

        const formData = new FormData();
        formData.append('type', balance > 0 ? 'got' : 'gave');
        formData.append('amount', Math.abs(balance));
        formData.append('note', 'Settled ✓');
        formData.append('date', new Date().toISOString().split('T')[0]);

        const res = await fetch(`${API}/api/khata/${selectedParty._id}/entries`, { method: 'POST', body: formData });
        const updated = await res.json();
        setSelectedParty(updated);
        setParties(prev => prev.map(p => p._id === updated._id ? updated : p));
        showToast('Marked as settled!');
    };

    // WhatsApp reminder
    const sendWhatsAppReminder = () => {
        const balance = selectedParty.balance;
        if (!selectedParty.phone) return showToast('No phone number for this party', 'error');
        const msg = balance > 0
            ? `Hi ${selectedParty.name}, you have a pending payment of ₹${balance.toLocaleString()} to me. Please settle at your earliest convenience.`
            : `Hi ${selectedParty.name}, I owe you ₹${Math.abs(balance).toLocaleString()}. I'll settle it soon.`;
        const phone = selectedParty.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // Apply ledger filters to entries
    const getFilteredEntries = (entries) => {
        let result = [...entries];
        const { search, type, dateFrom, dateTo } = ledgerFilter;
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(e => (e.note || '').toLowerCase().includes(q));
        }
        if (type !== 'all') result = result.filter(e => e.type === type);
        if (dateFrom) result = result.filter(e => new Date(e.date) >= new Date(dateFrom));
        if (dateTo) result = result.filter(e => new Date(e.date) <= new Date(dateTo + 'T23:59:59'));
        return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    // Share / Print ledger — uses filtered entries
    const shareLedger = () => {
        const filteredEntries = getFilteredEntries(selectedParty.entries);
        const filteredBalance = filteredEntries.reduce((bal, e) => e.type === 'gave' ? bal + e.amount : bal - e.amount, 0);
        const { dateFrom, dateTo, type, search } = ledgerFilter;
        const periodLabel = dateFrom || dateTo
            ? `Period: ${dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN') : 'Start'} → ${dateTo ? new Date(dateTo).toLocaleDateString('en-IN') : 'Today'}`
            : 'All Time';
        const html = `
            <html><head><title>Ledger — ${selectedParty.name}</title>
            <style>body{font-family:sans-serif;padding:20px;font-size:13px}
            h2{margin-bottom:4px}p.sub{color:#666;margin-bottom:4px}
            p.filter{color:#555;font-size:11px;margin-bottom:16px;background:#f9fafb;padding:6px 10px;border-radius:4px;display:inline-block}
            table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}
            th{background:#f3f4f6}.gave{color:#dc2626}.got{color:#16a34a}
            .balance{font-size:18px;font-weight:bold;margin-top:16px}
            .summary{margin-top:12px;font-size:12px;color:#555}</style></head>
            <body>
            <h2>Ledger: ${selectedParty.name}</h2>
            <p class="sub">${selectedParty.phone || ''} | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
            <p class="filter">📅 ${periodLabel}${type !== 'all' ? ` &nbsp;|&nbsp; Type: ${type}` : ''}${search ? ` &nbsp;|&nbsp; Search: "${search}"` : ''} &nbsp;|&nbsp; ${filteredEntries.length} entries</p>
            <table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Note</th></tr></thead>
            <tbody>${filteredEntries.map(e => `
                <tr><td>${new Date(e.date).toLocaleDateString('en-IN')}</td>
                <td class="${e.type}">${e.type === 'gave' ? 'You Gave' : 'You Got'}</td>
                <td class="${e.type}">${e.type === 'gave' ? '-' : '+'}₹${e.amount.toLocaleString()}</td>
                <td>${e.note || ''}</td></tr>`).join('')}
            </tbody></table>
            <p class="balance" style="color:${filteredBalance >= 0 ? '#dc2626' : '#16a34a'}">
                Net Balance (filtered): ${filteredBalance >= 0 ? `${selectedParty.name} owes you` : 'You owe'} ₹${Math.abs(filteredBalance).toLocaleString()}
            </p>
            <p class="summary">Total Gave: ₹${filteredEntries.filter(e=>e.type==='gave').reduce((s,e)=>s+e.amount,0).toLocaleString()} &nbsp;|&nbsp; Total Got: ₹${filteredEntries.filter(e=>e.type==='got').reduce((s,e)=>s+e.amount,0).toLocaleString()}</p>
            </body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html); w.document.close(); w.print();
    };

    const handleProofChange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        setProofFile(file);
        setProofPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf');
    };

    const clearProof = () => {
        setProofFile(null); setProofPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // NEW: Get last transaction date for a party
    const getLastTransactionDate = (party) => {
        if (!party.entries || party.entries.length === 0) return null;
        const sorted = [...party.entries].sort((a, b) => new Date(b.date) - new Date(a.date));
        return sorted[0].date;
    };

    // NEW: Filter, search, and sort parties
    const getFilteredParties = () => {
        let result = [...parties];
        
        // Filter by tab
        if (filterTab === 'receive') result = result.filter(p => p.balance > 0);
        else if (filterTab === 'pay') result = result.filter(p => p.balance < 0);
        else if (filterTab === 'settled') result = result.filter(p => p.balance === 0);
        
        // Search by name or phone
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(q) || 
                (p.phone && p.phone.includes(q))
            );
        }
        
        // Sort
        if (sortBy === 'name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'balance') {
            result.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        } else if (sortBy === 'updated') {
            result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
        
        return result;
    };

    const filteredParties = getFilteredParties();

    const totalGave = parties.reduce((s, p) => s + Math.max(p.balance, 0), 0);
    const totalGot = parties.reduce((s, p) => s + Math.abs(Math.min(p.balance, 0)), 0);

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" /></div>;

    // ── Party Detail View ──
    if (selectedParty) {
        const balance = selectedParty.balance;
        const sortedEntries = getFilteredEntries(selectedParty.entries);
        const lf = ledgerFilter;
        const hasFilter = lf.search || lf.type !== 'all' || lf.dateFrom || lf.dateTo;

        return (
            <div className="max-w-2xl mx-auto">
                {toast && <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{toast.msg}</div>}

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setSelectedParty(null)} className="p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">{selectedParty.name}</h2>
                        {selectedParty.phone && <p className="text-sm text-gray-500">{selectedParty.phone}</p>}
                    </div>
                    {/* Action icons */}
                    <div className="flex gap-2">
                        {selectedParty.phone && (
                            <button onClick={sendWhatsAppReminder} title="Send WhatsApp reminder"
                                className="p-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600">
                                <MessageCircle className="h-5 w-5" />
                            </button>
                        )}
                        <button onClick={() => setShowLedgerFilter(v => !v)} title="Filter / Search ledger"
                            className={`p-2 rounded-full transition ${showLedgerFilter || hasFilter ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}>
                            <Share2 className="h-5 w-5" />
                        </button>
                        {balance !== 0 && (
                            <button onClick={markSettled} title="Mark as settled"
                                className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600">
                                <CheckCircle className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Ledger Filter Panel */}
                {showLedgerFilter && (
                    <div className="bg-white border border-blue-100 rounded-xl p-4 mb-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-800 text-sm">Filter & Search Ledger</h3>
                            {hasFilter && (
                                <button onClick={() => setLedgerFilter({ search: '', type: 'all', dateFrom: '', dateTo: '' })}
                                    className="text-xs text-red-500 hover:underline">Clear filters</button>
                            )}
                        </div>

                        {/* Search by note */}
                        <input type="text" placeholder="Search by note..." value={lf.search}
                            onChange={e => setLedgerFilter(p => ({ ...p, search: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

                        {/* Type filter */}
                        <div className="flex gap-2 mb-2">
                            {['all', 'gave', 'got'].map(t => (
                                <button key={t} onClick={() => setLedgerFilter(p => ({ ...p, type: t }))}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                                        lf.type === t
                                            ? t === 'gave' ? 'bg-red-500 text-white border-red-500'
                                                : t === 'got' ? 'bg-green-600 text-white border-green-600'
                                                : 'bg-gray-700 text-white border-gray-700'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                    }`}>
                                    {t === 'all' ? 'All' : t === 'gave' ? 'You Gave' : 'You Got'}
                                </button>
                            ))}
                        </div>

                        {/* Date range */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                <input type="date" value={lf.dateFrom}
                                    onChange={e => setLedgerFilter(p => ({ ...p, dateFrom: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                <input type="date" value={lf.dateTo}
                                    onChange={e => setLedgerFilter(p => ({ ...p, dateTo: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                        </div>

                        {/* Quick date presets */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {[
                                { label: 'This Month', fn: () => { const n = new Date(); setLedgerFilter(p => ({ ...p, dateFrom: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], dateTo: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0] })); } },
                                { label: 'Last Month', fn: () => { const n = new Date(); setLedgerFilter(p => ({ ...p, dateFrom: new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().split('T')[0], dateTo: new Date(n.getFullYear(), n.getMonth(), 0).toISOString().split('T')[0] })); } },
                                { label: 'Last 3 Months', fn: () => { const n = new Date(); setLedgerFilter(p => ({ ...p, dateFrom: new Date(n.getFullYear(), n.getMonth() - 3, 1).toISOString().split('T')[0], dateTo: n.toISOString().split('T')[0] })); } },
                                { label: 'This Year', fn: () => { const n = new Date(); setLedgerFilter(p => ({ ...p, dateFrom: `${n.getFullYear()}-01-01`, dateTo: `${n.getFullYear()}-12-31` })); } },
                            ].map(({ label, fn }) => (
                                <button key={label} onClick={fn}
                                    className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50 text-gray-600 transition">
                                    {label}
                                </button>
                            ))}
                        </div>

                        <button onClick={shareLedger}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
                            <Share2 className="h-4 w-4" /> Print / Share Filtered Ledger ({sortedEntries.length} entries)
                        </button>
                    </div>
                )}

                {/* Active filter summary badge */}
                {hasFilter && !showLedgerFilter && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                        <span>🔍 Filtered: {sortedEntries.length} of {selectedParty.entries.length} entries</span>
                        <button onClick={() => setLedgerFilter({ search: '', type: 'all', dateFrom: '', dateTo: '' })} className="ml-auto text-blue-500 hover:text-blue-700">✕ Clear</button>
                    </div>
                )}

                {/* Balance Card */}
                <div className={`rounded-xl p-5 mb-4 text-white ${balance === 0 ? 'bg-gray-500' : balance > 0 ? 'bg-red-500' : 'bg-green-600'}`}>
                    <p className="text-sm opacity-80">{balance === 0 ? 'All Settled ✓' : balance > 0 ? 'Will give you' : 'You will give'}</p>
                    <p className="text-3xl font-bold mt-1">₹{Math.abs(balance).toLocaleString()}</p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => setShowAddEntry('gave')}
                        className="py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold hover:bg-red-100 transition">
                        + You Gave
                    </button>
                    <button onClick={() => setShowAddEntry('got')}
                        className="py-3 rounded-xl bg-green-50 border border-green-200 text-green-600 font-semibold hover:bg-green-100 transition">
                        + You Got
                    </button>
                </div>

                {/* Add Entry Form */}
                {showAddEntry && (
                    <div className={`rounded-xl border p-4 mb-4 ${showAddEntry === 'gave' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                        <h3 className={`font-semibold mb-3 ${showAddEntry === 'gave' ? 'text-red-600' : 'text-green-600'}`}>
                            {showAddEntry === 'gave' ? 'You Gave' : 'You Got'}
                        </h3>
                        <input type="number" placeholder="Amount (₹)" value={entryForm.amount}
                            onChange={e => setEntryForm(p => ({ ...p, amount: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                        <input type="text" placeholder="Note (optional)" value={entryForm.note}
                            onChange={e => setEntryForm(p => ({ ...p, note: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                        <input type="date" value={entryForm.date}
                            onChange={e => setEntryForm(p => ({ ...p, date: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />

                        {/* Proof Attachment */}
                        <div className="mb-3">
                            {!proofPreview ? (
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 w-full hover:border-gray-400 transition">
                                    <Paperclip className="h-4 w-4" /> Attach Proof (image / PDF)
                                </button>
                            ) : (
                                <div className="relative inline-block">
                                    {proofPreview === 'pdf' ? (
                                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                                            <FileText className="h-4 w-4 text-red-500" />{proofFile?.name}
                                        </div>
                                    ) : (
                                        <img src={proofPreview} alt="proof" className="h-16 w-24 object-cover rounded-lg border border-gray-200" />
                                    )}
                                    <button onClick={clearProof} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" className="hidden" onChange={handleProofChange} />
                        </div>

                        <div className="flex gap-2">
                            <button onClick={addEntry} className={`flex-1 py-2 rounded-lg text-white font-semibold ${showAddEntry === 'gave' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}>Save</button>
                            <button onClick={() => { setShowAddEntry(null); clearProof(); }} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Entries List */}
                <div className="space-y-2">
                    {sortedEntries.length === 0 && <p className="text-center text-gray-400 py-8">No entries yet.</p>}
                    {sortedEntries.map(entry => (
                        <div key={entry._id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-10 rounded-full ${entry.type === 'gave' ? 'bg-red-400' : 'bg-green-500'}`} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                                            {entry.note || (entry.type === 'gave' ? 'You gave' : 'You got')}
                                            {entry.note === 'Settled ✓' && <CheckCircle className="h-3 w-3 text-green-500" />}
                                        </p>
                                        <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-base ${entry.type === 'gave' ? 'text-red-500' : 'text-green-600'}`}>
                                        {entry.type === 'gave' ? '-' : '+'}₹{entry.amount.toLocaleString()}
                                    </span>
                                    {entry.proofUrl && (
                                        <button onClick={() => setViewProof(`${API}/${entry.proofUrl}`)} className="text-blue-400 hover:text-blue-600" title="View proof">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button onClick={() => deleteEntry(entry._id)} className="text-gray-300 hover:text-red-400 transition">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {entry.proofUrl && entry.proofUrl.match(/\.(jpg|jpeg|png)$/i) && (
                                <div className="mt-2 ml-5">
                                    <img src={`${API}/${entry.proofUrl}`} alt="proof"
                                        className="h-14 w-20 object-cover rounded-lg border border-gray-200 cursor-pointer"
                                        onClick={() => setViewProof(`${API}/${entry.proofUrl}`)} />
                                </div>
                            )}
                            {entry.proofUrl && entry.proofUrl.endsWith('.pdf') && (
                                <div className="mt-2 ml-5">
                                    <a href={`${API}/${entry.proofUrl}`} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                                        <FileText className="h-3 w-3" /> View PDF Proof
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Proof Lightbox */}
                {viewProof && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={() => setViewProof(null)}>
                        <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setViewProof(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow">
                                <X className="h-5 w-5 text-gray-700" />
                            </button>
                            <img src={viewProof} alt="proof" className="w-full rounded-xl shadow-xl" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Party List View ──
    return (
        <div className="max-w-2xl mx-auto">
            {toast && <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{toast.msg}</div>}

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-red-500" /><span className="text-xs text-red-500 font-medium">Total You'll Get</span></div>
                    <p className="text-2xl font-bold text-red-600">₹{totalGave.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-green-600" /><span className="text-xs text-green-600 font-medium">Total You'll Give</span></div>
                    <p className="text-2xl font-bold text-green-600">₹{totalGot.toLocaleString()}</p>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-bold text-gray-900">Parties ({filteredParties.length})</h2>
                </div>
                <button onClick={() => setShowAddParty(true)}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                    <Plus className="h-4 w-4" /> Add Party
                </button>
            </div>

            {/* NEW: Search Bar */}
            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
            </div>

            {/* NEW: Filter Tabs */}
            <div className="flex gap-2 mb-3 overflow-x-auto">
                {[
                    { key: 'all', label: 'All', count: parties.length },
                    { key: 'receive', label: 'To Receive', count: parties.filter(p => p.balance > 0).length },
                    { key: 'pay', label: 'To Pay', count: parties.filter(p => p.balance < 0).length },
                    { key: 'settled', label: 'Settled', count: parties.filter(p => p.balance === 0).length }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilterTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                            filterTab === tab.key
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* NEW: Sort Dropdown */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">Sort by:</span>
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                    <option value="updated">Last Updated</option>
                    <option value="name">Name</option>
                    <option value="balance">Balance</option>
                </select>
            </div>

            {/* Add Party Form */}
            {showAddParty && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3">New Party</h3>
                    <input type="text" placeholder="Name *" value={partyForm.name}
                        onChange={e => setPartyForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <input type="tel" placeholder="Phone (for WhatsApp reminders)" value={partyForm.phone}
                        onChange={e => setPartyForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <div className="flex gap-2">
                        <button onClick={createParty} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">Add</button>
                        <button onClick={() => { setShowAddParty(false); setPartyForm({ name: '', phone: '' }); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                    </div>
                </div>
            )}

            {/* Party List */}
            <div className="space-y-2">
                {filteredParties.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{searchQuery || filterTab !== 'all' ? 'No parties match your filters' : 'No parties yet. Add your first party to start tracking.'}</p>
                    </div>
                )}
                {filteredParties.map(party => {
                    const isEditing = editingParty === party._id;
                    const lastTxnDate = getLastTransactionDate(party);
                    const entryCount = party.entries?.length || 0;
                    
                    return (
                        <div key={party._id}
                            className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:border-green-200 hover:shadow-md transition">
                            <div className="flex items-center gap-3 flex-1" onClick={() => !isEditing && fetchParty(party._id)} style={{ cursor: isEditing ? 'default' : 'pointer' }}>
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm relative">
                                    {party.name.charAt(0).toUpperCase()}
                                    {/* NEW: Entry count badge */}
                                    {entryCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                            {entryCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    {isEditing ? (
                                        <div className="space-y-1" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                                placeholder="Name"
                                            />
                                            <input
                                                type="tel"
                                                value={editForm.phone}
                                                onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                                                className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                                                placeholder="Phone"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-semibold text-gray-900">{party.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                {party.phone && <span>{party.phone}</span>}
                                                {/* NEW: Last transaction date */}
                                                {lastTxnDate && (
                                                    <>
                                                        {party.phone && <span>•</span>}
                                                        <span>Last: {new Date(lastTxnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => updateParty(party._id)} className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setEditingParty(null)} className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-right">
                                            {party.balance === 0 ? (
                                                <p className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />Settled</p>
                                            ) : (
                                                <>
                                                    <p className={`font-bold text-sm ${party.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        ₹{Math.abs(party.balance).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{party.balance > 0 ? 'will give' : 'will get'}</p>
                                                </>
                                            )}
                                        </div>
                                        {/* NEW: Edit button */}
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setEditingParty(party._id);
                                                setEditForm({ name: party.name, phone: party.phone || '' });
                                            }}
                                            className="text-gray-400 hover:text-blue-500 transition p-1"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); deleteParty(party._id); }} className="text-gray-300 hover:text-red-400 transition p-1">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
