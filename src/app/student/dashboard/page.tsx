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
  MapPin
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function StudentDashboardPage() {
  const { user, studentProfile, refreshAuth, settings } = useAuth();
  const brandName = settings?.hostelName || 'Pinewood PG';
  
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

    try {
      // 1. Fetch Invoices (restricted to self in backend API)
      const invRes = await fetch('/api/invoices');
      let invs = [];
      if (invRes.ok) {
        invs = await invRes.json();
        setInvoices(invs);
      }

      // 2. Fetch Roommates (beds in the same room)
      if (studentProfile.bed && studentProfile.bed.roomId) {
        const bedRes = await fetch(`/api/beds?roomId=${studentProfile.bed.roomId}`);
        if (bedRes.ok) {
          const beds = await bedRes.json();
          // Filter out themselves to get actual roommates
          const mates = beds.filter((b: any) => b.studentId && b.studentId !== studentProfile.id);
          setRoommates(mates);
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

  const handlePrintClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPrintModalOpen(true);
  };

  const handlePrintTrigger = () => {
    window.print();
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
  const pendingRentSum = invoices.reduce((sum, inv) => sum + inv.balance, 0);

  // Flatten and sort payments list
  const paymentsList = invoices.flatMap((inv) => 
    (inv.payments || []).map((p: any) => ({
      ...p,
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate,
      status: inv.status,
      invoice: inv
    }))
  ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-center justify-center text-violet-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-snug">Welcome, {user?.name}</h1>
            <p className="text-slate-450 text-xs mt-0.5">Tenant Account • Registered Phone: {user?.phone}</p>
          </div>
        </div>
        
        {studentProfile?.bed ? (
          <div className="bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {studentProfile.bed.room.building.name} • Room {studentProfile.bed.room.number}
            </span>
          </div>
        ) : (
          <div className="bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
              Awaiting Room Allocation
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Outstanding Rent */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-slate-405 text-[10px] font-bold uppercase tracking-wider block">Outstanding Due</span>
            <h3 className="text-2xl font-extrabold text-white mt-2">
              ₹{pendingRentSum.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
              Total outstanding balance
            </p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl">
            <CircleDollarSign className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        {/* Monthly Rent */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-slate-405 text-[10px] font-bold uppercase tracking-wider block">Monthly Rent Rate</span>
            <h3 className="text-2xl font-extrabold text-white mt-2">
              ₹{studentProfile?.monthlyRent ? studentProfile.monthlyRent.toLocaleString('en-IN') : '0'}/mo
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
              Base PG room charges
            </p>
          </div>
          <div className="bg-violet-500/10 border border-violet-500/20 p-3.5 rounded-2xl">
            <BedDouble className="h-6 w-6 text-violet-400" />
          </div>
        </div>

        {/* Next Due Date */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-slate-405 text-[10px] font-bold uppercase tracking-wider block">Security Deposit Paid</span>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-2">
              ₹{studentProfile?.securityDeposit ? studentProfile.securityDeposit.toLocaleString('en-IN') : '0'}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
              Refundable deposit receipted
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Room Details & Roommates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Details Card */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">My PG Room Details</h3>
            
            {studentProfile?.bed ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Wing / Block</span>
                    <span className="text-slate-200 font-bold">{studentProfile.bed.room.building.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Floor Number</span>
                    <span className="text-slate-200 font-semibold">Floor {studentProfile.bed.room.floor.number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Room Number</span>
                    <span className="text-slate-200 font-bold text-violet-400">Room {studentProfile.bed.room.number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">My Bed Space</span>
                    <span className="text-slate-200 font-bold">{studentProfile.bed.name}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-850 text-xs">
                  <span className="text-slate-500 block mb-1">Room Facilities Included</span>
                  <p className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-350 leading-relaxed font-semibold">
                    {studentProfile.bed.room.facilities || 'Basic amenities provided'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                <p className="text-xs">Your student profile has been registered. The owner is in the process of assigning your room and bed. Invoices will generate automatically once allocated.</p>
              </div>
            )}
          </div>
        </div>

        {/* Roommates Card */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">My Roommates</h3>
            <div className="space-y-4">
              {roommates.length === 0 ? (
                <div className="text-center py-6 text-slate-550 text-xs flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 text-slate-700" />
                  <p>You are currently the sole occupant or have a single room setup.</p>
                </div>
              ) : (
                roommates.map((mate: any) => (
                  <div key={mate.id} className="flex items-center gap-3 p-3 bg-slate-950/60 border border-slate-850 rounded-xl text-xs">
                    <div className="h-8 w-8 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">{mate.student.name}</h4>
                      <span className="text-[10px] text-slate-550 mt-0.5 block">{mate.name} • {mate.student.phone}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl animate-fade-in">
        <div className="flex items-center gap-2 text-violet-400 font-bold text-[10px] uppercase tracking-wider mb-4">
          <Bell className="h-4.5 w-4.5" />
          <span>PG Announcements & News</span>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-xs leading-normal">
            <h4 className="font-bold text-slate-200">Welcome to {brandName}!</h4>
            <p className="text-slate-400 mt-1">We are excited to welcome you. High-speed broadband credentials and biometric access updates can be completed at the reception counter.</p>
            <span className="text-[9px] text-slate-550 block mt-2">Posted on 15 Aug 2026</span>
          </div>
        </div>
      </div>

      {/* Student Profile Metadata Section */}
      {studentProfile && (
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60 text-slate-200">
            <User className="h-4.5 w-4.5 text-violet-400" />
            <h3 className="font-bold text-white uppercase tracking-wider text-xs">My Registered Profile Info</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-slate-400">
            {/* Column 1: Personal Details */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[10px] pb-1 border-b border-slate-850">Personal Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>Gender</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.gender}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>Date of Birth</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.dob || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>Primary Email</span>
                  <span className="text-slate-250 font-semibold truncate max-w-40">{studentProfile.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Registered Phone</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.phone}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Address & ID Proof */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[10px] pb-1 border-b border-slate-850">Location & Verification</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>ID Proof Type</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.idProofType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>ID Document Number</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.idNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Permanent Address</span>
                  <span className="text-slate-250 font-semibold text-right truncate max-w-40" title={studentProfile.address}>{studentProfile.address}</span>
                </div>
              </div>
            </div>

            {/* Column 3: Guardian & Admission */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[10px] pb-1 border-b border-slate-850">Emergency & Admission</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>Guardian Name</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.guardianName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>Guardian Contact</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.guardianPhone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>Emergency Contact</span>
                  <span className="text-slate-250 font-semibold">{studentProfile.emergencyContact}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Admission Date</span>
                  <span className="text-slate-250 font-semibold">{new Date(studentProfile.admissionDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Column 4: Financial Status */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[10px] pb-1 border-b border-slate-850">Financial Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-850/30">
                  <span>Outstanding Due</span>
                  <span className={`font-bold ${pendingRentSum > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ₹{pendingRentSum.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="py-1">
                  <span className="text-[10px] text-slate-500 block mb-1">Unpaid Dues</span>
                  {invoices.length === 0 ? (
                    <span className="text-slate-450 italic text-[11px]">No active dues</span>
                  ) : (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="flex justify-between text-[10px] bg-slate-950/40 p-1 rounded border border-slate-850/60">
                          <span className="font-mono text-slate-400">{inv.invoiceNumber}</span>
                          <span className="text-amber-400 font-bold">₹{inv.balance.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400 pt-2">
            <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
              <span className="text-slate-500 block mb-1">Affiliation / Organization</span>
              <p className="font-semibold text-slate-200">{studentProfile.collegeOrCompany} ({studentProfile.courseOrDept})</p>
            </div>
            {studentProfile.expectedCheckout && (
              <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                <span className="text-slate-500 block mb-1">Expected Checkout / Term End</span>
                <p className="font-semibold text-slate-200">{new Date(studentProfile.expectedCheckout).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing Ledger */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
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
                        <td className="py-4 px-6 text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="py-4 px-6 font-bold text-slate-100">₹{inv.total.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-slate-300 font-semibold">₹{inv.balance.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getInvoiceBadge(inv.status)}`}>
                            {inv.status.replace('_', ' ')}
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
                        <td className="py-4 px-6 text-slate-400">{new Date(pay.date).toLocaleDateString()}</td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-bold uppercase text-slate-300">
                            {pay.method}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-emerald-400">₹{pay.amount.toLocaleString('en-IN')}</td>
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
            <div className="bg-white text-slate-955 p-4 sm:p-8 rounded-xl border border-slate-200 print:border-0 print:p-0">
              <div className="flex justify-between items-start pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{brandName}</h2>
                  <p className="text-xs text-slate-500 mt-1">Block 3, Tech Park Avenue, Bengaluru</p>
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
                    Phone: {selectedInvoice.student?.phone ? `+91 ${selectedInvoice.student.phone}` : (user?.phone ? `+91 ${user.phone}` : 'N/A')}
                  </p>
                  {(selectedInvoice.student?.email || user?.email) && (
                    <p className="text-slate-500 mt-0.5">
                      Email: {selectedInvoice.student?.email || user?.email}
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
