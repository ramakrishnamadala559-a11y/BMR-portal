'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
    setMounted(true);
  }, []);

  const applyTheme = (t: 'light' | 'dark') => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  if (!mounted) {
    return (
      <div className="h-10 w-10 p-2.5 bg-slate-900 border border-slate-800 rounded-xl" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 bg-slate-900 border border-slate-800 text-slate-450 hover:text-slate-100 hover:bg-slate-855 rounded-xl transition-all cursor-pointer flex items-center justify-center"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4.5 w-4.5 text-amber-400" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-violet-400" />
      )}
    </button>
  );
}
