import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, LogOut, Bell, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/types';
import { timeAgo } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        setNotifications(data as AppNotification[]);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };
    fetchNotifs();
  }, [profile]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-20 h-16 glass-strong border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden md:flex items-center gap-2 px-3 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 w-72">
          <Search className="h-4 w-4 shrink-0" />
          <input
            placeholder="Cari..."
            className="bg-transparent text-sm text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
        >
          {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative p-2.5 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl animate-slide-down overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notifikasi</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline">
                    Tanda semua dibaca
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-sm text-neutral-400">Tiada notifikasi</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer',
                        !n.is_read && 'bg-primary-50/50 dark:bg-primary-900/10'
                      )}
                      onClick={() => {
                        if (n.link) navigate(n.link);
                        setNotifOpen(false);
                      }}
                    >
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{n.title}</p>
                      {n.body && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{n.body}</p>}
                      <p className="text-xs text-neutral-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={signOut}
          className="p-2.5 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          title="Log Keluar"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
