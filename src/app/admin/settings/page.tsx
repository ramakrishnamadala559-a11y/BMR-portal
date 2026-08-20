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
