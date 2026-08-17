'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Loader2,
  Phone,
  Building,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  ShieldAlert,
  User as UserIcon,
  BookOpen
} from 'lucide-react';
import Toast from '@/components/Toast';
import Link from 'next/link';

export default function StudentsPage() {
  const { hasPermission } = useAuth();
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingFilter, setBuildingFilter] = useState('');

  // Modals state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [modalTab, setModalTab] = useState<'pending' | 'payments'>('pending');

  const modalPendingInvoices = selectedStudent?.invoices || [];
  const modalTotalDue = modalPendingInvoices.reduce((sum: number, inv: any) => sum + inv.balance, 0);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('MALE');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editGuardian, setEditGuardian] = useState('');
  const [editGuardianPhone, setEditGuardianPhone] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editIdNo, setEditIdNo] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (buildingFilter) params.append('buildingId', buildingFilter);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Failed to load students list:', err);
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
    fetchStudents();
  }, [search, statusFilter, buildingFilter]);

  const handleViewProfile = async (student: any) => {
    setSelectedStudent(student);
    setProfileModalOpen(true);
    setModalTab('pending');
    setLoadingHistory(true);
    setPaymentHistory([]);
    try {
      const res = await fetch(`/api/payments?studentId=${student.id}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data);
      }
    } catch (err) {
      console.error('Failed to load student payments history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditClick = (student: any) => {
    setSelectedStudent(student);
    setEditName(student.name || '');
    setEditPhone(student.phone || '');
    setEditEmail(student.email || '');
    setEditDob(student.dob || '');
    setEditGender(student.gender || 'MALE');
    setEditAddress(student.address || '');
    setEditEmergency(student.emergencyContact || '');
    setEditGuardian(student.guardianName || '');
    setEditGuardianPhone(student.guardianPhone || '');
    setEditIdNo(student.idNumber || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !editName.trim() || !editPhone.trim()) return;

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStudent.id,
          name: editName,
          phone: editPhone,
          email: editEmail,
          dob: 'N/A',
          gender: editGender,
          address: editAddress,
          emergencyContact: editEmergency || editGuardianPhone || 'N/A',
          guardianName: editGuardian || 'N/A',
          guardianPhone: editGuardianPhone || 'N/A',
          idNumber: editIdNo || 'N/A'
        })
      });

      if (res.ok) {
        setToast({ message: `${editName} updated successfully!`, type: 'success' });
        setEditModalOpen(false);
        fetchStudents();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to update student', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteClick = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to delete the student record for ${studentName}? This will also delete their login credentials.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students?id=${studentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: `Successfully deleted student record for ${studentName}!`, type: 'success' });
        fetchStudents();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to delete student', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CHECKED_OUT':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'INACTIVE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Students Profile Directory</h1>
          <p className="text-slate-400 text-sm mt-1">Search, update, and manage student profiles and database records.</p>
        </div>
        {hasPermission('students', 'create') && (
          <Link
            href="/admin/admissions"
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Admit Student
          </Link>
        )}
      </div>

      {/* Filters Section */}
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
            placeholder="Search by name, phone number, college, ID..."
            className="w-full bg-slate-950/60 border border-slate-850 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none placeholder-slate-600"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-955/60 border border-slate-855 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active (In Room)</option>
            <option value="INACTIVE">Inactive (Registered Only)</option>
          </select>
        </div>

        {/* Block Filter */}
        <div className="w-full md:w-48">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="w-full bg-slate-955/60 border border-slate-855 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
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

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No student records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/30 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800/60">
                  <th className="py-4 px-6">Stu ID</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Registered Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-xs">
                {students.map((student) => {
                  const isOverdue = student.invoices && student.invoices.some((inv: any) => inv.status === 'OVERDUE');
                  return (
                    <tr key={student.id} className={`hover:bg-slate-855/20 transition-colors ${isOverdue ? 'bg-rose-500/5' : ''}`}>
                      <td className="py-4 px-6 font-mono text-violet-400 font-bold">{student.id}</td>
                      <td className="py-4 px-6 font-bold flex items-center gap-2">
                        <span className={isOverdue ? 'text-rose-500' : 'text-slate-100'}>{student.name}</span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-bold rounded-full uppercase tracking-wider animate-pulse">
                            Overdue Rent
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-355">
                        <a href={`tel:+91${student.phone}`} className="hover:underline text-violet-400 font-bold flex items-center gap-1">
                          📞 +91 {student.phone}
                        </a>
                      </td>
                    <td className="py-4 px-6 text-slate-400">
                      {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getStatusBadge(student.status || '')}`}>
                        {(student.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => handleViewProfile(student)}
                          className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {hasPermission('students', 'edit') && (
                          <button
                            onClick={() => handleEditClick(student)}
                            className="p-1.5 hover:bg-slate-850 text-slate-450 hover:text-violet-400 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('students', 'delete') && (
                          <button
                            onClick={() => handleDeleteClick(student.id, student.name)}
                            className="p-1.5 hover:bg-slate-850 text-slate-500 hover:text-rose-450 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: PROFILE VIEWER */}
      {profileModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-start p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 md:p-6 shadow-2xl animate-slide-in relative my-4 md:my-8">
            <button
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-800/60">
              <div className="h-14 w-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                <UserIcon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedStudent.name || 'N/A'}</h3>
                <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase mt-1 ${getStatusBadge(selectedStudent.status || '')}`}>
                  {(selectedStudent.status || '').replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs mb-6">
              <div>
                <span className="text-slate-500 block mb-0.5">Student ID (Stu ID)</span>
                <span className="text-violet-400 font-mono font-bold uppercase">{selectedStudent.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Joining / Admission Date</span>
                <span className="text-slate-200 font-semibold">
                  {selectedStudent.admissionDate ? new Date(selectedStudent.admissionDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Phone Number</span>
                <span className="text-slate-200 font-semibold">
                  <a href={`tel:+91${selectedStudent.phone || ''}`} className="hover:underline text-violet-400 font-semibold">
                    📞 +91 {selectedStudent.phone || 'N/A'}
                  </a>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Email Address</span>
                <span className="text-slate-200 font-semibold">{selectedStudent.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Gender</span>
                <span className="text-slate-200 font-semibold uppercase">{selectedStudent.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Aadhaar Card (ID Number)</span>
                <span className="text-slate-200 font-semibold">{selectedStudent.idNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Total Outstanding Due</span>
                <span className={`font-bold ${modalTotalDue > 0 ? 'text-amber-500' : 'text-emerald-450'}`}>
                  ₹{modalTotalDue.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Room & Bed Details</span>
                {selectedStudent.bed && selectedStudent.bed.room ? (
                  <span className="text-violet-400 font-bold">
                    Room {selectedStudent.bed.room.number} ({selectedStudent.bed.name})
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Unallocated</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Monthly Rent</span>
                <span className="text-slate-200 font-semibold">₹{(selectedStudent.monthlyRent || 0).toLocaleString('en-IN')}/month</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Security Deposit Term</span>
                <span className="text-slate-200 font-semibold">₹{(selectedStudent.securityDeposit || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Guardian Details</span>
                <span className="text-slate-200 font-semibold">
                  {selectedStudent.guardianName || 'N/A'}{' '}
                  {selectedStudent.guardianPhone && selectedStudent.guardianPhone !== 'N/A' && (
                    <a href={`tel:+91${selectedStudent.guardianPhone}`} className="hover:underline text-violet-400 font-semibold">
                      (📞 +91 {selectedStudent.guardianPhone})
                    </a>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Emergency Contact</span>
                <span className="text-slate-200 font-semibold">
                  <a href={`tel:${selectedStudent.emergencyContact || ''}`} className="hover:underline text-violet-400 font-semibold">
                    {selectedStudent.emergencyContact || 'N/A'}
                  </a>
                </span>
              </div>
            </div>

            <div className="text-xs pt-4 border-t border-slate-800/60">
              <span className="text-slate-500 block mb-1">Permanent Address</span>
              <p className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-300 leading-relaxed mb-4">
                {selectedStudent.address}
              </p>
            </div>

            <div className="text-xs pt-4 border-t border-slate-800/60 space-y-3">
              <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-800/40">
                <h4 className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center gap-2">
                  {modalTab === 'pending' ? (
                    <>
                      <span>⏳ Outstanding Invoices / Dues</span>
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[9px] font-bold">
                        ₹{modalTotalDue.toLocaleString('en-IN')}
                      </span>
                    </>
                  ) : (
                    <span>💳 Payment & Transaction History</span>
                  )}
                </h4>
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                  <button
                    type="button"
                    onClick={() => setModalTab('pending')}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                      modalTab === 'pending'
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Dues
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('payments')}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                      modalTab === 'payments'
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-500 hover:text-slate-355'
                    }`}
                  >
                    Payments
                  </button>
                </div>
              </div>

              {modalTab === 'pending' ? (
                modalPendingInvoices.length === 0 ? (
                  <p className="text-slate-500 italic py-4 text-center border border-dashed border-slate-800 rounded-xl">No active dues or outstanding balances.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-800">
                          <th className="py-2.5 px-4">Invoice No</th>
                          <th className="py-2.5 px-4">Due Date</th>
                          <th className="py-2.5 px-4">Total Amount</th>
                          <th className="py-2.5 px-4 text-right">Balance Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 bg-slate-950/20">
                        {modalPendingInvoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-855/10 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-slate-300 font-semibold">{inv.invoiceNumber}</td>
                            <td className="py-2.5 px-4 text-slate-450">{new Date(inv.dueDate).toLocaleDateString()}</td>
                            <td className="py-2.5 px-4 text-slate-400">
                              ₹{inv.total.toLocaleString('en-IN')}
                              {inv.arrears > 0 && (
                                <span className="block text-[9px] text-amber-500 font-semibold">
                                  (Inc. ₹{inv.arrears.toLocaleString('en-IN')} arrears)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-amber-500 text-right">₹{inv.balance.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : loadingHistory ? (
                <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  <span>Loading payment transactions...</span>
                </div>
              ) : paymentHistory.length === 0 ? (
                <p className="text-slate-500 italic py-4 text-center border border-dashed border-slate-800 rounded-xl">No payments recorded for this resident yet.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-800">
                        <th className="py-2.5 px-4">Receipt ID</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Method</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-950/20">
                      {paymentHistory.map((pay: any) => (
                        <tr key={pay.id} className="hover:bg-slate-855/10 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-violet-400 font-semibold">{pay.paymentId}</td>
                          <td className="py-2.5 px-4 text-slate-400">{new Date(pay.date).toLocaleDateString()}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-[8px] font-bold uppercase text-slate-350">
                              {pay.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-emerald-400 text-right">₹{pay.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {editModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-start p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 md:p-6 shadow-2xl animate-slide-in relative my-4 md:my-8">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-6">Edit Student Profile</h3>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editName || ''}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone || ''}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    value={editEmail || ''}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Gender</label>
                  <select
                    value={editGender || 'MALE'}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Aadhaar Card No (ID Number) (Optional)</label>
                  <input
                    type="text"
                    value={editIdNo || ''}
                    onChange={(e) => setEditIdNo(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Guardian Name (Optional)</label>
                  <input
                    type="text"
                    value={editGuardian || ''}
                    onChange={(e) => setEditGuardian(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-350 font-semibold mb-2">Guardian Phone (Optional)</label>
                  <input
                    type="tel"
                    value={editGuardianPhone || ''}
                    onChange={(e) => setEditGuardianPhone(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500">Address Details</span>
              </div>

              <div>
                <label className="block text-slate-350 font-semibold mb-2">Permanent Address</label>
                <textarea
                  rows={2}
                  value={editAddress || ''}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={editSubmitting}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                {editSubmitting ? 'Saving modifications...' : 'Save Profile Changes'}
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
