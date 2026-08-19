'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Receipt,
  Search,
  Loader2,
  DollarSign,
  Printer,
  X,
  CreditCard,
  History,
  AlertCircle,
  TrendingUp,
  Plus,
  Home,
  MessageSquare
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function BillingPage() {
  const { hasPermission, settings } = useAuth();
  const brandName = settings?.hostelName || 'Home Stay Hostel';
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Navigation state
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingFilter, setBuildingFilter] = useState('');

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Collect Payment Form states
  const [payAmount, setPayAmount] = useState('');
  const [payDiscount, setPayDiscount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const fetchBillingData = async () => {
    try {
      const resInvoices = await fetch(`/api/invoices?search=${search}&status=${statusFilter}&buildingId=${buildingFilter}`);
      const resPayments = await fetch('/api/payments');

      if (resInvoices.ok && resPayments.ok) {
        const invs = await resInvoices.json();
        const pays = await resPayments.json();
        setInvoices(invs);
        setPayments(pays);
      }
    } catch (err) {
      console.error('Failed to load billing metrics:', err);
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
    fetchBillingData();
  }, [search, statusFilter, buildingFilter]);

  const handlePayClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPayAmount(String(invoice.balance));
    setPayDiscount('');
    setPayMethod('UPI');
    setPayNotes('Rent collection');
    setPaymentModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || (payAmount === '' && payDiscount === '')) return;

    setPaySubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: payAmount || '0',
          discount: payDiscount || '0',
          method: payMethod,
          notes: payNotes
        })
      });

      if (res.ok) {
        const amtMsg = payAmount ? `₹${payAmount} payment` : '';
        const discMsg = payDiscount ? `₹${payDiscount} discount` : '';
        const jointMsg = [amtMsg, discMsg].filter(Boolean).join(' and ');
        setToast({ message: `Successfully recorded ${jointMsg}!`, type: 'success' });
        setPaymentModalOpen(false);
        setPayDiscount('');
        fetchBillingData();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Payment failed', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setPaySubmitting(false);
    }
  };

  const handlePrintClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPrintModalOpen(true);
  };

  const handlePrintTrigger = () => {
    window.print();
  };

  const handleShareInvoiceWhatsApp = () => {
    if (!selectedInvoice) return;
    const phone = selectedInvoice.student?.phone || '';
    if (!phone) {
      setToast({ message: 'Student phone number is not available to share.', type: 'error' });
      return;
    }

    const tenantName = selectedInvoice.studentName || 'Tenant';
    const invoiceNo = selectedInvoice.invoiceNumber || 'N/A';
    const amount = selectedInvoice.total || 0;
    const paidAmount = selectedInvoice.paidAmount || 0;
    const balance = selectedInvoice.balance || 0;
    const status = selectedInvoice.status || 'PENDING';
    const billingMonth = selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'N/A';

    let msg = `Hello ${tenantName},\n\nHere is your billing statement from Home Stay Hostel for ${billingMonth}. 📄✨\n\n📌 Invoice Details:\n- Invoice Number: ${invoiceNo}\n- Status: ${status}\n- Total Bill: ₹${amount.toLocaleString('en-IN')}\n- Paid Amount: ₹${paidAmount.toLocaleString('en-IN')}\n- Remaining Balance: ₹${balance.toLocaleString('en-IN')}\n\n`;

    if (status === 'PAID') {
      msg += `Thank you for your payment! Your invoice is fully paid. 🙏✅\n\n`;
    } else {
      msg += `Please pay your remaining balance of ₹${balance.toLocaleString('en-IN')} as soon as possible. Thank you! 💳🕒\n\n`;
    }

    msg += `For any billing queries, contact Home Stay Hostel management. Have a great stay!`;

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
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

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Invoices</h1>
        <p className="text-slate-400 text-sm mt-1">Manage rent ledger, process invoice collections, and audit payments.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl w-fit border border-slate-800/60">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-slate-950 text-white border border-slate-800/80 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Pending & Invoices
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-slate-950 text-white border border-slate-800/80 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          Payment History
        </button>
      </div>

      {/* INVOICES SECTION */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name or invoice number..."
                className="w-full bg-slate-950/60 border border-slate-850 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none placeholder-slate-600"
              />
            </div>

             <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-850 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Invoices</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            <div className="w-full md:w-48">
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-850 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
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

          {/* Invoices Table */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No invoices found</p>
              </div>
            ) : (
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block p-4 pb-0 lg:hidden">↔ Swipe table horizontally to see all columns & operations</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/30 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800/60">
                      <th className="py-4 px-6">Invoice No</th>
                      <th className="py-4 px-6">Stu ID</th>
                      <th className="py-4 px-6">Student</th>
                      <th className="py-4 px-6">Room / Bed</th>
                      <th className="py-4 px-6">Due Date</th>
                      <th className="py-4 px-6">Total Amount</th>
                      <th className="py-4 px-6">Remaining Balance</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-xs">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-855/20 transition-colors">
                        <td className="py-4 px-6 font-mono text-slate-200 font-bold">{inv.invoiceNumber}</td>
                        <td className="py-4 px-6 font-mono text-violet-400 font-semibold">{inv.studentId}</td>
                        <td className="py-4 px-6 font-bold text-slate-100">{inv.studentName}</td>
                        <td className="py-4 px-6 text-slate-400">Room {inv.roomNumber} ({inv.bedName})</td>

                        <td className="py-4 px-6 text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="py-4 px-6 font-bold text-slate-100">
                          ₹{inv.total.toLocaleString('en-IN')}
                          {inv.arrears > 0 && (
                            <span className="block text-[10px] text-amber-500 font-semibold mt-0.5">
                              (Inc. ₹{inv.arrears.toLocaleString('en-IN')} arrears)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-semibold">₹{inv.balance.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getInvoiceBadge(inv.status)}`}>
                            {inv.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2.5">
                            <button
                              onClick={() => handlePrintClick(inv)}
                              className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Print Invoice"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {hasPermission('payments', 'create') && inv.balance > 0 && (
                              <button
                                onClick={() => handlePayClick(inv)}
                                className="px-2.5 py-1.5 bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600 hover:text-white rounded-lg text-violet-400 font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                Record Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENTS HISTORY SECTION */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No payment history logged</p>
            </div>
          ) : (
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block p-4 pb-0 lg:hidden">↔ Swipe table horizontally to see all columns & operations</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/30 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800/60">
                    <th className="py-4 px-6">Receipt ID</th>
                    <th className="py-4 px-6">Stu ID</th>
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Invoice Number</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Payment Method</th>
                    <th className="py-4 px-6">Amount Collected</th>
                    <th className="py-4 px-6">Recorded By</th>
                    <th className="py-4 px-6">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 text-xs">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-855/20 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-200 font-bold">{pay.paymentId}</td>
                      <td className="py-4 px-6 font-mono text-violet-400 font-semibold">{pay.studentId}</td>
                      <td className="py-4 px-6 font-bold text-slate-100">{pay.student.name}</td>
                      <td className="py-4 px-6 text-slate-400 font-mono">
                        {pay.invoice ? pay.invoice.invoiceNumber : 'Manual / Security'}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(pay.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-bold rounded">
                          {pay.method}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-400">₹{pay.amount.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6 text-slate-400">{pay.recordedBy}</td>
                      <td className="py-4 px-6 text-slate-500 italic max-w-xs truncate">{pay.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {paymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative my-4 md:my-8">
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2.5 text-violet-400 font-bold text-[10px] uppercase tracking-wider mb-2">
              <CreditCard className="h-4 w-4" />
              <span>Record Tenant Payment</span>
            </div>
            <h3 className="text-base font-bold text-white mb-4">Invoice {selectedInvoice.invoiceNumber}</h3>

            <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl mb-4 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Tenant:</span>
                <span className="text-slate-200 font-semibold">{selectedInvoice.studentName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Bill:</span>
                <span className="text-slate-200 font-semibold">₹{selectedInvoice.total}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Balance:</span>
                <span className="text-amber-400 font-bold">₹{selectedInvoice.balance}</span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Payment Amount (₹)</label>
                  <input
                    type="number"
                    max={selectedInvoice.balance}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 font-bold focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Discount (₹) (Optional)</label>
                  <input
                    type="number"
                    max={selectedInvoice.balance}
                    value={payDiscount}
                    onChange={(e) => setPayDiscount(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-emerald-500/80 rounded-xl py-2.5 px-4 text-sm text-emerald-400 font-bold focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-350 font-semibold mb-2">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-350 font-semibold mb-2">Transaction Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Rent for August 2026"
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={paySubmitting}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                {paySubmitting ? 'Logging payment...' : 'Record Payment Collection'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINT INVOICE & RECEIPT */}
      {printModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-start p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 md:p-8 shadow-2xl animate-slide-in relative my-4 md:my-8">
            {/* Close */}
            <button
              onClick={() => setPrintModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 print:hidden"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Print trigger button */}
            <div className="mb-6 flex justify-end gap-3 print:hidden">
              {selectedInvoice.student?.phone && (
                <button
                  onClick={handleShareInvoiceWhatsApp}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-550 text-xs font-bold rounded-xl text-white transition-all cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  Share on WhatsApp
                </button>
              )}
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
                  <p className="text-xs text-slate-500 mt-1">Block 3, Tech Park Avenue, Bengaluru</p>
                  {settings?.website && (
                    <a
                      href={`https://${settings.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-violet-600 font-bold block mt-0.5 hover:underline"
                    >
                      🌐 {settings.website}
                    </a>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">GSTIN: 29AAAAA1111A1Z1</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {selectedInvoice.status || 'PENDING'}
                  </span>
                  <h3 className="text-sm font-mono font-bold mt-2">Bill No: {selectedInvoice.invoiceNumber || 'N/A'}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Date: {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-200 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-2">Tenant Details:</h4>
                  <p className="font-bold text-slate-900">{selectedInvoice.studentName || 'N/A'}</p>
                  <p className="text-slate-500 mt-1">
                    Phone: {selectedInvoice.student?.phone ? `+91 ${selectedInvoice.student.phone}` : 'N/A'}
                  </p>
                  {selectedInvoice.student?.email && (
                    <p className="text-slate-500 mt-0.5">
                      Email: {selectedInvoice.student.email}
                    </p>
                  )}
                  <p className="text-slate-500 mt-2 font-semibold">
                    Billing Month: {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-2">Billing Information:</h4>
                  <p className="font-semibold text-slate-800">Room {selectedInvoice.roomNumber || 'N/A'} ({selectedInvoice.bedName || 'N/A'})</p>
                  <p className="text-slate-500 mt-1">
                    Due Date: {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString([], { dateStyle: 'medium' }) : 'N/A'}
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
                    <span className="text-slate-950">₹{(selectedInvoice.balance || 0).toLocaleString('en-IN')}</span>
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
