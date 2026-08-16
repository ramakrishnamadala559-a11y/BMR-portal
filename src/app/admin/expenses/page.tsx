'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  PiggyBank,
  Plus,
  Search,
  Loader2,
  Trash2,
  X,
  CircleDollarSign,
  TrendingDown,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function ExpensesPage() {
  const { hasPermission } = useAuth();
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // New Expense Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('ELECTRICITY');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (buildingFilter) params.append('buildingId', buildingFilter);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to load expenses list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
      }
    } catch (err) {
      console.error('Failed to load buildings list:', err);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, buildingFilter]);

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date || !description.trim()) {
      setToast({ message: 'All fields are required', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          category,
          date,
          description,
          buildingId: ['BUILDING_RENT', 'ELECTRICITY', 'MAINTENANCE', 'WATER', 'INTERNET'].includes(category)
            ? selectedBuildingId || null
            : null
        })
      });

      if (res.ok) {
        setToast({ message: 'Expense logged successfully!', type: 'success' });
        setExpenseModalOpen(false);
        // Clear
        setAmount('');
        setDescription('');
        setSelectedBuildingId('');
        fetchExpenses();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to log expense', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string, expenseAmt: number, expenseCat: string) => {
    if (!window.confirm(`Are you sure you want to delete this expense of ₹${expenseAmt} logged under ${expenseCat.toLowerCase()}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/expenses?id=${expenseId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: 'Expense deleted successfully!', type: 'success' });
        fetchExpenses();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to delete expense', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  // Calculate totals spent
  const totalExpensesSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by categories
  const categoriesList = [
    'ELECTRICITY',
    'WATER',
    'INTERNET',
    'MAINTENANCE',
    'SALARY',
    'MARKET',
    'RICE',
    'GROCERY',
    'BUILDING_RENT',
    'OTHER'
  ];

  const getCategorySpent = (catName: string) => {
    return expenses
      .filter(e => e.category === catName)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getCategoryColor = (catName: string) => {
    switch (catName) {
      case 'ELECTRICITY': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'SALARY': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'MAINTENANCE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'MARKET': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'RICE': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'GROCERY': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'BUILDING_RENT': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getCategoryIcon = (catName: string) => {
    switch (catName) {
      case 'ELECTRICITY': return <span className="text-amber-400 font-bold text-xs">⚡</span>;
      case 'WATER': return <span className="text-blue-400 font-bold text-xs">💧</span>;
      case 'INTERNET': return <span className="text-indigo-400 font-bold text-xs">🌐</span>;
      case 'MAINTENANCE': return <span className="text-teal-400 font-bold text-xs">🛠️</span>;
      case 'SALARY': return <span className="text-violet-400 font-bold text-xs">💼</span>;
      case 'MARKET': return <span className="text-emerald-400 font-bold text-xs">🛒</span>;
      case 'RICE': return <span className="text-orange-400 font-bold text-xs">🌾</span>;
      case 'GROCERY': return <span className="text-yellow-400 font-bold text-xs">🍏</span>;
      case 'BUILDING_RENT': return <span className="text-pink-400 font-bold text-xs">🏢</span>;
      default: return <span className="text-slate-400 font-bold text-xs">📌</span>;
    }
  };

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PG Expenses Audit</h1>
          <p className="text-slate-400 text-sm mt-1">Audit operating costs, salaries, utility bills, and food mess expenses.</p>
        </div>
        {hasPermission('expenses', 'create') && (
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Expense Log
          </button>
        )}
      </div>

      {/* KPI Sum Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex items-center justify-between col-span-1">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total operating Cost</span>
            <h3 className="text-2xl font-extrabold text-white mt-2">
              ₹{totalExpensesSum.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
              Sum of filtered expense logs
            </p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl">
            <TrendingDown className="h-6 w-6 text-rose-400" />
          </div>
        </div>

        {/* Small top category cards */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl md:col-span-2 flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 block">Top Operating Categories</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['ELECTRICITY', 'SALARY', 'MARKET', 'MAINTENANCE'].map(cat => {
              const spent = getCategorySpent(cat);
              return (
                <div key={cat} className="p-3 bg-slate-955/60 border border-slate-855 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{cat.toLowerCase()}</span>
                  <span className="text-xs font-bold text-slate-200 block mt-1">₹{spent.toLocaleString('en-IN')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4.5 w-4.5 text-slate-550" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-955/60 border border-slate-855 focus:border-violet-500/80 rounded-xl py-2 px-4 text-xs text-slate-350 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="bg-slate-955/60 border border-slate-855 focus:border-violet-500/80 rounded-xl py-2 px-4 text-xs text-slate-350 focus:outline-none"
          >
            <option value="">All Blocks</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <PiggyBank className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No expenses logged under this category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/30 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800/60">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Recorded By</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-xs">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-855/20 transition-colors">
                    <td className="py-4 px-6 text-slate-400">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getCategoryColor(exp.category)}`}>
                          {exp.category.replace('_', ' ')}
                        </span>
                        {exp.buildingId && (
                          <span className="text-[10px] text-violet-400 font-bold">
                            Block: {buildings.find(b => b.id === exp.buildingId)?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-200 font-semibold">{exp.description}</td>
                    <td className="py-4 px-6 font-bold text-slate-100">₹{exp.amount.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-slate-450">{exp.addedBy}</td>
                    <td className="py-4 px-6 text-right">
                      {hasPermission('expenses', 'delete') && (
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.amount, exp.category)}
                          className="p-1.5 hover:bg-slate-850 text-slate-500 hover:text-rose-455 rounded-lg transition-colors cursor-pointer"
                          title="Delete Expense Log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD EXPENSE */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative my-4 md:my-8">
            <button
              onClick={() => setExpenseModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2.5 text-violet-400 font-bold text-[10px] uppercase tracking-wider mb-2">
              <CircleDollarSign className="h-4.5 w-4.5" />
              <span>Log Operating Expense</span>
            </div>
            <h3 className="text-base font-bold text-white mb-6">New Expense Entry</h3>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2 text-center">Amount (INR)</label>
                <div className="relative max-w-[200px] mx-auto">
                  <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 font-extrabold text-lg">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950/60 border border-slate-800/80 focus:border-violet-500/80 rounded-2xl py-3 pl-10 pr-4 text-xl font-extrabold text-white text-center focus:outline-none placeholder-slate-700 transition-all tracking-tight"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">Expense Category</label>
                <div className="flex flex-wrap gap-2">
                  {categoriesList.map(cat => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                          isSelected
                            ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {getCategoryIcon(cat)}
                        {cat.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">Payment Date</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-550">
                      <Calendar className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2 px-8 text-xs text-slate-100 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-450 font-bold text-[10px] uppercase tracking-wider mb-2">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Electricity bill, rice, etc."
                    className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2 px-3.5 text-xs text-slate-100 focus:outline-none placeholder-slate-700"
                    required
                  />
                </div>
              </div>

              {['BUILDING_RENT', 'ELECTRICITY', 'MAINTENANCE', 'WATER', 'INTERNET'].includes(category) && (
                <div className="animate-slide-in">
                  <label className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">Assign to Block / Building</label>
                  <div className="flex flex-wrap gap-2">
                    {buildings.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBuildingId(b.id)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                          selectedBuildingId === b.id
                            ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-xs font-bold rounded-xl text-white transition-all cursor-pointer shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 active:scale-[0.99]"
              >
                {submitting ? 'Submitting log...' : 'Save Expense Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
