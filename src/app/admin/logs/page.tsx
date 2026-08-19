'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  History,
  Search,
  Loader2,
  Calendar,
  ShieldCheck,
  User,
  Info
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function LogsPage() {
  const { user: currentUser } = useAuth();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter states
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getModuleBadge = (modName: string) => {
    switch (modName) {
      case 'AUTH': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'ROOMS': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'STUDENTS': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'PAYMENTS': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'EXPENSES': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-550/10 text-slate-400 border-slate-550/20';
    }
  };

  // Filter logs locally based on filters
  const filteredLogs = logs.filter(log => {
    const matchesModule = moduleFilter ? log.module === moduleFilter : true;
    const matchesSearch = search
      ? log.userName.toLowerCase().includes(search.toLowerCase()) ||
        log.description.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesModule && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs History</h1>
        <p className="text-slate-400 text-sm mt-1">Review live security audit trails and administrative operation records.</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs by staff name or action description..."
            className="w-full bg-slate-955 border border-slate-850 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none placeholder-slate-650"
          />
        </div>

        {/* Module Filter */}
        <div className="w-full md:w-48">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full bg-slate-955 border border-slate-850 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Modules</option>
            <option value="AUTH">Auth / Logins</option>
            <option value="STUDENTS">Students & admissions</option>
            <option value="ROOMS">Rooms & Beds</option>
            <option value="PAYMENTS">Payments & Bills</option>
            <option value="EXPENSES">PG Expenses</option>
            <option value="STAFF">Staff & Roles</option>
            <option value="SETTINGS">PG settings</option>
          </select>
        </div>
      </div>

      {/* Logs Feed List */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-405 text-sm">No activity logs match the filters</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex gap-4 p-4 hover:bg-slate-950/20 rounded-xl border border-transparent hover:border-slate-850/50 transition-all text-xs">
              {/* Icon */}
              <div className="h-8 w-8 bg-slate-950 border border-slate-850 text-slate-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="h-4.5 w-4.5 text-slate-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{log.userName}</span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="font-semibold text-violet-400">{log.action}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — {new Date(log.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <p className="text-slate-350 leading-relaxed mt-1">
                  {log.description}
                </p>
              </div>

              {/* Module Badge */}
              <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase h-fit flex-shrink-0 ${getModuleBadge(log.module)}`}>
                {log.module.toLowerCase()}
              </span>
            </div>
          ))
        )}
      </div>

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
