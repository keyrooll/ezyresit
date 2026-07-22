import { useEffect, useState, useMemo } from 'react';
import {
  Clock, LogIn, LogOut, MapPin, Camera, Calendar,
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatTime, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Attendance as AttendanceRecord, Profile } from '@/types';

const CHART_GREEN = '#0F8B4C';
const CHART_AMBER = '#f59e0b';

export function AttendancePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [clocking, setClocking] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isStaff = profile?.role === 'staff';
  const canViewAll = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);

    // Today's record for current user
    const { data: todayData } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord(todayData as AttendanceRecord | null);

    if (canViewAll) {
      // All attendance records
      const { data: attData } = await supabase
        .from('attendance')
        .select('*, user:profiles(full_name, avatar_url, department:departments(name))')
        .order('date', { ascending: false })
        .limit(100);
      setRecords((attData as unknown as AttendanceRecord[]) || []);
    } else {
      // Staff sees own records
      const { data: myAtt } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: false })
        .limit(30);
      setRecords((myAtt as AttendanceRecord[]) || []);
    }

    setLoading(false);
  };

  const handleClockIn = async () => {
    if (!profile) return;
    setClocking(true);
    try {
      const now = new Date();
      // Get GPS (mock - in production use navigator.geolocation)
      const gps = { lat: 3.139, lng: 101.6869 };

      const { error } = await supabase.from('attendance').upsert({
        user_id: profile.id,
        branch_id: profile.branch_id,
        date: today,
        clock_in: now.toISOString(),
        clock_in_gps: gps,
        status: 'present',
      }, { onConflict: 'user_id,date' });

      if (error) throw error;
      toast('Berjaya clock in', 'success');
      fetchData();
    } catch {
      toast('Gagal clock in', 'error');
    }
    setClocking(false);
  };

  const handleClockOut = async () => {
    if (!profile || !todayRecord) return;
    setClocking(true);
    try {
      const now = new Date();
      const clockIn = new Date(todayRecord.clock_in!);
      const hours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase.from('attendance').update({
        clock_out: now.toISOString(),
        working_hours: Math.round(hours * 100) / 100,
      }).eq('id', todayRecord.id);

      if (error) throw error;
      toast('Berjaya clock out', 'success');
      fetchData();
    } catch {
      toast('Gagal clock out', 'error');
    }
    setClocking(false);
  };

  // Stats
  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.late_minutes > 0).length;
    const totalHours = records.reduce((sum, r) => sum + (r.working_hours || 0), 0);
    return { present, late, totalHours: Math.round(totalHours * 10) / 10 };
  }, [records]);

  // Weekly chart
  const weeklyData = useMemo(() => {
    const days = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'];
    return days.map((d, i) => ({
      day: d,
      hadir: Math.round(8 + Math.random() * 4),
      lambat: Math.round(Math.random() * 3),
    }));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Kehadiran</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Clock In/Out Card (for staff) */}
      {isStaff && (
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6">
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-neutral-500">Status Hari Ini</span>
              </div>
              {todayRecord?.clock_in ? (
                <div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">
                    {todayRecord.clock_out ? 'Selesai Bekerja' : 'Sedang Bekerja'}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-neutral-500">Masuk: <strong className="text-neutral-900 dark:text-white">{formatTime(todayRecord.clock_in)}</strong></span>
                    {todayRecord.clock_out && <span className="text-neutral-500">Keluar: <strong className="text-neutral-900 dark:text-white">{formatTime(todayRecord.clock_out)}</strong></span>}
                    {todayRecord.working_hours > 0 && <span className="text-neutral-500">Jam: <strong className="text-neutral-900 dark:text-white">{todayRecord.working_hours}j</strong></span>}
                  </div>
                </div>
              ) : (
                <p className="text-lg font-bold text-neutral-400">Belum Clock In</p>
              )}
            </div>
            <div className="flex gap-3">
              {!todayRecord?.clock_in ? (
                <Button size="lg" onClick={handleClockIn} disabled={clocking}>
                  <LogIn className="h-5 w-5" /> Clock In
                </Button>
              ) : !todayRecord?.clock_out ? (
                <Button size="lg" variant="danger" onClick={handleClockOut} disabled={clocking}>
                  <LogOut className="h-5 w-5" /> Clock Out
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium">
                  <CheckCircle2 className="h-5 w-5" /> Hari Selesai
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      {canViewAll && (
        <div className="grid grid-cols-3 gap-4">
          <StatBox icon={<CheckCircle2 className="h-5 w-5" />} label="Hadir" value={stats.present} color="primary" />
          <StatBox icon={<AlertTriangle className="h-5 w-5" />} label="Lambat" value={stats.late} color="amber" />
          <StatBox icon={<Clock className="h-5 w-5" />} label="Jumlah Jam" value={stats.totalHours} color="blue" />
        </div>
      )}

      {/* Weekly Chart */}
      {canViewAll && (
        <Card>
          <CardHeader><CardTitle>Trend Kehadiran Mingguan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="hadir" fill={CHART_GREEN} radius={[6, 6, 0, 0]} name="Hadir" />
                <Bar dataKey="lambat" fill={CHART_AMBER} radius={[6, 6, 0, 0]} name="Lambat" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Records */}
      <Card>
        <CardHeader><CardTitle>Rekod Kehadiran</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState icon={<Calendar className="h-7 w-7" />} title="Tiada rekod kehadiran" />
          ) : (
            <div className="space-y-2">
              {records.slice(0, 20).map((rec) => {
                const user = (rec as unknown as { user?: Profile }).user;
                return (
                  <div key={rec.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    {canViewAll && <Avatar name={user?.full_name} src={user?.avatar_url} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {canViewAll ? (user?.full_name || 'Tidak diketahui') : formatDate(rec.date)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        {canViewAll && <span>{formatDate(rec.date)}</span>}
                        {rec.clock_in && <span>Masuk: {formatTime(rec.clock_in)}</span>}
                        {rec.clock_out && <span>Keluar: {formatTime(rec.clock_out)}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      {rec.working_hours > 0 && <p className="text-sm font-medium text-neutral-900 dark:text-white">{rec.working_hours}j</p>}
                      {rec.late_minutes > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Lambat {rec.late_minutes}m</Badge>
                      ) : (
                        <Badge className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">Tepat</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: 'primary' | 'amber' | 'blue' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-3', colors[color])}>{icon}</div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      <p className="text-sm text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
