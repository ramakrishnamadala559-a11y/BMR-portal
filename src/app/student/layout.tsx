'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  Loader2,
  Building2,
  LogOut,
  LayoutDashboard,
  Receipt,
  User,
  Bell,
  Home
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, settings } = useAuth();
  const brandName = settings?.hostelName || 'Home Stay Hostel';
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'STUDENT') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'STUDENT') {
    return (
      <div className="min-h-screen bg-slate-955 flex flex-col items-center justify-center p-4 text-center">
        <div className="flex flex-col items-center mb-6 animate-pulse">
          <img src="/homestay_logo.jpg" alt="Brand Logo" className="h-16 w-16 rounded-2xl border border-slate-800 shadow-lg object-cover mb-3" />
          <h1 className="text-lg font-bold text-white tracking-tight">{brandName}</h1>
        </div>
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-semibold">Authorizing student portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-16 lg:pb-0">
      {/* Top Navbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between px-6 z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <Building2 className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Student Portal</h2>
            <span className="text-[9px] text-slate-400 font-medium">{brandName}</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/student/home"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              pathname === '/student/home'
                ? 'bg-slate-800 text-violet-400 border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Home
          </Link>
          <Link
            href="/student/payments"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              pathname === '/student/payments'
                ? 'bg-slate-800 text-violet-400 border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Payments
          </Link>
          <button
            onClick={() => alert(`For support, please contact the hostel admin at +91 ${settings?.phone || ''} or email ${settings?.email || ''}`)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            Support
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-955 hover:bg-slate-855 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-rose-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Navigation for Mobile Devices */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-4 z-40 lg:hidden">
        <Link
          href="/student/home"
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === '/student/home' ? 'text-violet-400' : 'text-slate-455 hover:text-slate-205'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
        </Link>
        <Link
          href="/student/payments"
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === '/student/payments' ? 'text-violet-400' : 'text-slate-455 hover:text-slate-205'
          }`}
        >
          <Receipt className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Payments</span>
        </Link>
        <button
          onClick={() => alert(`For support, please contact the hostel admin at +91 ${settings?.phone || ''} or email ${settings?.email || ''}`)}
          className="flex flex-col items-center gap-1 text-slate-455 hover:text-slate-205 cursor-pointer"
        >
          <Bell className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Support</span>
        </button>
      </nav>
    </div>
  );
}
