'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Settings,
  Home,
  Mail,
  Phone,
  FileText,
  CreditCard,
  BellRing,
  Loader2,
  CheckCircle,
  Save,
  Info,
  User,
  KeyRound,
  Megaphone,
  Trash2
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function SettingsPage() {
  const { hasPermission, user: authUser, refreshAuth } = useAuth();
  
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states (Hostel Config)
  const [hostelName, setHostelName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  
  const [defaultRent, setDefaultRent] = useState('');
  const [defaultDueDateDay, setDefaultDueDateDay] = useState('');
  const [defaultLateFee, setDefaultLateFee] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [showContactOnLogin, setShowContactOnLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Personal Profile states
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Reset student/staff password states
  const [students, setStudents] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [resetType, setResetType] = useState<'student' | 'staff'>('student');
  const [selectedResetUserId, setSelectedResetUserId] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Announcements states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementTargetGroup, setAnnouncementTargetGroup] = useState('ALL');
  const [announcementTargetType, setAnnouncementTargetType] = useState<'ALL' | 'BUILDING' | 'ROOM' | 'STUDENT'>('ALL');
  const [selectedTargetBuilding, setSelectedTargetBuilding] = useState('');
  const [selectedTargetRoom, setSelectedTargetRoom] = useState('');
  const [selectedTargetStudent, setSelectedTargetStudent] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);

  useEffect(() => {
    if (authUser) {
      setProfileName(authUser.name || '');
      setProfilePhone(authUser.phone || '');
      setProfileEmail(authUser.email || '');

      if (authUser.role === 'OWNER') {
        // Fetch students list
        fetch('/api/students')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setStudents(data);
          })
          .catch(err => console.error('Failed to load students:', err));

        // Fetch staff list
        fetch('/api/staff')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setStaffList(data);
          })
          .catch(err => console.error('Failed to load staff:', err));

        // Fetch announcements
        fetchAnnouncements();
        // Fetch buildings list
        fetchBuildingsList();
        // Fetch rooms list
        fetchRoomsList();
      }
    }
  }, [authUser]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        // Pre-fill forms
        setHostelName(data.hostelName);
        setAddress(data.address);
        setPhone(data.phone);
        setEmail(data.email);
        setWebsite(data.website || '');
        setGstNumber(data.gstNumber || '');
        setDefaultRent(String(data.defaultRent));
        setDefaultDueDateDay(String(data.defaultDueDateDay));
        setDefaultLateFee(String(data.defaultLateFee));
        setInvoicePrefix(data.invoicePrefix);
        setEmailEnabled(data.emailEnabled);
        setWhatsappEnabled(data.whatsappEnabled);
        setShowContactOnLogin(data.showContactOnLogin);
      }
    } catch (err) {
      console.error('Failed to load global config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostelName,
          address,
          phone,
          email,
          website,
          gstNumber,
          defaultRent: settings?.defaultRent || 0,
          defaultDueDateDay: settings?.defaultDueDateDay || 5,
          defaultLateFee: settings?.defaultLateFee || 0,
          invoicePrefix: settings?.invoicePrefix || 'INV-',
          emailEnabled,
          whatsappEnabled,
          showContactOnLogin
        })
      });

      if (res.ok) {
        setToast({ message: 'Hostel settings updated successfully!', type: 'success' });
        fetchSettings();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to save settings', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profilePhone.trim()) {
      setToast({ message: 'Name and Phone number are required', type: 'error' });
      return;
    }
    setProfileSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authUser?.id,
          name: profileName,
          phone: profilePhone,
          email: profileEmail || null,
          password: profilePassword || undefined
        })
      });
      if (res.ok) {
        setToast({ message: 'Personal profile updated successfully!', type: 'success' });
        setProfilePassword(''); // reset password
        await refreshAuth();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to update profile', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResetUserId) {
      setToast({ message: 'Please select a user account to reset', type: 'error' });
      return;
    }
    if (!resetPasswordValue || resetPasswordValue.trim().length < 6) {
      setToast({ message: 'Password must be at least 6 characters long', type: 'error' });
      return;
    }

    setResetSubmitting(true);
    try {
      const payload: any = {
        newPassword: resetPasswordValue
      };

      if (resetType === 'student') {
        payload.phone = selectedResetUserId; // student phone
      } else {
        payload.targetUserId = selectedResetUserId; // staff user id
      }

      const res = await fetch('/api/settings/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message || 'Password reset successfully!', type: 'success' });
        setResetPasswordValue('');
        setSelectedResetUserId('');
      } else {
        setToast({ message: data.error || 'Failed to reset password', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setResetSubmitting(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading settings console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-slide-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Hostel Profile Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure global property profile details, default billing parameters, and notifications templates.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Hostel Profile */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-200">
              <Home className="h-4.5 w-4.5 text-violet-400" />
              <h3 className="font-bold text-white uppercase tracking-wider">PG Profile metadata</h3>
            </div>
            {/* Brand Logo Display */}
            <img src="/homestay_logo.jpg" alt="Brand Logo" className="h-9 w-9 rounded-lg border border-slate-800 shadow object-cover" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-350 font-semibold mb-2">PG Brand Name</label>
              <input
                type="text"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-350 font-semibold mb-2">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-350 font-semibold mb-2">Public Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-350 font-semibold mb-2">GSTIN / TAX Code (Optional)</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="29AAAAA1111A1Z1"
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-350 font-semibold mb-2">Website URL (Optional)</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.premiumhostel.com"
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-350 font-semibold mb-2">Physical Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
              required
            />
          </div>
        </div>


        {/* Section 3: Notification Toggles */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60 text-slate-200">
            <BellRing className="h-4.5 w-4.5 text-violet-400" />
            <h3 className="font-bold text-white uppercase tracking-wider">Automated Notification triggers</h3>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-slate-955 border border-slate-850 rounded-xl">
              <div>
                <h4 className="font-bold text-slate-200">Email Notifications</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Send invoice receipts and checkouts copies directly to tenant inbox.</p>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-4.5 w-4.5 bg-slate-950 border border-slate-800 text-violet-600 rounded focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-955 border border-slate-850 rounded-xl">
              <div>
                <h4 className="font-bold text-slate-200">WhatsApp Dispatcher Logs</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Generate notification dispatch cues for rent alerts on WhatsApp.</p>
              </div>
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="h-4.5 w-4.5 bg-slate-950 border border-slate-800 text-violet-600 rounded focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-955 border border-slate-850 rounded-xl">
              <div>
                <h4 className="font-bold text-slate-200">Public Contact Visibility</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Show the global location, address, and phone contact details card on the login screen.</p>
              </div>
              <input
                type="checkbox"
                checked={showContactOnLogin}
                onChange={(e) => setShowContactOnLogin(e.target.checked)}
                className="h-4.5 w-4.5 bg-slate-950 border border-slate-800 text-violet-600 rounded focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        {hasPermission('settings', 'edit') && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-xs font-bold rounded-xl text-white transition-all cursor-pointer hover:shadow-lg hover:shadow-violet-600/10"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving settings changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Hostel Settings Configuration
              </>
            )}
          </button>
        )}
      </form>

      {/* SECTION: Personal Profile Settings */}
      <form onSubmit={handleProfileSubmit} className="space-y-6 text-xs">
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 text-slate-200">
            <div className="flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-violet-400" />
              <h3 className="font-bold text-white uppercase tracking-wider">Owner Account Profile</h3>
            </div>
            {/* Brand Logo Display */}
            <img src="/homestay_logo.jpg" alt="Brand Logo" className="h-9 w-9 rounded-lg border border-slate-800 shadow object-cover" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-350 font-semibold mb-2">My Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-350 font-semibold mb-2">My Phone Number</label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-350 font-semibold mb-2">My Email Address</label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-350 font-semibold mb-2">Change Password (Leave blank to keep current)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-550">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 pl-10 pr-4 text-slate-250 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-955 border border-slate-800 hover:bg-slate-855 disabled:bg-slate-850 text-xs font-bold rounded-xl text-slate-200 transition-all cursor-pointer hover:shadow-lg"
          >
            {profileSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving profile changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-violet-400" />
                Save Personal Profile details
              </>
            )}
          </button>
        </div>
      </form>

      {/* SECTION: Reset Student/Staff Passwords (Owner Only) */}
      {authUser?.role === 'OWNER' && (
        <form onSubmit={handleResetPasswordSubmit} className="space-y-6 text-xs mt-6">
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60 text-slate-200">
              <KeyRound className="h-4.5 w-4.5 text-violet-400" />
              <h3 className="font-bold text-white uppercase tracking-wider">Reset Student / Staff Password</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-355 font-semibold mb-2">Account Type</label>
                <select
                  value={resetType}
                  onChange={(e) => {
                    setResetType(e.target.value as 'student' | 'staff');
                    setSelectedResetUserId('');
                  }}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                >
                  <option value="student">Student Account</option>
                  <option value="staff">Staff Account (Warden/Manager/Receptionist)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-355 font-semibold mb-2">Select User Account</label>
                <select
                  value={selectedResetUserId}
                  onChange={(e) => setSelectedResetUserId(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                  required
                >
                  <option value="">-- Choose User --</option>
                  {resetType === 'student' ? (
                    students.map(s => (
                      <option key={s.id} value={s.phone}>{s.name} ({s.phone})</option>
                    ))
                  ) : (
                    staffList.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.role.toLowerCase()})</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-355 font-semibold mb-2">Set New Password</label>
                <input
                  type="password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={resetSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-955 border border-slate-800 hover:bg-slate-855 disabled:bg-slate-850 text-xs font-bold rounded-xl text-slate-200 transition-all cursor-pointer hover:shadow-lg"
            >
              {resetSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting user password...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-violet-400" />
                  Apply New Password
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* SECTION: Announcements Management (Owner Only) */}
      {authUser?.role === 'OWNER' && (
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60 text-slate-200">
            <Megaphone className="h-4.5 w-4.5 text-violet-400" />
            <h3 className="font-bold text-white uppercase tracking-wider">PG Announcements & Broadcasts</h3>
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
                className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
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
                  className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
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
                    className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
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
                    className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
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
                    className="w-full bg-slate-955 border border-slate-800/80 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
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
                    className="w-full bg-slate-955/40 border border-slate-850 rounded-xl py-2.5 px-4 text-slate-500 focus:outline-none"
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
                className="w-full bg-slate-955 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-slate-250 focus:outline-none"
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
            <h4 className="font-bold text-slate-200 mb-4 uppercase text-[10px] tracking-wider">Active Notices</h4>
            
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
                      className="p-2 bg-slate-950 border border-slate-850 hover:border-rose-500/30 text-slate-500 hover:text-rose-455 rounded-lg transition-colors cursor-pointer flex-shrink-0 self-center"
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
