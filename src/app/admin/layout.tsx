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
  Home
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hasPermission, settings } = useAuth();
  const brandName = settings?.hostelName || 'Pinewood Home Stay';
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Redirect if not logged in or is student
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'STUDENT') {
        router.push('/student/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role === 'STUDENT') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Authorizing admin access...</p>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, permission: { m: '', a: '' } },
    { name: 'Students', href: '/admin/students', icon: Users, permission: { m: 'students', a: 'view' } },
    { name: 'Admissions', href: '/admin/admissions', icon: UserPlus, permission: { m: 'students', a: 'edit' } },
    { name: 'Rooms & Beds', href: '/admin/rooms', icon: Building2, permission: { m: 'rooms', a: 'view' } },
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

            {/* Mock Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2.5 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/40 hover:border-slate-750 text-slate-400 hover:text-slate-100 rounded-xl transition-all relative"
              >
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-violet-500 rounded-full" />
              </button>
              
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-slide-in">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800/60 mb-3">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wide">PG Notifications</h5>
                    <span className="text-[10px] bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full font-bold">2 New</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-2.5 hover:bg-slate-950/40 rounded-lg transition-colors border border-transparent hover:border-slate-800/40">
                      <p className="text-xs font-bold text-slate-200">Rent Payment Logged</p>
                      <p className="text-[10px] text-slate-500 mt-1">Aarav Mehta paid rent 14,000 for June.</p>
                    </div>
                    <div className="p-2.5 hover:bg-slate-950/40 rounded-lg transition-colors border border-transparent hover:border-slate-800/40">
                      <p className="text-xs font-bold text-slate-200">Bed Allocation Completed</p>
                      <p className="text-[10px] text-slate-500 mt-1">Allocated Room 101 Bed A to Arjun Sen.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Placeholder */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-bold text-slate-200">{user.name}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{user.role}</span>
              </div>
              <div className="h-9 w-9 bg-slate-855 rounded-xl border border-slate-800 flex items-center justify-center">
                <UserIcon className="h-4.5 w-4.5 text-slate-400" />
              </div>
            </div>
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
    </div>
  );
}
