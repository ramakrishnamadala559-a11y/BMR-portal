'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Lock, 
  Phone, 
  Mail, 
  Loader2, 
  ShieldCheck, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles,
  KeyRound,
  LayoutGrid,
  Receipt,
  Users,
  Compass,
  ArrowUpRight,
  Home
} from 'lucide-react';
import Toast from '@/components/Toast';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const { login, user, loading, settings } = useAuth();
  const brandName = settings?.hostelName || 'Home Stay Hostel';
  const brandTag = settings?.address || 'Premium Accommodation Stay';
  const router = useRouter();
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).Capacitor) {
        setIsMobileApp(true);
      }
      // Force dark mode for the ambient login experience
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  const [activeTab, setActiveTab] = useState<'admin' | 'student'>('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'STUDENT') {
        router.push('/student/home');
      } else {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setToast({ message: 'Please fill in all fields', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(identifier, password);
      if (res.success) {
        setToast({ message: 'Logged in successfully!', type: 'success' });
      } else {
        setToast({ message: res.error || 'Invalid credentials', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Login failed. Please check your network connection.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080b11] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b11] flex flex-col relative overflow-x-hidden text-slate-100 font-sans selection:bg-violet-650 selection:text-white">
      {/* Softer, more comfortable dynamic fluid gradients */}
      <div className="absolute top-[-10%] left-[-15%] w-[550px] h-[550px] bg-gradient-to-tr from-violet-600/10 via-indigo-600/10 to-violet-850/5 rounded-full blur-[160px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[550px] h-[550px] bg-gradient-to-bl from-indigo-700/10 via-slate-800/10 to-violet-750/5 rounded-full blur-[160px] pointer-events-none animate-float-medium" />
      
      {/* Finer, less distracting grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#131924_1px,transparent_1px),linear-gradient(to_bottom,#131924_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Floating Get Support Badge for Mobile App */}
      {isMobileApp && (
        <div className="absolute top-4 right-4 z-50">
          <a 
            href={`mailto:${settings?.email || 'contact@premiumhostel.com'}`} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b0f17]/70 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 text-xs font-bold rounded-xl text-slate-300 transition-all hover:scale-[1.02] shadow-lg shadow-black/30 hover:text-white cursor-pointer"
          >
            Get Support <ArrowUpRight className="h-3 w-3 text-violet-400" />
          </a>
        </div>
      )}

      {/* Ambient background glow directly behind the login card */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-gradient-to-tr from-violet-600/15 via-fuchsia-500/10 to-cyan-500/15 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* TOP FLOATING NAVBAR */}
      {!isMobileApp && (
        <header className="w-full border-b border-slate-900/60 bg-[#080b11]/70 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/homestay_logo.jpg" alt="Brand Logo" className="h-9 w-9 rounded-xl border border-slate-800 shadow object-cover flex-shrink-0" />
              <div>
                <span className="text-base font-bold text-white tracking-tight">{brandName}</span>
                <span className="text-[8px] block text-violet-400 font-bold uppercase tracking-wider">{brandTag}</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-semibold">
              <a href="#console" className="hover:text-slate-200 transition-colors">Sign In</a>
              <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
              <a href="#security" className="hover:text-slate-200 transition-colors flex items-center gap-1">
                Security <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a 
                href="/app-debug.apk" 
                download="app-debug.apk"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-lg text-white transition-all shadow-md shadow-violet-650/10 hover:scale-[1.02] cursor-pointer"
              >
                Download App <ArrowUpRight className="h-3 w-3" />
              </a>
              <a 
                href={`mailto:${settings?.email || 'contact@premiumhostel.com'}`} 
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold rounded-lg text-slate-300 transition-colors"
              >
                Get Support <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </header>
      )}

      {/* MAIN SINGLE COLUMN CONTAINER */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col items-center gap-12 relative z-10">
        
        {/* SECTION 1: LOGIN CARD (POSITIONED IN MIDDLE TOP) */}
        <div id="console" className="w-full max-w-md p-[1px] bg-gradient-to-b from-slate-800/80 via-slate-900/40 to-[#080b11] rounded-3xl relative shadow-2xl transition-transform duration-300 hover:scale-[1.01] z-10">
          {/* Glowing border outline */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/25 via-fuchsia-500/30 to-cyan-500/25 rounded-3xl opacity-85 blur-[3px] pointer-events-none" />

          {/* Inner Card Container (Glassmorphic) */}
          <div className="bg-[#0b0f17]/75 rounded-[23px] p-6 sm:p-8 backdrop-blur-2xl relative z-10 border border-slate-850/50">
            
            {/* Logo / Brand Header */}
            <div className="flex flex-col items-center mb-6">
              {isMobileApp && (
                <div className="flex flex-col items-center mb-6">
                  <img src="/homestay_logo.jpg" alt="Brand Logo" className="h-16 w-16 rounded-2xl border border-slate-800 shadow-lg object-cover mb-2" />
                  <h1 className="text-lg font-bold text-white tracking-tight">{brandName}</h1>
                  <span className="text-[9px] block text-violet-400 font-bold uppercase tracking-wider text-center max-w-[280px]">{brandTag}</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-2">
                <KeyRound className="h-5 w-5 text-violet-400" /> System Sign In
              </h2>
              <p className="text-slate-400 text-xs mt-1">Single-tenant authentication gateway.</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-355 text-xs font-semibold mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-505">
                    <Phone className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-[#06090f]/75 border border-slate-800/80 hover:border-slate-700 focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500/60 focus:outline-none transition-all shadow-inner"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-350 text-xs font-semibold">Password</label>
                  <button
                    type="button"
                    className="text-xs text-violet-400 hover:text-violet-355 transition-colors font-bold cursor-pointer"
                    onClick={() => setToast({ message: 'Please contact the hostel administrator to reset your credentials.', type: 'info' as any })}
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-505">
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#06090f]/75 border border-slate-800/80 hover:border-slate-700 focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/10 rounded-xl py-2.5 pl-11 pr-11 text-sm text-slate-100 placeholder-slate-500/60 focus:outline-none transition-all shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-750 hover:from-violet-500 hover:via-indigo-500 hover:to-violet-650 text-white rounded-xl text-xs font-bold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30 flex justify-center items-center gap-2 cursor-pointer mt-6"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Authenticate Session
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </form>

            {isMobileApp && settings?.phone && (
              <div className="mt-6 pt-4 border-t border-slate-850/60 text-center">
                <span className="text-[11px] text-slate-400">
                  Emergency Support?{' '}
                  <a 
                    href={`tel:+91${settings.phone}`}
                    className="text-violet-400 font-bold hover:underline"
                  >
                    Call Host
                  </a>
                </span>
              </div>
            )}

          </div>
        </div>

        {/* Contact Info Card */}
        {settings && settings.showContactOnLogin && !isMobileApp && (
          <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl text-xs space-y-3 relative shadow-md">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/60 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              <Building2 className="h-4 w-4 text-violet-400" />
              <span>Contact & Location</span>
            </div>
            <div className="space-y-2 text-slate-400">
              <p className="text-sm font-bold text-slate-200">{brandName}</p>
              <div className="flex items-start gap-2.5">
                <span className="text-slate-500 font-semibold min-w-16">Address:</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 leading-relaxed hover:text-violet-400 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {settings.address}
                  <span className="text-[10px] text-slate-500">🗺️</span>
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-slate-500 font-semibold min-w-16">Phone:</span>
                <a href={`tel:+91${settings.phone}`} className="text-violet-400 hover:underline hover:text-violet-300 font-bold">
                  +91 {settings.phone}
                </a>
              </div>
              {settings.email && (
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 font-semibold min-w-16">Email:</span>
                  <a href={`mailto:${settings.email}`} className="text-violet-400 hover:underline hover:text-violet-300">
                    {settings.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: MARKETING HERO & FEATURES GRID (STACKED BELOW LOGIN) */}
        {!isMobileApp && (
          <div id="features" className="w-full text-center space-y-6 pt-6 border-t border-slate-900/60">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/25 rounded-full text-violet-300 text-xs font-bold shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            Next-Generation Single-Tenant Suite
          </div>
          
          <h2 className="text-3xl sm:text-4.5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl mx-auto">
            The Operating System for <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-450 via-rose-405 to-cyan-405">
              Modern Property Management.
            </span>
          </h2>
          
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Antigravity PG coordinates bookings, simplifies invoice processing, categorizesmess expenses, and monitors role-based staff matrices.
          </p>

          {/* Clean SaaS Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto pt-6 text-left">
            <div className="p-4.5 bg-slate-900/40 border border-slate-900/60 rounded-2xl backdrop-blur-sm">
              <div className="h-8 w-8 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mb-3">
                <LayoutGrid className="h-4 w-4 text-violet-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Visual Room Matrix</h3>
              <p className="text-slate-500 text-[11px] mt-1 leading-snug">Interact with floor-by-floor maps to allocate, check out, and audit beds instantly.</p>
            </div>

            <div className="p-4.5 bg-slate-900/40 border border-slate-900/60 rounded-2xl backdrop-blur-sm">
              <div className="h-8 w-8 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center mb-3">
                <Receipt className="h-4 w-4 text-rose-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Smart Invoicing</h3>
              <p className="text-slate-500 text-[11px] mt-1 leading-snug">Generate receipts, record mess expenses, and view monthly profit summaries.</p>
            </div>

            <div className="p-4.5 bg-slate-900/40 border border-slate-900/60 rounded-2xl backdrop-blur-sm">
              <div className="h-8 w-8 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center mb-3">
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="text-xs font-bold text-white">RBAC Console Settings</h3>
              <p className="text-slate-500 text-[11px] mt-1 leading-snug">Toggle module permissions (View, Edit, Delete) dynamically for staff profiles.</p>
            </div>

            <div className="p-4.5 bg-slate-900/40 border border-slate-900/60 rounded-2xl backdrop-blur-sm">
              <div className="h-8 w-8 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-3">
                <Compass className="h-4 w-4 text-indigo-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Student Self-Service</h3>
              <p className="text-slate-500 text-[11px] mt-1 leading-snug">Tenants check roommate names, trace outstanding dues, and print invoices.</p>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* FOOTER BAR */}
      {!isMobileApp && (
        <footer className="w-full border-t border-slate-900/60 py-8 bg-slate-955/40 backdrop-blur-sm z-10 relative mt-auto text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">


          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-medium pt-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-violet-500/70" />
              <span>&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" /> SSL Encrypted Connection
              </span>
              <span>AES-256/SHA-512 Security</span>
            </div>
          </div>
        </div>
      </footer>
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
