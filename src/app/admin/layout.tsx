'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Receipt,
  PiggyBank,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User as UserIcon,
  ChevronRight,
  Loader2,
  Home,
  Map as MapIcon
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Toast from '@/components/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hasPermission, settings } = useAuth();
  const brandName = settings?.hostelName || 'Home Stay Hostel';
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Profile modal and password reset states
  const [profileOpen, setProfileOpen] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleProfileResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone || resetPhone.trim().length < 10) {
      setToast({ message: 'Please enter a valid 10-digit registered phone number', type: 'error' });
      return;
    }
    if (!resetPassword || resetPassword.trim().length < 6) {
      setToast({ message: 'Password must be at least 6 characters long', type: 'error' });
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch('/api/settings/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: resetPhone.trim(),
          newPassword: resetPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message || 'Password reset successfully!', type: 'success' });
        setResetPassword('');
        setResetPhone('');
      } else {
        setToast({ message: data.error || 'Failed to reset password', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setResetSubmitting(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'STUDENT') {
      fetchNotifications();
    }
  }, [user]);

  // Refresh notifications whenever the dropdown is opened
  useEffect(() => {
    if (notifOpen && user && user.role !== 'STUDENT') {
      fetchNotifications();
    }
  }, [notifOpen, user]);

  // Redirect if not logged in or is student
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'STUDENT') {
        router.push('/student/home');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role === 'STUDENT') {
    return (
      <div className="min-h-screen bg-slate-955 flex flex-col items-center justify-center p-4 text-center">
        <div className="flex flex-col items-center mb-6 animate-pulse">
          <img src="/homestay_logo.jpg" alt="Brand Logo" className="h-16 w-16 rounded-2xl border border-slate-800 shadow-lg object-cover mb-3" />
          <h1 className="text-lg font-bold text-white tracking-tight">{brandName}</h1>
        </div>
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-semibold">Authorizing admin access...</p>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, permission: { m: '', a: '' } },
    { name: 'Students', href: '/admin/students', icon: Users, permission: { m: 'students', a: 'view' } },
    { name: 'Admissions', href: '/admin/admissions', icon: UserPlus, permission: { m: 'students', a: 'edit' } },
    { name: 'Rooms Map', href: '/admin/rooms', icon: MapIcon, permission: { m: 'rooms', a: 'view' } },
    { name: 'Billing & Invoices', href: '/admin/billing', icon: Receipt, permission: { m: 'invoices', a: 'view' } },
    { name: 'PG Expenses', href: '/admin/expenses', icon: PiggyBank, permission: { m: 'expenses', a: 'view' } },
    { name: 'Staff Management', href: '/admin/staff', icon: ShieldCheck, permission: { m: 'settings', a: 'view' } },
    { name: 'Audit Logs', href: '/admin/logs', icon: History, permission: { m: 'settings', a: 'view' } },
    { name: 'PG Settings', href: '/admin/settings', icon: Settings, permission: { m: 'settings', a: 'view' } }
  ];

  // Filter items by role/permission
  const allowedMenuItems = menuItems.filter(item => {
    if (!item.permission.m) return true;
    return hasPermission(item.permission.m, item.permission.a);
  });

  const getPageTitle = () => {
    const item = menuItems.find(i => i.href === pathname);
    return item ? item.name : brandName;
  };

  const handleLogoutClick = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800/80 flex-shrink-0">
        <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <Home className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">{brandName}</h2>
            <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Property Panel</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/10'
                    : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
              <UserIcon className="h-5 w-5 text-slate-300" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-slate-200 truncate">{user.name}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-855 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout Account
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden relative pb-16 lg:pb-0">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between px-6 z-30">
          {/* Mobile hamburger menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <span>Admin</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-100">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

             {/* Live Notifications Dropdown */}
             <div className="relative">
               <button
                 onClick={() => setNotifOpen(!notifOpen)}
                 className="p-2.5 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/40 hover:border-slate-750 text-slate-400 hover:text-slate-100 rounded-xl transition-all relative"
               >
                 <Bell className="h-4.5 w-4.5" />
                 {notifications.length > 0 && (
                   <span className="absolute top-1 right-1 h-2 w-2 bg-violet-500 rounded-full animate-pulse" />
                 )}
               </button>
               
               {notifOpen && (
                 <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-slide-in">
                   <div className="flex justify-between items-center pb-3 border-b border-slate-800/60 mb-3">
                     <h5 className="text-xs font-bold text-white uppercase tracking-wide">Notification Log</h5>
                     <span className="text-[10px] bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                       {notifications.length} Total
                     </span>
                   </div>
                   <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                     {notifLoading && notifications.length === 0 ? (
                       <div className="flex justify-center py-4">
                         <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
                       </div>
                     ) : notifications.length === 0 ? (
                       <p className="text-slate-500 text-[10px] text-center py-6">No recent notifications</p>
                     ) : (
                       notifications.map((notif: any) => (
                         <div key={notif.id} className="p-2.5 hover:bg-slate-950/40 rounded-xl transition-all border border-slate-850/30 hover:border-slate-800/45 text-[11px] leading-relaxed">
                           <div className="flex justify-between items-start gap-1">
                             <p className="font-bold text-slate-200">{notif.title}</p>
                             <span className={`text-[8px] px-1 py-0.2 rounded border font-bold uppercase ${
                               notif.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                             }`}>{notif.status.toLowerCase()}</span>
                           </div>
                           <p className="text-slate-400 mt-1">{notif.message}</p>
                           <div className="flex justify-between text-[8px] text-slate-500 mt-1.5 font-medium">
                             <span>To: {notif.recipient}</span>
                             <span>{new Date(notif.createdAt).toLocaleDateString('en-GB')}</span>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               )}
             </div>

             {/* Profile Dropdown Trigger */}
             <button
               onClick={() => setProfileOpen(true)}
               className="flex items-center gap-3 hover:bg-slate-800/40 p-1.5 rounded-xl border border-transparent hover:border-slate-800/60 transition-all cursor-pointer text-left"
             >
               <div className="hidden sm:block text-right">
                 <span className="block text-xs font-bold text-slate-200">{user.name}</span>
                 <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{user.role}</span>
               </div>
               <div className="h-9 w-9 bg-slate-855 rounded-xl border border-slate-800 flex items-center justify-center">
                 <UserIcon className="h-4.5 w-4.5 text-slate-400" />
               </div>
             </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 relative">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Mobile Drawer Menu */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-250 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="h-5 w-5 text-violet-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">{brandName}</h2>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-855"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-855 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-855">
          <div className="flex items-center gap-3 mb-4">
            <UserIcon className="h-5 w-5 text-slate-400" />
            <div>
              <h4 className="text-xs font-bold text-slate-200">{user.name}</h4>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-855 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Bottom Navigation for Mobile Devices */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-4 z-40 lg:hidden">
        <Link
          href="/admin/dashboard"
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === '/admin/dashboard' ? 'text-violet-400' : 'text-slate-450 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Dashboard</span>
        </Link>
        <Link
          href="/admin/students"
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === '/admin/students' ? 'text-violet-400' : 'text-slate-450 hover:text-slate-200'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Students</span>
        </Link>
        <Link
          href="/admin/admissions"
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === '/admin/admissions' ? 'text-violet-400' : 'text-slate-450 hover:text-slate-200'
          }`}
        >
          <UserPlus className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Admit</span>
        </Link>
        <Link
          href="/admin/settings"
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === '/admin/settings' ? 'text-violet-400' : 'text-slate-450 hover:text-slate-200'
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Settings</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex flex-col items-center gap-1 transition-all text-slate-450 hover:text-slate-200 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">More Menu</span>
        </button>
      </nav>
      {/* MODAL: PROFILE & PASSWORD RESET */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setProfileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-violet-400" />
              <span>User Profile Details</span>
            </h3>

            {/* Profile Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-950/40 border border-slate-850/60 rounded-xl mb-6">
              <div className="h-14 w-14 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0">
                {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'OW'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-200 truncate">{user.name}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{user.role}</p>
                <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                  <p>📞 Phone: {user.phone}</p>
                  {user.email && <p className="truncate">✉️ Email: {user.email}</p>}
                </div>
              </div>
            </div>

            {/* Reset Password Section (Only for OWNER role) */}
            {user.role === 'OWNER' ? (
              <form onSubmit={handleProfileResetPassword} className="space-y-4 pt-4 border-t border-slate-800/60">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Reset User Password</h4>
                  <button
                    type="button"
                    onClick={() => setResetPhone(user.phone)}
                    className="text-[10px] text-violet-400 hover:text-violet-300 font-bold uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    Reset My Password
                  </button>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">Registered Phone Number</label>
                  <input
                    type="text"
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all font-medium font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-bold text-[9px] uppercase tracking-wider">New Password (Min 6 chars)</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all font-medium font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-violet-600/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {resetSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Confirm Password Reset'
                  )}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 leading-normal text-center">
                ⚠️ Password reset and settings administration are restricted to the primary property owner.
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
