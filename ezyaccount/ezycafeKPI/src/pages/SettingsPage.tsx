import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Building2, Clock, Palette, Shield, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Settings, Branch } from '@/types';

type Tab = 'company' | 'branches' | 'attendance' | 'appearance';

export function SettingsPage() {
  const toast = useToast();
  const { branches, departments, shifts } = useReferenceData();
  const [tab, setTab] = useState<Tab>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    company_name: '', company_logo_url: '',
    working_hours_start: '08:00', working_hours_end: '17:00',
    late_grace_minutes: 10, late_threshold_minutes: 15,
    theme: 'light', google_login_enabled: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (data) {
        setSettings(data as Settings);
        setForm({
          company_name: (data as Settings).company_name,
          company_logo_url: (data as Settings).company_logo_url || '',
          working_hours_start: (data as Settings).working_hours_start,
          working_hours_end: (data as Settings).working_hours_end,
          late_grace_minutes: (data as Settings).late_grace_minutes,
          late_threshold_minutes: (data as Settings).late_threshold_minutes,
          theme: (data as Settings).theme,
          google_login_enabled: (data as Settings).google_login_enabled,
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('settings').update({
      company_name: form.company_name,
      company_logo_url: form.company_logo_url || null,
      working_hours_start: form.working_hours_start,
      working_hours_end: form.working_hours_end,
      late_grace_minutes: Number(form.late_grace_minutes),
      late_threshold_minutes: Number(form.late_threshold_minutes),
      theme: form.theme,
      google_login_enabled: form.google_login_enabled,
    }).eq('id', settings.id);
    if (error) { toast('Gagal menyimpan tetapan', 'error'); setSaving(false); return; }
    toast('Tetapan berjaya disimpan', 'success');
    setSaving(false);
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'company', label: 'Syarikat', icon: Building2 },
    { key: 'branches', label: 'Cawangan', icon: Building2 },
    { key: 'attendance', label: 'Kehadiran', icon: Clock },
    { key: 'appearance', label: 'Penampilan', icon: Palette },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Tetapan</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Konfigurasi sistem</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 p-1 lg:p-0 rounded-xl bg-neutral-100 dark:bg-neutral-800 lg:bg-transparent lg:dark:bg-transparent">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 lg:flex-none text-left',
                  tab === t.key ? 'bg-white dark:bg-neutral-900 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}>
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'company' && (
            <Card>
              <CardHeader><CardTitle>Maklumat Syarikat</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input label="Nama Syarikat" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                  <Input label="URL Logo" placeholder="https://..." value={form.company_logo_url} onChange={(e) => setForm({ ...form, company_logo_url: e.target.value })} />
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                    <Shield className="h-5 w-5 text-neutral-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Google Login</p>
                      <p className="text-xs text-neutral-400">Benarkan log masuk menggunakan akaun Google</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={form.google_login_enabled} onChange={(e) => setForm({ ...form, google_login_enabled: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'branches' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cawangan ({branches.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {branches.map((b: Branch) => (
                      <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm">{b.code || b.name.substring(0, 2).toUpperCase()}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{b.name}</p>
                          <p className="text-xs text-neutral-400">{b.address || '-'}</p>
                        </div>
                        <Badge className={b.is_active ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'bg-neutral-100 text-neutral-500'}>{b.is_active ? 'Aktif' : 'Tidak Aktif'}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Jabatan ({departments.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {departments.map((d) => <Badge key={d.id} className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{d.name}</Badge>)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Shift ({shifts.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {shifts.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                        <span className="text-xs text-neutral-400">{s.start_time} - {s.end_time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'attendance' && (
            <Card>
              <CardHeader><CardTitle>Peraturan Kehadiran</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Masa Kerja Mula" type="time" value={form.working_hours_start} onChange={(e) => setForm({ ...form, working_hours_start: e.target.value })} />
                    <Input label="Masa Kerja Tamat" type="time" value={form.working_hours_end} onChange={(e) => setForm({ ...form, working_hours_end: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Grace Period (minit)" type="number" value={form.late_grace_minutes} onChange={(e) => setForm({ ...form, late_grace_minutes: Number(e.target.value) })} />
                    <Input label="Threshold Lambat (minit)" type="number" value={form.late_threshold_minutes} onChange={(e) => setForm({ ...form, late_threshold_minutes: Number(e.target.value) })} />
                  </div>
                  <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'appearance' && (
            <Card>
              <CardHeader><CardTitle>Tema</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select label="Tema Lalai" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
                    <option value="light">Cerah</option>
                    <option value="dark">Gelap</option>
                  </Select>
                  <div className="flex gap-3">
                    <div className={cn('flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all', form.theme === 'light' ? 'border-primary-600 bg-primary-50/50' : 'border-neutral-200 dark:border-neutral-700')} onClick={() => setForm({ ...form, theme: 'light' })}>
                      <div className="h-20 rounded-lg bg-white border border-neutral-200 mb-2" />
                      <p className="text-sm font-medium text-center">Cerah</p>
                    </div>
                    <div className={cn('flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all', form.theme === 'dark' ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700')} onClick={() => setForm({ ...form, theme: 'dark' })}>
                      <div className="h-20 rounded-lg bg-neutral-900 border border-neutral-700 mb-2" />
                      <p className="text-sm font-medium text-center">Gelap</p>
                    </div>
                  </div>
                  <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
