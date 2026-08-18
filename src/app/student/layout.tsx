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
  const brandName = settings?.hostelName || 'Pinewood Home Stay';
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
      <div className="min-h-screen bg-slate-955 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Authorizing student portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-16 lg:pb-0">
      {/* Top Navbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between px-6 z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <Home className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Student Portal</h2>
            <span className="text-[9px] text-slate-400 font-medium">{brandName}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-855 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-rose-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
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
          href="/student/dashboard"
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === '/student/dashboard' ? 'text-violet-400' : 'text-slate-450 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">My PG Room</span>
        </Link>
        <button
          onClick={() => alert('No active PG Announcements at the moment.')}
          className="flex flex-col items-center gap-1 text-slate-450 hover:text-slate-200"
        >
          <Bell className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Announce</span>
        </button>
      </nav>
    </div>
  );
}
