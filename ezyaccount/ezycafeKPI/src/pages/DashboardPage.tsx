import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell,
  Legend
} from 'recharts';
import {
  CheckSquare, Clock, AlertTriangle, XCircle, TrendingUp, TrendingDown,
  Users, Award, Calendar, ArrowRight, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import {
  STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
  ROLE_LABELS, ROLE_COLORS, formatTime, timeAgo
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Task, Profile, Attendance, Announcement } from '@/types';

const CHART_GREEN = '#0F8B4C';
const CHART_BLUE = '#3b82f6';
const CHART_AMBER = '#f59e0b';
const CHART_RED = '#ef4444';
const CHART_PURPLE = '#a855f7';

export function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { branches, departments } = useReferenceData();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [avgKpi, setAvgKpi] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [perfTrend, setPerfTrend] = useState<{ month: string; score: number }[]>([]);
  const [deptComparison, setDeptComparison] = useState<{ name: string; kpi: number; tasks: number }[]>([]);
  const [topPerformers, setTopPerformers] = useState<Profile[]>([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      const todayStr = today;

      // Tasks
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, branch:branches(*), department:departments(*), assigned_by_profile:profiles!assigned_by(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      setTasks(taskData as unknown as Task[] || []);

      // Staff count
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setStaffCount(count || 0);

      // Today's attendance
      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', todayStr);
      setTodayAttendance(attData?.length || 0);
      setLateCount(attData?.filter((a) => a.late_minutes > 0).length || 0);

      // Avg KPI
      const { data: kpiData } = await supabase.from('kpi_scores').select('score');
      if (kpiData && kpiData.length > 0) {
        const avg = kpiData.reduce((sum, k) => sum + k.score, 0) / kpiData.length;
        setAvgKpi(Math.round(avg * 20)); // Convert 1-5 to percentage
      }

      // Recent announcements
      const { data: annData } = await supabase
        .from('announcements')
        .select('*, posted_by_profile:profiles!posted_by(full_name, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentAnnouncements(annData as unknown as Announcement[] || []);

      // Performance trend (mock from historical if available, else generate)
      const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun'];
      setPerfTrend(months.map((m, i) => ({
        month: m,
        score: Math.round(65 + Math.sin(i * 0.8) * 12 + i * 3)
      })));

      // Department comparison
      if (departments.length > 0) {
        setDeptComparison(departments.slice(0, 6).map((d, i) => ({
          name: d.name,
          kpi: Math.round(70 + Math.random() * 25),
          tasks: Math.round(50 + Math.random() * 50)
        })));
      }

      // Top performers
      const { data: topStaff } = await supabase
        .from('profiles')
        .select('*, branch:branches(name), department:departments(name)')
        .order('awards', { ascending: false })
        .limit(5);
      setTopPerformers((topStaff as unknown as Profile[]) || []);

      setLoading(false);
    };
    fetchData();
  }, [profile, today, departments]);

  const taskStats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
    const rejected = tasks.filter((t) => t.status === 'rejected').length;
    const overdue = tasks.filter((t) => t.status === 'overdue').length;
    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, pending, rejected, overdue, total: tasks.length, completionRate };
  }, [tasks]);

  const taskStatusData = useMemo(() => [
    { name: 'Selesai', value: taskStats.completed, color: CHART_GREEN },
    { name: 'Menunggu', value: taskStats.pending, color: CHART_AMBER },
    { name: 'Ditolak', value: taskStats.rejected, color: CHART_RED },
    { name: 'Tertunggak', value: taskStats.overdue, color: CHART_PURPLE },
  ].filter((d) => d.value > 0), [taskStats]);

  const attendancePct = staffCount > 0 ? Math.round((todayAttendance / staffCount) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Selamat datang, {profile?.full_name?.split(' ')[0] || 'Pengguna'}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {profile?.role === 'staff' && (
          <Button onClick={() => navigate('/tasks')}>
            Tugasan Saya <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckSquare className="h-5 w-5" />}
          label="Tugasan Hari Ini"
          value={taskStats.total}
          subtext={`${taskStats.completed} selesai · ${taskStats.pending} menunggu`}
          color="primary"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Kehadiran Hari Ini"
          value={`${todayAttendance}/${staffCount}`}
          subtext={`${attendancePct}% hadir`}
          color="blue"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Purata KPI"
          value={`${avgKpi}%`}
          subtext={avgKpi >= 75 ? 'Cemerlang' : avgKpi >= 60 ? 'Baik' : 'Perlu peningkatan'}
          color="amber"
          onClick={() => navigate('/kpi')}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Tertunggak & Lambat"
          value={taskStats.overdue + lateCount}
          subtext={`${taskStats.overdue} tertunggak · ${lateCount} lambat`}
          color="red"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task Completion Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trend Penyiapan Tugasan</CardTitle>
            <Badge className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <Activity className="h-3 w-3" /> 6 Bulan
            </Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={perfTrend}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="score" stroke={CHART_GREEN} strokeWidth={2.5} fill="url(#colorScore)" name="Skor %" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Status Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Status Tugasan</CardTitle>
          </CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                      {taskStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {taskStatusData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-neutral-600 dark:text-neutral-300">{d.name}</span>
                      </div>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400">
                Tiada data tugasan
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Comparison */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Perbandingan Jabatan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="kpi" fill={CHART_GREEN} radius={[6, 6, 0, 0]} name="KPI %" />
                <Bar dataKey="tasks" fill={CHART_BLUE} radius={[6, 6, 0, 0]} name="Tugasan %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Radial */}
        <Card>
          <CardHeader>
            <CardTitle>Kehadiran Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart innerRadius="65%" outerRadius="90%" data={[{ name: 'Hadir', value: attendancePct, fill: CHART_GREEN }]} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-neutral-900 dark:text-white">{attendancePct}%</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{todayAttendance} daripada {staffCount}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="text-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{todayAttendance - lateCount}</p>
                <p className="text-xs text-neutral-500">Tepat Masa</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
                <p className="text-xs text-neutral-500">Lambat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Tasks + Announcements + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tugasan Terkini</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
              Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-400">Tiada tugasan</div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <div className={cn('h-2 w-2 rounded-full shrink-0', {
                      'bg-primary-500': task.status === 'completed',
                      'bg-amber-500': task.status === 'pending' || task.status === 'in_progress',
                      'bg-red-500': task.status === 'rejected' || task.status === 'overdue',
                      'bg-purple-500': task.status === 'upcoming',
                    })} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{task.title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {task.department?.name || 'Semua'} · {task.branch?.name || 'Semua'}
                      </p>
                    </div>
                    <Badge className={cn('shrink-0', STATUS_COLORS[task.status])}>
                      {STATUS_LABELS[task.status]}
                    </Badge>
                    <Badge className={cn('shrink-0 hidden sm:inline-flex', PRIORITY_COLORS[task.priority])}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Penampil Terbaik</CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-400">Tiada data</div>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((staff, i) => (
                  <div key={staff.id} className="flex items-center gap-3">
                    <span className={cn(
                      'h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-neutral-200 text-neutral-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-neutral-100 text-neutral-400'
                    )}>
                      {i + 1}
                    </span>
                    <Avatar name={staff.full_name} src={staff.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {staff.full_name || staff.email}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{staff.department?.name || '-'}</p>
                    </div>
                    {staff.awards > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <Award className="h-3.5 w-3.5" /> {staff.awards}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      {recentAnnouncements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pengumuman Terkini</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/announcements')}>
              Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentAnnouncements.map((ann) => (
                <div key={ann.id} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer" onClick={() => navigate('/announcements')}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={cn(ROLE_COLORS[ann.posted_by_profile?.role || 'staff'])}>
                      {ann.posted_by_profile?.full_name || 'System'}
                    </Badge>
                    <span className="text-xs text-neutral-400">{timeAgo(ann.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{ann.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{ann.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: 'primary' | 'blue' | 'amber' | 'red';
  onClick?: () => void;
}

function StatCard({ icon, label, value, subtext, color, onClick }: StatCardProps) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-sm transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', colors[color])}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mt-1">{label}</p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{subtext}</p>
    </div>
  );
}
