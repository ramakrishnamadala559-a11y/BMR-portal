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

  // States for public lookup mode (when not logged in)
  const [publicSearch, setPublicSearch] = useState('');
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  // PG Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const activeProfile = user ? studentProfile : publicProfile;

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

  const fetchStudentHomeData = async (profile: any) => {
    if (!profile) {
      setRoommates([]);
      return;
    }

    try {
      // Fetch Roommates (beds in the same room)
      if (profile.bed && profile.bed.roomId) {
        const bedRes = await fetch(`/api/beds?roomId=${profile.bed.roomId}`);
        if (bedRes.ok) {
          const beds = await bedRes.json();
          // Filter out themselves to get actual roommates
          const mates = beds.filter((b: any) => b.studentId && b.studentId !== profile.id);
          setRoommates(mates);
        }
      } else {
        setRoommates([]);
      }
    } catch (err) {
      console.error('Failed to load student roommates:', err);
    }
  };

  const fetchAnnouncements = async (profile: any) => {
    try {
      let url = '/api/public/announcements';
      const params = new URLSearchParams();
      if (profile) {
        if (profile.bed?.room?.building?.name) {
          params.append('buildingName', profile.bed.room.building.name);
        }
        if (profile.bed?.room?.number) {
          params.append('roomNumber', profile.bed.room.number);
        }
        if (profile.id) {
          params.append('studentId', profile.id);
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  useEffect(() => {
    // Attempt to load authenticated user info
    refreshAuth().finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeProfile) {
      fetchStudentHomeData(activeProfile);
      fetchAnnouncements(activeProfile);
    } else {
      fetchAnnouncements(null);
    }
  }, [activeProfile]);

  const handlePublicSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicSearch.trim()) return;
    setSearching(true);
    setSearchError('');
    setPublicProfile(null);
    try {
      const res = await fetch(`/api/public/student?search=${encodeURIComponent(publicSearch.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setPublicProfile(data);
        fetchStudentHomeData(data);
      } else {
        const errData = await res.json();
        setSearchError(errData.error || 'Student not found');
      }
    } catch (err) {
      setSearchError('Failed to fetch student profile');
    } finally {
      setSearching(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading home portal...</p>
      </div>
    );
  }

  // If not logged in and no public lookup active, show Search Form
  if (!user && !publicProfile) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden animate-slide-in">
        <div className="absolute right-0 top-0 h-40 w-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-gradient-to-br from-violet-650/20 to-violet-600/5 border border-violet-500/25 rounded-2xl flex items-center justify-center text-violet-400 mb-3 shadow-inner">
            <User className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Access Student Profile</h2>
          <p className="text-slate-400 text-xs mt-1 text-center font-medium">View and manage your registered hostel details without login</p>
        </div>

        <form onSubmit={handlePublicSearch} className="space-y-4">
          <div>
            <label className="text-slate-500 block mb-1.5 font-bold text-[9px] uppercase tracking-wider">Student ID or Phone Number</label>
            <input
              type="text"
              value={publicSearch}
              onChange={(e) => setPublicSearch(e.target.value)}
              placeholder="e.g. STU-12345 or 9876543210"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
              required
            />
          </div>

          {searchError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-semibold text-center animate-shake">
              {searchError}
            </div>
          )}

          <button
            type="submit"
            disabled={searching}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-violet-600/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Lookup Profile'
            )}
          </button>
        </form>
      </div>
    );
  }

  // Define values for layout
  const welcomeName = user ? user.name : activeProfile?.name;
  const welcomeSubtitle = user 
    ? `Tenant Account • Registered Phone: ${user.phone}`
    : `Public Lookup • Student ID: ${activeProfile?.id}`;

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-violet-955/20 border border-slate-800/80 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 z-10">
          <div className="h-12 w-12 bg-gradient-to-br from-violet-650/20 to-violet-600/5 border border-violet-500/25 rounded-2xl flex items-center justify-center text-violet-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-snug">Welcome, {welcomeName}</h1>
            <p className="text-slate-455 text-[11px] mt-0.5 font-medium">{welcomeSubtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 z-10">
          {!user && (
            <button
              onClick={() => {
                setPublicProfile(null);
                setPublicSearch('');
                setRoommates([]);
              }}
              className="bg-slate-950 hover:bg-slate-900 px-3.5 py-2 border border-slate-800 rounded-xl text-[10px] text-violet-400 font-bold uppercase tracking-wider shadow-sm cursor-pointer transition-all"
            >
              ← Change Student
            </button>
          )}

          {activeProfile?.bed ? (
            <div className="bg-slate-955/85 px-4 py-2 border border-slate-800 rounded-xl flex items-center gap-2 shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-350 font-bold uppercase tracking-wider">
                {activeProfile.bed.room.building.name} • Room {activeProfile.bed.room.number}
              </span>
            </div>
          ) : (
            <div className="bg-slate-955/85 px-4 py-2 border border-slate-800 rounded-xl flex items-center gap-2 shadow-inner">
              <span className="h-2 w-2 rounded-full bg-amber-450 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Awaiting Room Allocation
              </span>
            </div>
          )}
        </div>
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
            
            {activeProfile?.bed ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-955/40 border border-slate-850/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">Wing / Block</span>
                    <span className="text-slate-205 font-bold">{activeProfile.bed.room.building.name}</span>
                  </div>
                  <div className="bg-slate-955/40 border border-slate-855/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">Floor Number</span>
                    <span className="text-slate-205 font-bold">Floor {activeProfile.bed.room.floor.number}</span>
                  </div>
                  <div className="bg-slate-955/40 border border-slate-855/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">Room Number</span>
                    <span className="text-slate-205 font-extrabold text-violet-400">Room {activeProfile.bed.room.number}</span>
                  </div>
                  <div className="bg-slate-955/40 border border-slate-855/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors">
                    <span className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">My Bed Space</span>
                    <span className="text-slate-205 font-extrabold text-cyan-400">{activeProfile.bed.name}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-850/60 text-xs">
                  <span className="text-slate-500 block mb-2 font-bold text-[9px] uppercase tracking-wider">Room Facilities Included</span>
                  <div className="flex flex-wrap gap-2">
                    {(activeProfile.bed.room.facilities || '').split(',').map((f: string) => f.trim()).filter(Boolean).length > 0 ? (
                      (activeProfile.bed.room.facilities || '').split(',').map((f: string, idx: number) => (
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
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-slate-205 truncate">{mate.student?.name || 'Unknown'}</h4>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold flex flex-wrap gap-1.5 items-center">
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850 uppercase text-[9px] font-bold text-violet-400">
                          {mate.building?.name || 'N/A'}
                        </span>
                        <span>•</span>
                        <span>Floor {mate.room?.floor?.number ?? 'N/A'}</span>
                        <span>•</span>
                        <span>Room {mate.room?.number || 'N/A'}</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-semibold">{mate.name}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements (Only shown when added/present in database) */}
      {announcements.length > 0 && (
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl animate-fade-in">
          <div className="flex items-center gap-2 text-violet-400 font-bold text-[10px] uppercase tracking-wider mb-4">
            <Bell className="h-4.5 w-4.5" />
            <span>PG Announcements & News</span>
          </div>
          <div className="space-y-3">
            {announcements.map((ann: any) => (
              <div key={ann.id} className="p-4 bg-slate-955/60 border border-slate-855 rounded-xl text-xs leading-normal">
                <h4 className="font-bold text-slate-200">{ann.title}</h4>
                <p className="text-slate-400 mt-1">{ann.content}</p>
                <span className="text-[9px] text-slate-555 block mt-2">
                  Posted on {new Date(ann.date).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Profile Metadata Section */}
      {activeProfile && (
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
                <span className="text-slate-200 font-mono font-bold break-all max-w-[150px] sm:max-w-xs">{activeProfile.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Name</span>
                <span className="text-slate-202 font-bold">{activeProfile.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Joining Date</span>
                <span className="text-slate-202 font-bold">
                  {activeProfile.admissionDate ? new Date(activeProfile.admissionDate).toLocaleDateString('en-GB') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Phone Number</span>
                <span className="text-slate-202 font-bold">{activeProfile.phone}</span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-3.5 p-5 bg-slate-955/40 border border-slate-850/80 rounded-2xl shadow-md hover:border-slate-800 transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Email</span>
                <span className="text-slate-202 font-bold truncate max-w-[120px] sm:max-w-xs" title={activeProfile.email || 'N/A'}>{activeProfile.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-850/30">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Aadhaar / ID Proof ({activeProfile.idProofType || 'Aadhaar'})</span>
                <span className="text-slate-205 font-bold">{activeProfile.idNumber}</span>
              </div>
              <div className="flex justify-between items-start py-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mt-0.5">Address</span>
                <span className="text-slate-202 font-bold text-right max-w-[150px] sm:max-w-xs break-words font-medium" title={activeProfile.address}>{activeProfile.address}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
