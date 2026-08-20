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
  Info,
  Megaphone,
  Plus,
  Trash2
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

  // Announcements states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementTargetType, setAnnouncementTargetType] = useState<'ALL' | 'BUILDING' | 'ROOM' | 'STUDENT'>('ALL');
  const [selectedTargetBuilding, setSelectedTargetBuilding] = useState('');
  const [selectedTargetRoom, setSelectedTargetRoom] = useState('');
  const [selectedTargetStudent, setSelectedTargetStudent] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

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

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const fetchBuildingsList = async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBuildings(data);
      }
    } catch (err) {
      console.error('Failed to load buildings list:', err);
    }
  };

  const fetchRoomsList = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRooms(data);
      }
    } catch (err) {
      console.error('Failed to load rooms list:', err);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setStudents(data);
      }
    } catch (err) {
      console.error('Failed to load students list:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (currentUser && currentUser.role === 'OWNER') {
      fetchAnnouncements();
      fetchBuildingsList();
      fetchRoomsList();
      fetchStudentsList();
    }
  }, [currentUser]);

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      setToast({ message: 'Title and content are required', type: 'error' });
      return;
    }

    let target = 'ALL';
    if (announcementTargetType === 'BUILDING') {
      if (!selectedTargetBuilding) {
        setToast({ message: 'Please select a building', type: 'error' });
        return;
      }
      target = selectedTargetBuilding;
    } else if (announcementTargetType === 'ROOM') {
      if (!selectedTargetRoom) {
        setToast({ message: 'Please select a room number', type: 'error' });
        return;
      }
      target = `ROOM_${selectedTargetRoom}`;
    } else if (announcementTargetType === 'STUDENT') {
      if (!selectedTargetStudent) {
        setToast({ message: 'Please select a student', type: 'error' });
        return;
      }
      target = `STUDENT_${selectedTargetStudent}`;
    }

    setAnnouncementSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent,
          targetGroup: target
        })
      });

      if (res.ok) {
        setToast({ message: 'Announcement posted successfully!', type: 'success' });
        setAnnouncementTitle('');
        setAnnouncementContent('');
        setAnnouncementTargetType('ALL');
        setSelectedTargetBuilding('');
        setSelectedTargetRoom('');
        setSelectedTargetStudent('');
        fetchAnnouncements();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to post announcement', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const handleAnnouncementDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: 'Announcement deleted successfully!', type: 'success' });
        fetchAnnouncements();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to delete announcement', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const getTargetBadgeText = (targetStr: string) => {
    if (targetStr === 'ALL') return 'General';
    if (targetStr.startsWith('ROOM_')) return `Room ${targetStr.replace('ROOM_', '')}`;
    if (targetStr.startsWith('STUDENT_')) {
      const studentId = targetStr.replace('STUDENT_', '');
      const student = students.find(s => s.id === studentId);
      return student ? `Student: ${student.name}` : 'Student (Deleted)';
    }
    return targetStr; // building name
  };

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

      </div>

      {/* SECTION: Announcements Management (Owner Only) */}
      {currentUser?.role === 'OWNER' && (
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60 text-slate-200">
            <Megaphone className="h-4.5 w-4.5 text-violet-400" />
            <h3 className="font-bold text-white uppercase tracking-wider text-xs">PG Announcements & Broadcasts</h3>
          </div>

          {/* Post New Announcement Form */}
          <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-355 font-semibold mb-2">Announcement Title</label>
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. Scheduled Power Outage or Holiday Notice"
                className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-200 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-355 font-semibold mb-2">Target Type</label>
                <select
                  value={announcementTargetType}
                  onChange={(e) => {
                    setAnnouncementTargetType(e.target.value as any);
                    setSelectedTargetBuilding('');
                    setSelectedTargetRoom('');
                    setSelectedTargetStudent('');
                  }}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ALL">All Buildings (General)</option>
                  <option value="BUILDING">Specific Building</option>
                  <option value="ROOM">Specific Room</option>
                  <option value="STUDENT">Specific Student</option>
                </select>
              </div>

              {announcementTargetType === 'BUILDING' && (
                <div className="md:col-span-2">
                  <label className="block text-slate-355 font-semibold mb-2">Select Building</label>
                  <select
                    value={selectedTargetBuilding}
                    onChange={(e) => setSelectedTargetBuilding(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Building --</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {announcementTargetType === 'ROOM' && (
                <div className="md:col-span-2">
                  <label className="block text-slate-355 font-semibold mb-2">Select Room Number</label>
                  <select
                    value={selectedTargetRoom}
                    onChange={(e) => setSelectedTargetRoom(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Room Number --</option>
                    {Array.from(new Set(rooms.map(r => r.number))).sort().map(roomNum => (
                      <option key={roomNum} value={roomNum}>Room {roomNum}</option>
                    ))}
                  </select>
                </div>
              )}

              {announcementTargetType === 'STUDENT' && (
                <div className="md:col-span-2">
                  <label className="block text-slate-355 font-semibold mb-2">Select Student</label>
                  <select
                    value={selectedTargetStudent}
                    onChange={(e) => setSelectedTargetStudent(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>
              )}

              {announcementTargetType === 'ALL' && (
                <div className="md:col-span-2">
                  <label className="block text-slate-355 font-semibold mb-2">Target Info</label>
                  <input
                    type="text"
                    value="General notice broadcast to all active residents"
                    className="w-full bg-slate-955/40 border border-slate-850 rounded-xl py-2.5 px-4 text-xs text-slate-500 focus:outline-none"
                    disabled
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-355 font-semibold mb-2">Announcement Content</label>
              <textarea
                rows={3}
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Write the details of the notice here..."
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-200 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={announcementSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-violet-650 hover:bg-violet-600 disabled:bg-violet-850 text-xs font-bold rounded-xl text-white transition-all cursor-pointer hover:shadow-lg shadow-violet-650/10"
            >
              {announcementSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting announcement...
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4" />
                  Broadcast Announcement
                </>
              )}
            </button>
          </form>

          {/* Active Announcements List */}
          <div className="pt-4 border-t border-slate-800/60">
            <h4 className="font-bold text-slate-250 mb-4 uppercase text-[9px] tracking-wider">Active Notices</h4>
            
            {announcementsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-slate-550 text-center py-6">No active announcements. Use the form above to broadcast notices.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map(ann => (
                  <div key={ann.id} className="flex gap-4 p-4 bg-slate-955/40 border border-slate-850/60 rounded-xl hover:border-slate-800 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{ann.title}</span>
                          <span className="bg-violet-600/10 text-violet-400 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border border-violet-500/15">
                            {getTargetBadgeText(ann.targetGroup)}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1 leading-normal">{ann.content}</p>
                    </div>

                    <button
                      onClick={() => handleAnnouncementDelete(ann.id)}
                      className="p-2 bg-slate-955 border border-slate-850 hover:border-rose-500/30 text-slate-500 hover:text-rose-455 rounded-lg transition-colors cursor-pointer flex-shrink-0 self-center"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
