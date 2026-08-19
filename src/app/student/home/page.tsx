'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Users,
  Home,
  Bell,
  Loader2
} from 'lucide-react';

export default function StudentHomePage() {
  const { user, studentProfile, refreshAuth, settings } = useAuth();
  const brandName = settings?.hostelName || 'Home Stay Hostel';
  
  const [roommates, setRoommates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper for roommate name initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Helper for roommate avatar colors
  const getAvatarBg = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-violet-500/10 text-violet-400 border-violet-500/25',
      'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      'bg-amber-500/10 text-amber-400 border-amber-500/25',
      'bg-rose-500/10 text-rose-400 border-rose-500/25',
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
    ];
    return colors[hash % colors.length];
  };

  const fetchStudentHomeData = async () => {
    if (!studentProfile) {
      setLoading(false);
      return;
    }

    try {
      // Fetch Roommates (beds in the same room)
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
      console.error('Failed to load student roommates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  useEffect(() => {
    fetchStudentHomeData();
  }, [studentProfile]);

  if (loading || !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading home portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-violet-950/20 border border-slate-800/80 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 z-10">
          <div className="h-12 w-12 bg-gradient-to-br from-violet-650/20 to-violet-600/5 border border-violet-500/25 rounded-2xl flex items-center justify-center text-violet-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-snug">Welcome, {user.name}</h1>
            <p className="text-slate-455 text-[11px] mt-0.5 font-medium">Tenant Account • Registered Phone: {user.phone}</p>
          </div>
        </div>
        
        {studentProfile?.bed ? (
          <div className="bg-slate-955/85 px-4 py-2 border border-slate-800 rounded-xl flex items-center gap-2 z-10 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-350 font-bold uppercase tracking-wider">
              {studentProfile.bed.room.building.name} • Room {studentProfile.bed.room.number}
            </span>
          </div>
        ) : (
          <div className="bg-slate-955/85 px-4 py-2 border border-slate-800 rounded-xl flex items-center gap-2 z-10 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-amber-450 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Awaiting Room Allocation
            </span>
          </div>
        )}
      </div>

      {/* Room Details & Roommates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Details Card */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between lg:col-span-2 hover:border-slate-750 transition-all">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Home className="h-4.5 w-4.5 text-violet-400" />
              <span>My PG Room Details</span>
            </h3>
            
            {studentProfile?.bed ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-955/40 border border-slate-850/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">Wing / Block</span>
                    <span className="text-slate-205 font-bold">{studentProfile.bed.room.building.name}</span>
                  </div>
                  <div className="bg-slate-955/40 border border-slate-855/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">Floor Number</span>
                    <span className="text-slate-205 font-bold">Floor {studentProfile.bed.room.floor.number}</span>
                  </div>
                  <div className="bg-slate-955/40 border border-slate-855/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">Room Number</span>
                    <span className="text-slate-205 font-extrabold text-violet-400">Room {studentProfile.bed.room.number}</span>
                  </div>
                  <div className="bg-slate-955/40 border border-slate-855/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">My Bed Space</span>
                    <span className="text-slate-205 font-extrabold text-cyan-400">{studentProfile.bed.name}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-850/60 text-xs">
                  <span className="text-slate-500 block mb-2 font-bold text-[9px] uppercase tracking-wider">Room Facilities Included</span>
                  <div className="flex flex-wrap gap-2">
                    {(studentProfile.bed.room.facilities || '').split(',').map((f: string) => f.trim()).filter(Boolean).length > 0 ? (
                      (studentProfile.bed.room.facilities || '').split(',').map((f: string, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-850/80 rounded-xl text-slate-300 font-bold uppercase text-[9px] tracking-wider shadow-sm">
                          ⚡ {f.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-850/80 rounded-xl text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                        ⚡ Basic amenities provided
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Home className="h-8 w-8 mx-auto mb-2 text-slate-700 animate-bounce" />
                <p className="text-xs max-w-md mx-auto leading-relaxed">Your student profile has been registered. The owner is in the process of assigning your room and bed. Invoices will generate automatically once allocated.</p>
              </div>
            )}
          </div>
        </div>

        {/* Roommates Card */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between hover:border-slate-750 transition-all">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-violet-400" />
              <span>My Roommates</span>
            </h3>
            <div className="space-y-3">
              {roommates.length === 0 ? (
                <div className="text-center py-8 text-slate-555 text-xs flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 text-slate-800" />
                  <p className="max-w-[200px] leading-relaxed">You are currently the sole occupant or have a single room setup.</p>
                </div>
              ) : (
                roommates.map((mate: any) => (
                  <div key={mate.id} className="flex items-center gap-3.5 p-3.5 bg-slate-955/40 border border-slate-850/60 rounded-xl text-xs hover:border-slate-800 transition-colors shadow-sm">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-extrabold border shadow-inner flex-shrink-0 ${getAvatarBg(mate.student?.name || '')}`}>
                      {getInitials(mate.student?.name || 'U')}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-205">{mate.student?.name || 'Unknown'}</h4>
                      <span className="text-[10px] text-slate-550 mt-0.5 block">{mate.name} • {mate.student?.phone || 'N/A'}</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
            {/* Column 1 */}
            <div className="space-y-3.5 p-5 bg-slate-955/40 border border-slate-850/80 rounded-2xl shadow-md hover:border-slate-800 transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Student ID</span>
                <span className="text-slate-200 font-mono font-bold break-all max-w-[150px] sm:max-w-xs">{studentProfile.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Name</span>
                <span className="text-slate-202 font-bold">{studentProfile.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Joining Date</span>
                <span className="text-slate-202 font-bold">
                  {studentProfile.admissionDate ? new Date(studentProfile.admissionDate).toLocaleDateString([], { dateStyle: 'medium' }) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Phone Number</span>
                <span className="text-slate-202 font-bold">{studentProfile.phone}</span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-3.5 p-5 bg-slate-955/40 border border-slate-850/80 rounded-2xl shadow-md hover:border-slate-800 transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Email</span>
                <span className="text-slate-202 font-bold truncate max-w-[120px] sm:max-w-xs" title={studentProfile.email || 'N/A'}>{studentProfile.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Aadhar / ID</span>
                <span className="text-slate-205 font-bold">{studentProfile.idNumber} ({studentProfile.idProofType || 'ID Proof'})</span>
              </div>
              <div className="flex justify-between items-start py-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mt-0.5">Address</span>
                <span className="text-slate-202 font-bold text-right max-w-[150px] sm:max-w-xs break-words" title={studentProfile.address}>{studentProfile.address}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
