import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, CheckCircle2, Clock, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { INCIDENT_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, formatDateTime, timeAgo } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { IncidentReport, IncidentType, TaskPriority, Profile } from '@/types';

export function IncidentsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { branches, departments } = useReferenceData();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchIncidents(); }, [profile]);

  const fetchIncidents = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('incident_reports')
      .select('*, reporter:profiles!reported_by(full_name, avatar_url), branch:branches(name), department:departments(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    setIncidents((data as unknown as IncidentReport[]) || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = profile?.id;
    }
    const { error } = await supabase.from('incident_reports').update(updates).eq('id', id);
    if (error) { toast('Gagal mengemaskini', 'error'); return; }
    toast('Status dikemaskini', 'success');
    fetchIncidents();
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    resolved: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  };
  const statusLabels: Record<string, string> = { pending: 'Menunggu', in_progress: 'Sedang Dijalankan', resolved: 'Selesai' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Laporan Insiden</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{incidents.length} insiden</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Lapor Insiden</Button>
      </div>

      {incidents.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="h-7 w-7" />} title="Tiada insiden" description="Laporan insiden akan dipaparkan di sini." action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Lapor Insiden</Button>} />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const reporter = inc.reported_by ? { full_name: (inc as unknown as { reporter: Profile }).reporter?.full_name, avatar_url: (inc as unknown as { reporter: Profile }).reporter?.avatar_url } : null;
            return (
              <Card key={inc.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {reporter && <Avatar name={reporter.full_name} src={reporter.avatar_url} size="sm" />}
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{reporter?.full_name || 'Tidak diketahui'}</p>
                        <p className="text-xs text-neutral-400">{timeAgo(inc.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={cn(PRIORITY_COLORS[inc.priority])}>{PRIORITY_LABELS[inc.priority]}</Badge>
                      <Badge className={cn(statusColors[inc.status])}>{statusLabels[inc.status]}</Badge>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{inc.title}</h3>
                  {inc.description && <p className="text-sm text-neutral-600 dark:text-neutral-300">{inc.description}</p>}
                  <div className="flex items-center gap-3 mt-3 text-xs text-neutral-400">
                    <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{INCIDENT_TYPE_LABELS[inc.type]}</Badge>
                    {inc.photo_urls?.length > 0 && <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {inc.photo_urls.length} foto</span>}
                  </div>
                  {inc.status !== 'resolved' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(inc.id, 'in_progress')}>Mula Proses</Button>
                      <Button size="sm" onClick={() => updateStatus(inc.id, 'resolved')}><CheckCircle2 className="h-3.5 w-3.5" /> Selesai</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showCreate && <CreateIncidentModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchIncidents(); }} branches={branches} departments={departments} />}
    </div>
  );
}

function CreateIncidentModal({ onClose, onSaved, branches, departments }: { onClose: () => void; onSaved: () => void; branches: { id: string; name: string }[]; departments: { id: string; name: string }[] }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', type: 'maintenance' as IncidentType,
    branch_id: '', department_id: '', priority: 'medium' as TaskPriority, photo_url: '',
  });

  const handleSubmit = async () => {
    if (!profile || !form.title.trim()) { toast('Sila isi tajuk', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('incident_reports').insert({
      title: form.title, description: form.description || null, type: form.type,
      reported_by: profile.id, branch_id: form.branch_id || null, department_id: form.department_id || null,
      photo_urls: form.photo_url ? [form.photo_url] : [], priority: form.priority,
    });
    if (error) { toast('Gagal melaporkan insiden', 'error'); setSaving(false); return; }
    toast('Insiden berjaya dilaporkan', 'success');
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Lapor Insiden" size="lg">
      <div className="space-y-4">
        <Input label="Tajuk" placeholder="cth. Mesin POS Rosak" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea label="Penerangan" placeholder="Terangkan insiden..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Jenis Insiden" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as IncidentType })}>
            {Object.entries(INCIDENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Prioriti" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Cawangan" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">-</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label="Jabatan" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="">-</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <Input label="URL Foto (opsyenal)" placeholder="https://..." value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Hantar Laporan'}</Button>
        </div>
      </div>
    </Modal>
  );
}
