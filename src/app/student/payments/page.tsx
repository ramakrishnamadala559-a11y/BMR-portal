'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  BedDouble,
  User,
  Users,
  Receipt,
  Printer,
  Loader2,
  Calendar,
  CircleDollarSign,
  Bell,
  X,
  Building2,
  CheckCircle2,
  MapPin,
  Home
} from 'lucide-react';
import Toast from '@/components/Toast';
import { Capacitor } from '@capacitor/core';
import { PrintWebview } from '@webnativellc/capacitor-print-webview';

const getInitials = (name: string) => {
  return (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const getAvatarBg = (name: string) => {
  const charCode = (name || '').charCodeAt(0) || 0;
  const colors = [
    'bg-violet-600/10 text-violet-400 border-violet-500/20',
    'bg-cyan-600/10 text-cyan-400 border-cyan-500/20',
    'bg-emerald-600/10 text-emerald-400 border-emerald-500/20',
    'bg-rose-600/10 text-rose-400 border-rose-500/20',
    'bg-amber-600/10 text-amber-400 border-amber-500/20'
  ];
  return colors[charCode % colors.length];
};

export default function StudentDashboardPage() {
  const { user, studentProfile, refreshAuth, settings } = useAuth();
  const brandName = settings?.hostelName || 'Home Stay Hostel';
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [roommates, setRoommates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [billingTab, setBillingTab] = useState<'invoices' | 'payments'>('invoices');

  // Print Invoice Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const fetchStudentDashboardData = async () => {
    if (!studentProfile) {
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const cachedInvoices = localStorage.getItem(`invoices_${studentProfile.id}`);
      const cachedRoommates = localStorage.getItem(`roommates_pay_${studentProfile.id}`);
      if (cachedInvoices) {
        setInvoices(JSON.parse(cachedInvoices));
      }
      if (cachedRoommates) {
        setRoommates(JSON.parse(cachedRoommates));
      }
    }

    try {
      // 1. Fetch Invoices (restricted to self in backend API)
      const invRes = await fetch('/api/invoices');
      let invs = [];
      if (invRes.ok) {
        invs = await invRes.json();
        setInvoices(invs);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`invoices_${studentProfile.id}`, JSON.stringify(invs));
        }
      }

      // 2. Fetch Roommates (beds in the same room)
      if (studentProfile.bed && studentProfile.bed.roomId) {
        const bedRes = await fetch(`/api/beds?roomId=${studentProfile.bed.roomId}`);
        if (bedRes.ok) {
          const beds = await bedRes.json();
          // Filter out themselves to get actual roommates
          const mates = beds.filter((b: any) => b.studentId && b.studentId !== studentProfile.id);
          setRoommates(mates);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`roommates_pay_${studentProfile.id}`, JSON.stringify(mates));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load student dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDashboardData();
  }, [studentProfile]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const handlePrintClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPrintModalOpen(true);
  };

  const handlePrintTrigger = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await PrintWebview.print();
      } catch (err) {
        console.error('Capacitor printing failed, falling back to window.print', err);
        window.print();
      }
    } else {
      window.print();
    }
  };

  const getInvoiceBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'OVERDUE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'PARTIALLY_PAID':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading student portal...</p>
      </div>
    );
  }

  // Calculate unpaid balances
  const pendingRentSum = (invoices || []).reduce((sum, inv) => sum + (inv.balance || 0), 0);

  // Flatten and sort payments list
  const paymentsList = (invoices || []).flatMap((inv) => 
    (inv.payments || []).map((p: any) => ({
      ...p,
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate,
      status: inv.status,
      invoice: inv
    }))
  ).sort((a: any, b: any) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="space-y-6 animate-slide-in">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6">
        {/* Outstanding Rent */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-xl backdrop-blur-sm flex items-center justify-between hover:border-slate-750 transition-all hover:scale-[1.01]">
          <div>
            <span className="text-slate-400 text-[8px] min-[350px]:text-[9px] sm:text-xs font-bold uppercase tracking-wider block whitespace-nowrap">Outstanding Due</span>
            <h3 className="text-xs min-[350px]:text-sm sm:text-2xl font-extrabold text-white mt-1 sm:mt-2">
              ₹{pendingRentSum.toLocaleString('en-IN')}
            </h3>
            <p className="hidden sm:block text-[10px] text-slate-500 mt-1 font-semibold">
              Total outstanding balance
            </p>
          </div>
          <div className="hidden md:flex bg-gradient-to-tr from-amber-500/10 to-amber-500/5 border border-amber-500/25 p-3.5 rounded-2xl text-amber-400 shadow-sm">
            <CircleDollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Monthly Rent */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-xl backdrop-blur-sm flex items-center justify-between hover:border-slate-750 transition-all hover:scale-[1.01]">
          <div>
            <span className="text-slate-400 text-[8px] min-[350px]:text-[9px] sm:text-xs font-bold uppercase tracking-wider block whitespace-nowrap">Monthly Rent</span>
            <h3 className="text-xs min-[350px]:text-sm sm:text-2xl font-extrabold text-white mt-1 sm:mt-2">
              ₹{studentProfile?.monthlyRent ? studentProfile.monthlyRent.toLocaleString('en-IN') : '0'}/mo
            </h3>
            <p className="hidden sm:block text-[10px] text-slate-500 mt-1 font-semibold">
              Base PG room charges
            </p>
          </div>
          <div className="hidden md:flex bg-gradient-to-tr from-violet-500/10 to-violet-500/5 border border-violet-500/25 p-3.5 rounded-2xl text-violet-400 shadow-sm">
            <BedDouble className="h-6 w-6" />
          </div>
        </div>

        {/* Next Due Date */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-xl backdrop-blur-sm flex items-center justify-between hover:border-slate-750 transition-all hover:scale-[1.01]">
          <div>
            <span className="text-slate-400 text-[8px] min-[350px]:text-[9px] sm:text-xs font-bold uppercase tracking-wider block whitespace-nowrap">Deposit Paid</span>
            <h3 className="text-xs min-[350px]:text-sm sm:text-2xl font-extrabold text-emerald-400 mt-1 sm:mt-2">
              ₹{studentProfile?.securityDeposit ? studentProfile.securityDeposit.toLocaleString('en-IN') : '0'}
            </h3>
            <p className="hidden sm:block text-[10px] text-slate-500 mt-1 font-semibold">
              Refundable deposit receipted
            </p>
          </div>
          <div className="hidden md:flex bg-gradient-to-tr from-emerald-500/10 to-emerald-500/5 border border-emerald-500/25 p-3.5 rounded-2xl text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Financial Status Summary Card */}
        {studentProfile && (
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4 lg:col-span-1 h-fit hover:border-slate-750 transition-all">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60 text-slate-200">
              <CircleDollarSign className="h-4.5 w-4.5 text-violet-400" />
              <h3 className="font-bold text-white uppercase tracking-wider text-xs">Financial Status</h3>
            </div>
            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="flex justify-between py-2 border-b border-slate-850/40">
                <span>Security Deposit</span>
                <span className="text-emerald-450 font-extrabold">₹{studentProfile.securityDeposit ? studentProfile.securityDeposit.toLocaleString('en-IN') : '0'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-850/40">
                <span>Monthly Rent Rate</span>
                <span className="text-slate-200 font-bold">₹{studentProfile.monthlyRent ? studentProfile.monthlyRent.toLocaleString('en-IN') : '0'}/mo</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-850/40">
                <span>Outstanding Balance</span>
                <span className={`font-extrabold ${pendingRentSum > 0 ? 'text-amber-450' : 'text-emerald-400'}`}>₹{pendingRentSum.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2">
                <span className="text-[10px] text-slate-500 block mb-2 font-bold uppercase tracking-wider">Unpaid Dues Breakdown</span>
                {invoices.filter(i => i.status !== 'PAID').length === 0 ? (
                  <span className="text-slate-500 italic text-[11px] block py-1">All invoices paid. No outstanding dues!</span>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {invoices.filter(i => i.status !== 'PAID').map((inv) => (
                      <div key={inv.id} className="flex justify-between text-[11px] bg-slate-955/50 p-2 rounded-xl border border-slate-850/60 shadow-sm">
                        <span className="font-mono text-slate-400 font-semibold">{inv.invoiceNumber}</span>
                        <span className="text-amber-400 font-bold">₹{inv.balance.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing Ledger */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Header and Switch Tabs */}
        <div className="p-6 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">My Invoices & Paid Receipts</h3>
          
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => setBillingTab('invoices')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                billingTab === 'invoices'
                  ? 'bg-slate-800 text-white border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Bills & Dues
            </button>
            <button
              onClick={() => setBillingTab('payments')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                billingTab === 'payments'
                  ? 'bg-slate-800 text-white border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Payment History
            </button>
          </div>
        </div>

        {billingTab === 'invoices' ? (
          <div>
            {invoices.length > 0 && (
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 lg:hidden">
                ↔ Swipe table horizontally to see all billing columns
              </span>
            )}
            {invoices.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">No rent bills generated yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/30 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800/60">
                      <th className="py-4 px-6">Bill No</th>
                      <th className="py-4 px-6">Due Date</th>
                      <th className="py-4 px-6">Total Amount</th>
                      <th className="py-4 px-6">Balance Due</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-855/20 transition-colors">
                        <td className="py-4 px-6 font-mono text-slate-200 font-bold">{inv.invoiceNumber}</td>
                        <td className="py-4 px-6 text-slate-400">
                          <div>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : 'N/A'}</div>
                          {inv.payments && inv.payments.length > 0 && (
                            <div className="text-[9px] text-emerald-500 font-bold mt-1 whitespace-nowrap">
                              Paid: {new Date([...inv.payments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date).toLocaleDateString('en-GB')}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-100">
                          ₹{(inv.total || 0).toLocaleString('en-IN')}
                          {(inv.arrears || 0) > 0 && (
                            <span className="block text-[10px] text-amber-500 font-semibold mt-0.5">
                              (Inc. ₹{(inv.arrears || 0).toLocaleString('en-IN')} arrears)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-semibold">₹{(inv.balance || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getInvoiceBadge(inv.status || 'PENDING')}`}>
                            {(inv.status || 'PENDING').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handlePrintClick(inv)}
                            className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Print Receipt"
                          >
                            <Printer className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {paymentsList.length > 0 && (
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 lg:hidden">
                ↔ Swipe table horizontally to see all transaction details
              </span>
            )}
            {paymentsList.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">No payment transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/30 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800/60">
                      <th className="py-4 px-6">Receipt ID</th>
                      <th className="py-4 px-6">Bill Ref</th>
                      <th className="py-4 px-6">Date Paid</th>
                      <th className="py-4 px-6">Method</th>
                      <th className="py-4 px-6 font-bold text-slate-200">Amount Paid</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {paymentsList.map((pay: any) => (
                      <tr key={pay.id} className="hover:bg-slate-855/20 transition-colors">
                        <td className="py-4 px-6 font-mono text-violet-400 font-semibold">{pay.paymentId}</td>
                        <td className="py-4 px-6 font-mono text-slate-350">{pay.invoiceNumber}</td>
                        <td className="py-4 px-6 text-slate-400">{pay.date ? new Date(pay.date).toLocaleDateString('en-GB') : 'N/A'}</td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-bold uppercase text-slate-300">
                            {pay.method}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-emerald-400">₹{(pay.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handlePrintClick(pay.invoice)}
                            className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Print Invoice Receipt"
                          >
                            <Printer className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* MODAL: PRINT INVOICE & RECEIPT */}
      {printModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-start p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 md:p-8 shadow-2xl animate-slide-in relative my-4 md:my-8">
            <button
              onClick={() => setPrintModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 print:hidden"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex justify-end print:hidden">
              <button
                onClick={handlePrintTrigger}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Document
              </button>
            </div>

            {/* Printable Area */}
            <div className="bg-white text-slate-955 p-4 sm:p-8 rounded-xl border border-slate-200 print:border-0 print:p-0" id="printable-receipt">
              <div className="flex justify-between items-start pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2.5">
                    <img src="/homestay_logo.jpg" alt="Brand Logo" className="h-9 w-9 rounded-lg border border-slate-200 shadow-sm object-cover" />
                    <h2 className="text-xl font-bold text-slate-900">{brandName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{settings?.address || '123, Hostel Lane, Bangalore'}</p>
                  {settings?.website && (
                    <a
                      href={(settings.website || '').startsWith('http') ? settings.website : `https://${settings.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-violet-600 font-bold block mt-0.5 hover:underline"
                    >
                      🌐 {settings.website}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[9px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {selectedInvoice.status || 'PENDING'}
                  </span>
                  <h3 className="text-sm font-mono font-bold mt-2">Bill No: {selectedInvoice.invoiceNumber || 'N/A'}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Date: {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-200 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-2">Tenant Details:</h4>
                  <p className="font-bold text-slate-900">{selectedInvoice.studentName || 'N/A'}</p>
                  <p className="text-slate-500 mt-1">
                    Phone: {selectedInvoice.student?.phone ? `+91 ${selectedInvoice.student.phone}` : (user?.phone ? `+91 ${user.phone}` : 'N/A')}
                  </p>
                   <p className="text-slate-500 mt-2 font-semibold">
                    Billing Month: {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-2">Billing Information:</h4>
                  <p className="font-semibold text-slate-800">Room {selectedInvoice.roomNumber || 'N/A'} ({selectedInvoice.bedName || 'N/A'})</p>
                  <p className="text-slate-500 mt-1">
                    Due Date: {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                  {selectedInvoice.status === 'PAID' && (
                    <p className="text-emerald-600 font-bold mt-2">
                      Paid On: {selectedInvoice.payments && selectedInvoice.payments.length > 0
                        ? new Date(
                            [...selectedInvoice.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
                          ).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                        : new Date(selectedInvoice.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>

              <table className="w-full text-left border-collapse my-6 text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 font-bold">
                    <th className="py-2.5">Billing Item / Period</th>
                    <th className="py-2.5 text-right">Rent Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3">
                      <p className="font-bold text-slate-800">Monthly PG Rent Charges</p>
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      ₹{(selectedInvoice.subtotal || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  {selectedInvoice.arrears > 0 && (
                    <tr className="border-b border-slate-100 text-amber-700 font-semibold">
                      <td className="py-2 pl-4">Unpaid Arrears Carried Over</td>
                      <td className="py-2 text-right font-bold">+₹{(selectedInvoice.arrears || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  {selectedInvoice.lateFee > 0 && (
                    <tr className="border-b border-slate-100 text-rose-600">
                      <td className="py-2 pl-4">Late Payment Penalty</td>
                      <td className="py-2 text-right font-semibold">+₹{(selectedInvoice.lateFee || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  {selectedInvoice.discount > 0 && (
                    <tr className="border-b border-slate-100 text-emerald-600">
                      <td className="py-2 pl-4">Loyalty Discount / Rebate</td>
                      <td className="py-2 text-right font-semibold">-₹{(selectedInvoice.discount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex justify-end pt-4 text-xs">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between font-bold text-slate-600">
                    <span>Total Bill:</span>
                    <span className="text-slate-900">₹{(selectedInvoice.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Amount Paid:</span>
                    <span className="text-slate-800 font-semibold">₹{(selectedInvoice.paidAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-350 pt-2 font-bold text-sm text-slate-900">
                    <span>Balance Due:</span>
                    <span className="text-slate-955">₹{(selectedInvoice.balance || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-6">
                <p>This is a computer-generated digital receipt and requires no physical signature.</p>
                <p className="mt-1 font-semibold text-slate-500">Thank you for staying at {brandName}!</p>
              </div>
            </div>
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
