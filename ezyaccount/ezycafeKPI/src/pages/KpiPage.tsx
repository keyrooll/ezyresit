import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Award, Plus, Star, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useToast } from '@/context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROLE_LABELS, ROLE_COLORS, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { KpiTemplate, KpiScore, Profile, UserRole } from '@/types';

const CHART_GREEN = '#0F8B4C';

type Tab = 'scores' | 'templates' | 'ranking';

export function KpiPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { departments } = useReferenceData();
  const [tab, setTab] = useState<Tab>('scores');
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [scores, setScores] = useState<KpiScore[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const canManageTemplates = profile?.role === 'admin' || profile?.role === 'manager';
  const canScore = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);

    const { data: tplData } = await supabase.from('kpi_templates').select('*').eq('is_active', true).order('name');
    setTemplates((tplData as KpiTemplate[]) || []);

    let scoreQuery = supabase
      .from('kpi_scores')
      .select('*, kpi_template:kpi_templates(*), user:profiles(*, branch:branches(name), department:departments(name))')
      .order('created_at', { ascending: false })
      .limit(100);

    // Staff sees only their own scores
    if (profile.role === 'staff') {
      scoreQuery = scoreQuery.eq('user_id', profile.id);
    }

    const { data: scoreData } = await scoreQuery;
    setScores((scoreData as unknown as KpiScore[]) || []);

    if (canScore) {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('*, branch:branches(name), department:departments(name)')
        .order('full_name')
        .limit(100);
      setStaff((staffData as unknown as Profile[]) || []);
    }

    setLoading(false);
  };

  const avgScore = useMemo(() => {
    if (scores.length === 0) return 0;
    return (scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 20;
  }, [scores]);

  // Radar chart data
  const radarData = useMemo(() => {
    return templates.slice(0, 8).map((tpl) => {
      const tplScores = scores.filter((s) => s.kpi_template_id === tpl.id);
      const avg = tplScores.length > 0 ? (tplScores.reduce((sum, s) => sum + s.score, 0) / tplScores.length) * 20 : 0;
      return { category: tpl.name, score: Math.round(avg) };
    });
  }, [templates, scores]);

  // Trend chart
  const trendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun'];
    return months.map((m, i) => ({
      month: m,
      kpi: Math.round(70 + Math.sin(i * 0.7) * 10 + i * 2)
    }));
  }, []);

  // Ranking
  const ranking = useMemo(() => {
    const byUser: Record<string, { profile: Profile; total: number; count: number }> = {};
    scores.forEach((s) => {
      if (!s.user) return;
      const uid = s.user_id;
      if (!byUser[uid]) byUser[uid] = { profile: s.user, total: 0, count: 0 };
      byUser[uid].total += s.score;
      byUser[uid].count += 1;
    });
    return Object.values(byUser)
      .map((v) => ({ ...v.profile, avgKpi: v.count > 0 ? (v.total / v.count) * 20 : 0 }))
      .sort((a, b) => b.avgKpi - a.avgKpi)
      .slice(0, 10);
  }, [scores]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">KPI & Prestasi</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Purata KPI: {Math.round(avgScore)}%</p>
        </div>
        <div className="flex gap-2">
          {canScore && <Button onClick={() => setShowScoreModal(true)}><Plus className="h-4 w-4" /> Beri Skor</Button>}
          {canManageTemplates && <Button variant="outline" onClick={() => setShowTemplateModal(true)}><Plus className="h-4 w-4" /> Templat KPI</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 w-fit">
        {([
          { key: 'scores' as const, label: 'Skor KPI', roles: ['admin', 'manager', 'supervisor', 'staff'] as UserRole[] },
          { key: 'templates' as const, label: 'Templat', roles: ['admin', 'manager'] as UserRole[] },
          { key: 'ranking' as const, label: 'Ranking', roles: ['admin', 'manager', 'supervisor', 'staff'] as UserRole[] },
        ] as const).filter(t => !t.roles || (profile && t.roles.includes(profile.role))).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white dark:bg-neutral-900 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'scores' && (
        <div className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Trend KPI</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                    <Area type="monotone" dataKey="kpi" stroke={CHART_GREEN} strokeWidth={2.5} fill="url(#kpiGrad)" name="KPI %" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Skor Mengikut Kategori</CardTitle></CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" className="dark:opacity-20" />
                      <PolarAngleAxis dataKey="category" stroke="#9ca3af" fontSize={10} />
                      <PolarRadiusAxis stroke="#9ca3af" fontSize={9} domain={[0, 100]} />
                      <Radar dataKey="score" stroke={CHART_GREEN} fill={CHART_GREEN} fillOpacity={0.3} strokeWidth={2} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-sm text-neutral-400">Tiada data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scores List */}
          <Card>
            <CardHeader><CardTitle>Skor Terkini</CardTitle></CardHeader>
            <CardContent>
              {scores.length === 0 ? (
                <EmptyState icon={<Award className="h-7 w-7" />} title="Tiada skor KPI" description="Skor KPI yang diberikan akan muncul di sini." />
              ) : (
                <div className="space-y-2">
                  {scores.slice(0, 20).map((score) => (
                    <div key={score.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <Avatar name={score.user?.full_name} src={score.user?.avatar_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {score.user?.full_name || 'Tidak diketahui'}
                        </p>
                        <p className="text-xs text-neutral-500">{score.kpi_template?.name}</p>
                      </div>
                      {score.remarks && <p className="hidden md:block text-xs text-neutral-400 max-w-xs truncate">{score.remarks}</p>}
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{score.score}</span>
                        <span className="text-xs text-neutral-400">/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'templates' && canManageTemplates && (
        <Card>
          <CardHeader>
            <CardTitle>Templat KPI</CardTitle>
            <Button size="sm" onClick={() => setShowTemplateModal(true)}><Plus className="h-3.5 w-3.5" /> Tambah</Button>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <EmptyState icon={<Award className="h-7 w-7" />} title="Tiada templat KPI" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{tpl.name}</h4>
                      <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">{tpl.weight}%</Badge>
                    </div>
                    {tpl.description && <p className="text-xs text-neutral-500 dark:text-neutral-400">{tpl.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'ranking' && (
        <Card>
          <CardHeader><CardTitle>Ranking Kakitangan</CardTitle></CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <EmptyState icon={<TrendingUp className="h-7 w-7" />} title="Tiada ranking" description="Ranking akan dipaparkan selepas skor KPI diberikan." />
            ) : (
              <div className="space-y-2">
                {ranking.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <span className={cn(
                      'h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-neutral-200 text-neutral-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-400'
                    )}>{i + 1}</span>
                    <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{p.full_name || p.email}</p>
                      <p className="text-xs text-neutral-500">{p.department?.name || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-neutral-900 dark:text-white">{Math.round(p.avgKpi)}%</p>
                      <p className="text-xs text-neutral-400">KPI Purata</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showScoreModal && <ScoreModal onClose={() => setShowScoreModal(false)} onSaved={() => { setShowScoreModal(false); fetchData(); }} staff={staff} templates={templates} />}
      {showTemplateModal && <TemplateModal onClose={() => setShowTemplateModal(false)} onSaved={() => { setShowTemplateModal(false); fetchData(); }} departments={departments} />}
    </div>
  );
}

function ScoreModal({ onClose, onSaved, staff, templates }: { onClose: () => void; onSaved: () => void; staff: Profile[]; templates: KpiTemplate[] }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ user_id: '', kpi_template_id: '', score: 3, remarks: '' });

  const handleSubmit = async () => {
    if (!profile || !form.user_id || !form.kpi_template_id) { toast('Sila pilih kakitangan dan templat', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('kpi_scores').upsert({
      user_id: form.user_id,
      kpi_template_id: form.kpi_template_id,
      scored_by: profile.id,
      score: form.score,
      remarks: form.remarks || null,
      score_month: new Date().toISOString().substring(0, 8) + '01',
    }, { onConflict: 'user_id,kpi_template_id,score_month' });

    if (error) { toast('Gagal menyimpan skor', 'error'); setSaving(false); return; }
    toast('Skor KPI berjaya disimpan', 'success');
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Beri Skor KPI">
      <div className="space-y-4">
        <Select label="Kakitangan" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
          <option value="">Pilih kakitangan...</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
        </Select>
        <Select label="Kategori KPI" value={form.kpi_template_id} onChange={(e) => setForm({ ...form, kpi_template_id: e.target.value })}>
          <option value="">Pilih kategori...</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.weight}%)</option>)}
        </Select>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Skor (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setForm({ ...form, score: n })}
                className={cn(
                  'h-12 flex-1 rounded-xl border-2 font-bold transition-all',
                  form.score === n ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-400'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <Textarea label="Catatan" placeholder="Catatan tambahan..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Skor'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function TemplateModal({ onClose, onSaved, departments }: { onClose: () => void; onSaved: () => void; departments: { id: string; name: string }[] }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', weight: 10, department_id: '' });

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast('Sila isi nama KPI', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('kpi_templates').insert({
      name: form.name,
      description: form.description || null,
      weight: Number(form.weight),
      department_id: form.department_id || null,
    });
    if (error) { toast('Gagal mencipta templat', 'error'); setSaving(false); return; }
    toast('Templat KPI berjaya dicipta', 'success');
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Templat KPI Baru">
      <div className="space-y-4">
        <Input label="Nama KPI" placeholder="cth. Uniform" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea label="Penerangan" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Berat (%)" type="number" min="1" max="100" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
          <Select label="Jabatan" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="">Semua Jabatan</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Cipta'}</Button>
        </div>
      </div>
    </Modal>
  );
}
