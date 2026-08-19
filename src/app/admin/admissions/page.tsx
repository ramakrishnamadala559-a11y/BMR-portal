'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UserPlus,
  Bed,
  CheckCircle,
  CircleDollarSign,
  Loader2,
  Building,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Users
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function AdmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedBedId = searchParams.get('bedId') || '';

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Data lists
  const [inactiveStudents, setInactiveStudents] = useState<any[]>([]);
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);

  // Wizard State
  const [step, setStep] = useState(1);

  // Cascading selections
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Form selections
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState(preSelectedBedId);
  
  // Custom Terms
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedCheckout, setExpectedCheckout] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('5000');
  const [submitting, setSubmitting] = useState(false);

  // Inline New Student Form
  const [showNewStudentForm, setShowNewStudentForm] = useState(true);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentDob, setNewStudentDob] = useState('');
  const [newStudentGender, setNewStudentGender] = useState('MALE');
  const [newStudentAddress, setNewStudentAddress] = useState('');
  const [newStudentEmergency, setNewStudentEmergency] = useState('');
  const [newStudentGuardian, setNewStudentGuardian] = useState('');
  const [newStudentGuardianPhone, setNewStudentGuardianPhone] = useState('');
  const [newStudentIdNo, setNewStudentIdNo] = useState('');
  const [newStudentCollege, setNewStudentCollege] = useState('');
  const [newStudentDept, setNewStudentDept] = useState('');
  const [tempStudentDetails, setTempStudentDetails] = useState<any>(null);
  const [allocatedStudentId, setAllocatedStudentId] = useState('');
  const [loadingStudentId, setLoadingStudentId] = useState(false);

  const fetchAllocatedStudentId = async (bedId: string) => {
    setLoadingStudentId(true);
    try {
      const res = await fetch(`/api/beds?action=generateStudentId&bedId=${bedId}`);
      if (res.ok) {
        const data = await res.json();
        setAllocatedStudentId(data.studentId);
      }
    } catch (err) {
      console.error('Failed to generate student ID:', err);
    } finally {
      setLoadingStudentId(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const studRes = await fetch('/api/students?status=INACTIVE');
      const bedRes = await fetch('/api/beds?status=AVAILABLE');

      if (studRes.ok && bedRes.ok) {
        const studs = await studRes.json();
        const beds = await bedRes.json();
        setInactiveStudents(studs);
        setAvailableBeds(beds);

        // Pre-fill building, floor, room, bed and rent if passed in query params
        if (preSelectedBedId) {
          const preBed = beds.find((b: any) => b.id === preSelectedBedId);
          if (preBed) {
            setSelectedBuildingId(preBed.building.id);
            setSelectedFloorId(preBed.room.floor.id);
            setSelectedRoomId(preBed.room.id);
            setSelectedBedId(preBed.id);
            setMonthlyRent(String(preBed.room.rent));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch admissions resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [preSelectedBedId]);

  // When selected bed changes, update rent default and fetch student ID
  useEffect(() => {
    if (selectedBedId) {
      const bed = availableBeds.find(b => b.id === selectedBedId);
      if (bed) {
        setMonthlyRent(String(bed.room.rent));
      }
      fetchAllocatedStudentId(selectedBedId);
    } else {
      setAllocatedStudentId('');
    }
  }, [selectedBedId, availableBeds]);

  const handleRegisterInlineStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentId) {
      setTempStudentDetails(null);
      setStep(2);
      return;
    }

    if (!newStudentName.trim() || !newStudentPhone.trim() || !newStudentAddress.trim()) {
      setToast({ message: 'Please fill in all required fields for student registration', type: 'error' });
      return;
    }

    setTempStudentDetails({
      name: newStudentName,
      phone: newStudentPhone,
      email: newStudentEmail,
      dob: 'N/A',
      gender: newStudentGender,
      address: newStudentAddress,
      emergencyContact: newStudentEmergency || newStudentGuardianPhone || 'N/A',
      guardianName: newStudentGuardian || 'N/A',
      guardianPhone: newStudentGuardianPhone || 'N/A',
      collegeOrCompany: 'N/A',
      courseOrDept: 'N/A',
      idNumber: newStudentIdNo || 'N/A',
      idProofType: 'Aadhaar Card'
    });
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!selectedStudentId && !tempStudentDetails) {
      setToast({ message: 'Student information is missing. Please complete Step 1.', type: 'error' });
      return;
    }
    if (!selectedBedId || !joiningDate) {
      setToast({ message: 'Allocated bed and joining date are required', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId || undefined,
          studentDetails: tempStudentDetails || undefined,
          bedId: selectedBedId,
          joiningDate,
          expectedCheckout: null,
          monthlyRent: monthlyRent || '0',
          securityDeposit: securityDeposit || '0'
        })
      });

      if (res.ok) {
        setToast({ message: 'Admission completed and bed allocated successfully!', type: 'success' });
        setTimeout(() => {
          router.push('/admin/rooms');
        }, 1500);
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Admission allocation failed', type: 'error' });
        setSubmitting(false);
      }
    } catch (err) {
      setToast({ message: 'Admission failed due to network error.', type: 'error' });
      setSubmitting(false);
    }
  };

  // Cascading Handlers
  const handleBuildingChange = (val: string) => {
    setSelectedBuildingId(val);
    setSelectedFloorId('');
    setSelectedRoomId('');
    setSelectedBedId('');
  };

  const handleFloorChange = (val: string) => {
    setSelectedFloorId(val);
    setSelectedRoomId('');
    setSelectedBedId('');
  };

  const handleRoomChange = (val: string) => {
    setSelectedRoomId(val);
    
    // Auto-select the first available bed in the selected room
    const roomBeds = availableBeds.filter(b => b.room.id === val);
    if (roomBeds.length > 0) {
      setSelectedBedId(roomBeds[0].id);
      setMonthlyRent(String(roomBeds[0].room.rent));
    } else {
      setSelectedBedId('');
      setMonthlyRent('');
    }
  };

  const handleBedChange = (val: string) => {
    setSelectedBedId(val);
  };

  // Filtered lists for dropdown cascades
  const buildings = Array.from(new Map(
    availableBeds.map(b => [b.building.id, b.building])
  ).values());

  const filteredFloors = Array.from(new Map(
    availableBeds
      .filter(b => b.building.id === selectedBuildingId)
      .map(b => [b.room.floor.id, b.room.floor])
  ).values());

  const filteredRooms = Array.from(new Map(
    availableBeds
      .filter(b => b.building.id === selectedBuildingId && b.room.floor.id === selectedFloorId)
      .map(b => [b.room.id, b.room])
  ).values());

  const filteredBeds = availableBeds
    .filter(b => b.building.id === selectedBuildingId && b.room.floor.id === selectedFloorId && b.room.id === selectedRoomId);

  const selectedStudent = inactiveStudents.find(s => s.id === selectedStudentId);
  const selectedBed = availableBeds.find(b => b.id === selectedBedId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading admissions console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-slide-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Student Admission</h1>
        <p className="text-slate-400 text-sm mt-1">Enroll a tenant and allocate rooms/beds inside a secure transaction wizard.</p>
      </div>

      {/* Wizard Steps indicator */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800/80 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1</div>
          <span className={`text-xs font-bold ${step >= 1 ? 'text-white' : 'text-slate-450'}`}>Student</span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-600" />
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</div>
          <span className={`text-xs font-bold ${step >= 2 ? 'text-white' : 'text-slate-450'}`}>Allocation & ID</span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-600" />
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3</div>
          <span className={`text-xs font-bold ${step >= 3 ? 'text-white' : 'text-slate-450'}`}>Terms & Review</span>
        </div>
      </div>

      {/* STEP 1: REGISTER STUDENT */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/60">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Register Tenant Profile</h3>
            </div>

            {/* Inline Registration Form */}
            <form onSubmit={handleRegisterInlineStudent} className="space-y-4">
              {inactiveStudents.length > 0 && (
                <div className="pb-4 border-b border-slate-800/40">
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Select Existing Student Profile (Optional)</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedStudentId(val);
                      if (val) {
                        const student = inactiveStudents.find(s => s.id === val);
                        if (student) {
                          setNewStudentName(student.name);
                          setNewStudentPhone(student.phone);
                          setNewStudentEmail(student.email || '');
                          setNewStudentGender(student.gender);
                          setNewStudentAddress(student.address);
                          setNewStudentIdNo(student.idNumber);
                          setNewStudentGuardian(student.guardianName || '');
                          setNewStudentGuardianPhone(student.guardianPhone || '');
                        }
                      } else {
                        setNewStudentName('');
                        setNewStudentPhone('');
                        setNewStudentEmail('');
                        setNewStudentGender('MALE');
                        setNewStudentAddress('');
                        setNewStudentIdNo('');
                        setNewStudentGuardian('');
                        setNewStudentGuardianPhone('');
                      }
                    }}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Create New Student Profile --</option>
                    {inactiveStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Kabir Malhotra"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
                    required
                    disabled={!!selectedStudentId}
                  />
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    placeholder="9000000002"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
                    required
                    disabled={!!selectedStudentId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Gender *</label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none disabled:opacity-50"
                    disabled={!!selectedStudentId}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Joining Date *</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Aadhaar Card No (ID Number) (Optional)</label>
                  <input
                    type="text"
                    value={newStudentIdNo}
                    onChange={(e) => setNewStudentIdNo(e.target.value)}
                    placeholder="AADH1002"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
                    disabled={!!selectedStudentId}
                  />
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="kabir@gmail.com"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
                    disabled={!!selectedStudentId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Guardian Name (Optional)</label>
                  <input
                    type="text"
                    value={newStudentGuardian}
                    onChange={(e) => setNewStudentGuardian(e.target.value)}
                    placeholder="Guardian Name"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
                    disabled={!!selectedStudentId}
                  />
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Guardian Phone (Optional)</label>
                  <input
                    type="tel"
                    value={newStudentGuardianPhone}
                    onChange={(e) => setNewStudentGuardianPhone(e.target.value)}
                    placeholder="9900990098"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
                    disabled={!!selectedStudentId}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Permanent Address *</label>
                <textarea
                  rows={2}
                  value={newStudentAddress}
                  onChange={(e) => setNewStudentAddress(e.target.value)}
                  placeholder="Permanent Address details"
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none disabled:opacity-50"
                  required
                  disabled={!!selectedStudentId}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {selectedStudentId ? 'Use Selected Profile & Choose Bed Room' : 'Create Profile & Choose Bed Room'}
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT BED */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-extrabold">Allocate Bed Room</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Block / Building *</label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="">-- Select Block --</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Floor *</label>
                <select
                  value={selectedFloorId}
                  onChange={(e) => handleFloorChange(e.target.value)}
                  disabled={!selectedBuildingId}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none disabled:opacity-40"
                >
                  <option value="">-- Select Floor --</option>
                  {filteredFloors.map(f => (
                    <option key={f.id} value={f.id}>Floor {f.number}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Room *</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  disabled={!selectedFloorId}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none disabled:opacity-40"
                >
                  <option value="">-- Select Room --</option>
                  {filteredRooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.number} ({r.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Bed *</label>
                <select
                  value={selectedBedId}
                  onChange={(e) => handleBedChange(e.target.value)}
                  disabled={!selectedRoomId}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none disabled:opacity-40"
                >
                  <option value="">-- Select Bed --</option>
                  {filteredBeds.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {availableBeds.length === 0 && (
              <div className="p-4 bg-slate-955 rounded-xl border border-slate-800 text-center">
                <Bed className="h-5 w-5 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">All beds are occupied! There are no available beds right now.</p>
              </div>
            )}

            {selectedBedId && (
              <div className="pt-4 border-t border-slate-800/60">
                {loadingStudentId ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
                    <span>Calculating sequential Student ID...</span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-955 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Generated Student ID</span>
                      <span className="text-lg font-mono font-bold text-violet-400 uppercase tracking-wider">
                        {allocatedStudentId || 'Generating...'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 max-w-xs leading-normal">
                      ID generated automatically based on Block, Floor, Room, and Bed sequence.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-xs font-bold rounded-xl text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => {
                if (!selectedBedId) {
                  setToast({ message: 'Please select a bed to allocate', type: 'error' });
                  return;
                }
                setStep(3);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
            >
              Continue to Set Terms
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FINANCIAL TERMS & REVIEW */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Admission Financial Terms</h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-slate-355 text-xs font-semibold mb-2">Joining Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-505">
                    <Calendar className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Monthly Rent (₹)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <CircleDollarSign className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="number"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-355 text-xs font-semibold mb-2">Security Deposit (₹) (Optional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <CircleDollarSign className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="number"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* REVIEW BOX */}
            <div className="p-5 bg-slate-955 border border-slate-800 rounded-xl space-y-4 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800">Allocation Summary</h4>
              <div className="grid grid-cols-2 gap-y-3">
                <span className="text-slate-400">Student Name:</span>
                <span className="text-slate-200 font-bold">{selectedStudent?.name || tempStudentDetails?.name || 'N/A'}</span>

                <span className="text-slate-400">Mobile Phone:</span>
                <span className="text-slate-200 font-semibold">
                  <a href={`tel:+91${selectedStudent?.phone || tempStudentDetails?.phone || ''}`} className="hover:underline text-violet-400 font-semibold">
                    📞 +91 {selectedStudent?.phone || tempStudentDetails?.phone || 'N/A'}
                  </a>
                </span>

                <span className="text-slate-400">Allocated Wing:</span>
                <span className="text-slate-200 font-semibold">{selectedBed?.building.name}</span>

                <span className="text-slate-400">Room / Bed ID:</span>
                <span className="text-slate-200 font-bold text-violet-400">Room {selectedBed?.room.number} • {selectedBed?.name}</span>

                <span className="text-slate-400">Allocated Student ID:</span>
                <span className="text-slate-200 font-bold text-violet-400 font-mono uppercase">{allocatedStudentId}</span>

                <span className="text-slate-400">Monthly Rent Charge:</span>
                <span className="text-slate-200 font-semibold">₹{(parseFloat(monthlyRent) || 0).toLocaleString('en-IN')}/month</span>

                <span className="text-slate-400">Security Deposit Term:</span>
                <span className="text-slate-200 font-semibold">₹{(parseFloat(securityDeposit) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-xs font-bold rounded-xl text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating admission records...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Complete Admission
                </>
              )}
            </button>
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
