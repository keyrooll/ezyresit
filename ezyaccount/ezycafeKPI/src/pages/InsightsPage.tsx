import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, TrendingDown, TrendingUp, AlertTriangle, Users,
  Clock, Award, Zap, Lightbulb, Activity, Target
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

const CHART_GREEN = '#0F8B4C';
const CHART_RED = '#ef4444';
const CHART_AMBER = '#f59e0b';
const CHART_BLUE = '#3b82f6';

export function InsightsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      const { data } = await supabase
        .from('profiles')
        .select('*, branch:branches(name), department:departments(name)')
        .order('full_name')
        .limit(50);
      setStaff((data as unknown as Profile[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  // AI-generated insights (simulated analysis)
  const insights = useMemo(() => [
    {
      type: 'warning',
      icon: TrendingDown,
      title: 'KPI Menurun - Jabatan Kitchen',
      desc: 'Purata KPI jabatan Kitchen telah menurun 12% dalam bulan ini. Disyorkan untuk semak proses kerja dan latihan semula.',
      severity: 'Tinggi',
      color: 'red',
    },
    {
      type: 'info',
      icon: Clock,
      title: 'Kekerapan Lambat - 3 Kakitangan',
      desc: 'Ahmad, Siti, dan Raj telah lambat lebih 3 kali minggu ini. Pertimbangkan peringatan atau tindakan disiplin.',
      severity: 'Sederhana',
      color: 'amber',
    },
    {
      type: 'success',
      icon: Award,
      title: 'Penampil Cemerlang - Cawangan Bangi',
      desc: 'Cawangan Bangi mencatatkan kadar penyiapan tugasan tertinggi (94%) dan KPI purata 87% bulan ini.',
      severity: 'Maklumat',
      color: 'green',
    },
    {
      type: 'warning',
      icon: AlertTriangle,
      title: 'Tugasan Tertunggak - Jabatan Floor',
      desc: '15 tugasan overdue dalam jabatan Floor minggu ini. Kebanyakannya adalah tugasan harian yang tidak dijadualkan dengan betul.',
      severity: 'Tinggi',
      color: 'red',
    },
    {
      type: 'info',
      icon: Users,
      title: 'Perbandingan Cawangan',
      desc: 'Cawangan Cyberjaya menunjukkan prestasi paling rendah. KPI purata 62% berbanding purata syarikat 78%.',
      severity: 'Sederhana',
      color: 'amber',
    },
    {
      type: 'success',
      icon: Zap,
      title: 'Penambahbaikan Kehadiran',
      desc: 'Kadar kehadiran keseluruhan meningkat 5% minggu ini. Teruskan amalan baik!',
      severity: 'Maklumat',
      color: 'green',
    },
  ], []);

  const branchComparison = useMemo(() => [
    { name: 'Batu Caves', kpi: 82, tasks: 88, attendance: 92 },
    { name: 'Bangi', kpi: 87, tasks: 94, attendance: 95 },
    { name: 'Putrajaya', kpi: 75, tasks: 80, attendance: 88 },
    { name: 'Shah Alam', kpi: 79, tasks: 85, attendance: 90 },
    { name: 'Damansara', kpi: 81, tasks: 83, attendance: 89 },
    { name: 'Cyberjaya', kpi: 62, tasks: 68, attendance: 82 },
  ], []);

  const trendData = useMemo(() => {
    const weeks = ['M1', 'M2', 'M3', 'M4'];
    return weeks.map((w, i) => ({
      week: w,
      kpi: Math.round(72 + Math.sin(i) * 5 + i * 2),
      attendance: Math.round(85 + Math.cos(i) * 4 + i),
      tasks: Math.round(75 + Math.sin(i * 1.5) * 8 + i * 2),
    }));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800/50' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/50' },
    green: { bg: 'bg-primary-50 dark:bg-primary-900/10', text: 'text-primary-600 dark:text-primary-400', border: 'border-primary-200 dark:border-primary-800/50' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">AI Insights</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Analisis automatik & cadangan operasi</p>
        </div>
      </div>

      {/* Summary banner */}
      <Card className="overflow-hidden border-primary-200 dark:border-primary-800/50">
        <div className="bg-gradient-to-r from-primary-50 to-transparent dark:from-primary-900/10 p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Ringkasan Harian untuk Pengurus</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                Sistem telah menganalisis data operasi dan menemui {insights.filter(i => i.type === 'warning').length} isu yang memerlukan perhatian,
                {' '}{insights.filter(i => i.type === 'success').length} perkembangan positif, dan beberapa cadangan untuk penambahbaikan.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Trend Prestasi 4 Minggu</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[50, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="kpi" stroke={CHART_GREEN} strokeWidth={2.5} name="KPI %" />
                <Line type="monotone" dataKey="attendance" stroke={CHART_BLUE} strokeWidth={2.5} name="Kehadiran %" />
                <Line type="monotone" dataKey="tasks" stroke={CHART_AMBER} strokeWidth={2.5} name="Tugasan %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Perbandingan Cawangan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={branchComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="kpi" fill={CHART_GREEN} radius={[4, 4, 0, 0]} name="KPI %" />
                <Bar dataKey="tasks" fill={CHART_BLUE} radius={[4, 4, 0, 0]} name="Tugasan %" />
                <Bar dataKey="attendance" fill={CHART_AMBER} radius={[4, 4, 0, 0]} name="Kehadiran %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights Cards */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" /> Cadangan & Penemuan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            const c = colorMap[insight.color];
            return (
              <Card key={i} className={cn('border', c.border)}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', c.bg, c.text)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{insight.title}</h3>
                        <Badge className={cn(c.bg, c.text, 'shrink-0')}>{insight.severity}</Badge>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">{insight.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Department heatmap-style overview */}
      <Card>
        <CardHeader><CardTitle>Ikhtibar Jabatan</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Floor', 'Kitchen', 'Cashier', 'Steward'].map((dept, i) => {
              const scores = [78, 65, 88, 82];
              const score = scores[i];
              const color = score >= 80 ? 'bg-primary-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={dept} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">{dept}</p>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">{score}%</span>
                    <div className="flex-1 ml-3 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
