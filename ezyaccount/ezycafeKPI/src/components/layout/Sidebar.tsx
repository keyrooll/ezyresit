import { NavLink, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import {
  LayoutDashboard, CheckSquare, Award, Clock, Users, Megaphone,
  Calendar, FileText, Wrench, AlertTriangle, Settings, BarChart3,
  ChefHat, X, ClipboardList
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { label: 'Tugasan', icon: CheckSquare, to: '/tasks', roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { label: 'KPI & Prestasi', icon: Award, to: '/kpi', roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { label: 'Kehadiran', icon: Clock, to: '/attendance', roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { label: 'Kakitangan', icon: Users, to: '/staff', roles: ['admin', 'manager', 'supervisor'] },
  { label: 'AI Insights', icon: BarChart3, to: '/insights', roles: ['admin', 'manager'] },
  { label: 'Announcement', icon: Megaphone, to: '/announcements', roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { label: 'Kalendar', icon: Calendar, to: '/calendar', roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { label: 'Templat Tugasan', icon: ClipboardList, to: '/templates', roles: ['admin', 'manager'] },
  { label: 'Laporan', icon: FileText, to: '/reports', roles: ['admin', 'manager'] },
  { label: 'Insiden', icon: AlertTriangle, to: '/incidents', roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { label: 'Penyelenggaraan', icon: Wrench, to: '/maintenance', roles: ['admin', 'manager', 'staff'] },
  { label: 'Tetapan', icon: Settings, to: '/settings', roles: ['admin'] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile } = useAuth();
  const location = useLocation();

  const items = useMemo(() => {
    if (!profile) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(profile.role));
  }, [profile]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-neutral-900/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">EzyStaff</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User card at bottom */}
        {profile && (
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-sm font-semibold">
                  {(profile.full_name || profile.email)[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{profile.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
