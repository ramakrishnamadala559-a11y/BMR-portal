'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Building,
  BedDouble,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Activity,
  UserPlus,
  Building2,
  DollarSign,
  PlusCircle,
  Loader2,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';

export default function AdminDashboardPage() {
  const { hasPermission, settings } = useAuth();
  const brandName = settings?.hostelName || 'Home Stay Hostel';
  
  const [data, setData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);

  const fetchBuildings = async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const list = await res.json();
        setBuildings(list);
      }
    } catch (err) {
      console.error('Failed to fetch buildings:', err);
    }
  };

  const fetchDashboardData = async (buildingId: string) => {
    try {
      setLoading(true);
      const queryParams = buildingId ? `?buildingId=${buildingId}` : '';
      
      // Concurrently fetch reports and activity logs
      const [reportRes, logRes] = await Promise.all([
        fetch(`/api/reports${queryParams}`),
        fetch('/api/logs')
      ]);
      
      if (reportRes.ok && logRes.ok) {
        const reportData = await reportRes.json();
        const logsData = await logRes.json();
        setData(reportData);
        setLogs(logsData.slice(0, 5)); // show latest 5 logs
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedBuildingId);
  }, [selectedBuildingId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading property analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalStudents: 0,
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    reservedBeds: 0,
    maintenanceBeds: 0,
    totalCollections: 0,
    totalExpenses: 0,
    pendingRent: 0,
    netIncome: 0,
    todaysCollections: 0,
    monthlyRentCollections: 0,
    monthlyCollectedPayments: 0,
    monthlyExpenses: 0
  };

  // Pie chart data for occupancy
  const occupancyPieData = [
    { name: 'Occupied', value: summary.occupiedBeds, color: '#6366f1' }, // indigo-500
    { name: 'Available', value: summary.availableBeds, color: '#10b981' }, // emerald-500
    { name: 'Reserved', value: summary.reservedBeds, color: '#f59e0b' }, // amber-500
    { name: 'Maintenance', value: summary.maintenanceBeds, color: '#f43f5e' } // rose-500
  ].filter(item => item.value > 0); // only show positive values

  // Financial trend chart data
  const financialTrend = data?.charts?.financialTrend || [];

  // Building stats data
  const buildingStats = data?.charts?.buildingOccupancy || [];

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Welcome Title & Building Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Live occupancy metrics and financial logs for {brandName}.</p>
        </div>
        <div className="w-full sm:w-60">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 sm:hidden">
            Filter by Block & Building
          </label>
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-350 focus:outline-none focus:border-violet-500/80 cursor-pointer"
          >
            <option value="">All Blocks & Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Occupied Beds */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <span className="text-slate-400 text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs font-bold uppercase tracking-wider truncate">
              Occupancy Rate
            </span>
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-1.5 rounded-lg shrink-0">
              <BedDouble className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg md:text-base lg:text-lg xl:text-2xl font-extrabold text-white truncate">
              {summary.totalBeds > 0 ? Math.round((summary.occupiedBeds / summary.totalBeds) * 100) : 0}%
            </h3>
            <p className="text-[10px] md:text-[8px] lg:text-[9px] xl:text-[10px] text-slate-500 mt-1 font-semibold truncate">
              {summary.occupiedBeds} of {summary.totalBeds} beds filled
            </p>
          </div>
        </div>

        {/* Monthly Generated Bills */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <span className="text-slate-400 text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs font-bold uppercase tracking-wider truncate">
              Monthly Bills
            </span>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg shrink-0">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg md:text-base lg:text-lg xl:text-2xl font-extrabold text-emerald-450 truncate">
              ₹{summary.monthlyRentCollections.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] md:text-[8px] lg:text-[9px] xl:text-[10px] text-slate-500 mt-1 font-semibold truncate">
              Generated this month
            </p>
          </div>
        </div>

        {/* Monthly Collected Payments */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <span className="text-slate-400 text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs font-bold uppercase tracking-wider truncate">
              Collected cash
            </span>
            <div className="bg-teal-500/10 border border-teal-500/20 p-1.5 rounded-lg shrink-0">
              <CircleDollarSign className="h-4 w-4 text-teal-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg md:text-base lg:text-lg xl:text-2xl font-extrabold text-teal-400 truncate">
              ₹{summary.monthlyCollectedPayments.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] md:text-[8px] lg:text-[9px] xl:text-[10px] text-slate-500 mt-1 font-semibold truncate">
              Received payments
            </p>
          </div>
        </div>

        {/* Pending Rent */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl flex flex-col justify-between h-full min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <span className="text-slate-400 text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs font-bold uppercase tracking-wider truncate">
              Pending Rent
            </span>
            <div className="bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg shrink-0">
              <Receipt className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg md:text-base lg:text-lg xl:text-2xl font-extrabold text-amber-500 truncate">
              ₹{summary.pendingRent.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] md:text-[8px] lg:text-[9px] xl:text-[10px] text-slate-500 mt-1 font-semibold truncate">
              Outstanding balance
            </p>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl flex flex-col justify-between h-full min-w-0 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <span className="text-slate-400 text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs font-bold uppercase tracking-wider truncate">
              Monthly Expenses
            </span>
            <div className="bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-lg shrink-0">
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg md:text-base lg:text-lg xl:text-2xl font-extrabold text-rose-400 truncate">
              ₹{summary.monthlyExpenses.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] md:text-[8px] lg:text-[9px] xl:text-[10px] text-slate-500 mt-1 font-semibold truncate">
              Operating costs
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Quick Operations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {hasPermission('students', 'create') && (
            <Link
              href="/admin/students"
              className="flex flex-col items-center gap-2 p-4 bg-slate-950 hover:bg-slate-855 border border-slate-800/60 rounded-xl transition-all text-center group cursor-pointer"
            >
              <UserPlus className="h-5 w-5 text-violet-400 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Register Student</span>
            </Link>
          )}
          {hasPermission('students', 'edit') && (
            <Link
              href="/admin/admissions"
              className="flex flex-col items-center gap-2 p-4 bg-slate-950 hover:bg-slate-855 border border-slate-800/60 rounded-xl transition-all text-center group cursor-pointer"
            >
              <BedDouble className="h-5 w-5 text-indigo-400 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Allocate Bed</span>
            </Link>
          )}
          {hasPermission('invoices', 'create') && (
            <Link
              href="/admin/billing"
              className="flex flex-col items-center gap-2 p-4 bg-slate-950 hover:bg-slate-855 border border-slate-800/60 rounded-xl transition-all text-center group cursor-pointer"
            >
              <Receipt className="h-5 w-5 text-emerald-400 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Collect Rent</span>
            </Link>
          )}
          {hasPermission('expenses', 'create') && (
            <Link
              href="/admin/expenses"
              className="flex flex-col items-center gap-2 p-4 bg-slate-950 hover:bg-slate-855 border border-slate-800/60 rounded-xl transition-all text-center group cursor-pointer"
            >
              <DollarSign className="h-5 w-5 text-rose-400 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Add Expense</span>
            </Link>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections vs Expenses Trend */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl lg:col-span-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6">Financial Analytics (Last 6 Months)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, color: '#fff' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" name="Collections" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Donut Chart */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6">Occupancy Breakdown</h3>
            <div className="h-44 w-full flex justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {occupancyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Beds`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-white">{summary.occupiedBeds}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">Occupied</span>
              </div>
            </div>
          </div>
          
          {/* Custom Legends */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/60">
            {occupancyPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-400 font-medium truncate">
                  {item.name}: <strong className="text-slate-200">{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Profit & Loss Statement */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Monthly Profit & Loss (P&L) Statement</h3>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 lg:hidden">
          ↔ Swipe table horizontally to see all columns & margins
        </span>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] md:text-xs">
            <thead>
              <tr className="bg-slate-955 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800/60">
                <th className="py-2 px-2.5 md:py-3 md:px-4">Billing Month</th>
                <th className="py-2 px-2.5 md:py-3 md:px-4">Total Generated Bills (Revenue)</th>
                <th className="py-2 px-2.5 md:py-3 md:px-4">Operating Expenses</th>
                <th className="py-2 px-2.5 md:py-3 md:px-4">Net Profit / Loss</th>
                <th className="py-2 px-2.5 md:py-3 md:px-4">Profit Margin</th>
                <th className="py-2 px-2.5 md:py-3 md:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60">
              {financialTrend.map((trend: any) => {
                const profit = trend.revenue - trend.expenses;
                const profitMargin = trend.revenue > 0 ? Math.round((profit / trend.revenue) * 100) : 0;
                const isLoss = profit < 0;
                return (
                  <tr key={trend.month} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-2 px-2.5 md:py-3 md:px-4 font-bold text-slate-200">{trend.month}</td>
                    <td className="py-2 px-2.5 md:py-3 md:px-4 text-emerald-450 font-semibold">₹{trend.revenue.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2.5 md:py-3 md:px-4 text-rose-455 font-semibold">₹{trend.expenses.toLocaleString('en-IN')}</td>
                    <td className={`py-2 px-2.5 md:py-3 md:px-4 font-extrabold ${isLoss ? 'text-rose-500' : 'text-emerald-450'}`}>
                      {isLoss ? '-' : '+'}₹{Math.abs(profit).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2.5 md:py-3 md:px-4 font-semibold text-slate-350">
                      {profitMargin}%
                    </td>
                    <td className="py-2 px-2.5 md:py-3 md:px-4">
                      <span className={`px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase ${
                        isLoss
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {isLoss ? 'Net Loss' : 'Net Profit'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Building stats and logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Building Stats */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6">Wing Wise Occupancy</h3>
          <div className="space-y-4">
            {buildingStats.length === 0 ? (
              <p className="text-slate-500 text-xs py-4 text-center">No building records found</p>
            ) : (
              buildingStats.map((b: any) => {
                const percent = b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0;
                return (
                  <div key={b.building} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-200">{b.building}</span>
                      <span className="text-slate-400">
                        {b.occupied} / {b.total} beds ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                      <div
                        className="h-full bg-violet-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Audit Log Feed */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live System Logs</h3>
            <Activity className="h-4 w-4 text-violet-400" />
          </div>
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-xs py-4 text-center">No logs recorded yet</p>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="flex gap-3 text-xs pb-3 border-b border-slate-800/40 last:border-b-0 last:pb-0">
                  <div className="mt-0.5 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[9px] font-bold text-slate-400 uppercase h-fit flex-shrink-0">
                    {log.module}
                  </div>
                  <div>
                    <p className="text-slate-200 leading-normal">
                      <strong className="text-slate-100 font-semibold">{log.userName}</strong>: {log.description}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
