import { useEffect, useState } from 'react';
import { Wrench, Plus, CheckCircle2, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PRIORITY_LABELS, PRIORITY_COLORS, formatDate, timeAgo } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { MaintenanceRequest, TaskPriority } from '@/types';

const MACHINE_TYPES = ['Mesin Kopi', 'POS', 'Printer', 'Aircond', 'Lampu', 'Perabot'];

export function MaintenancePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { branches } = useReferenceData();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchRequests(); }, [profile]);

  const fetchRequests = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*, branch:branches(name), requester:profiles!requested_by(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
    setRequests((data as unknown as MaintenanceRequest[]) || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completion_date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('maintenance_requests').update(updates).eq('id', id);
    if (error) { toast('Gagal mengemaskini', 'error'); return; }
    toast('Status dikemaskini', 'success');
    fetchRequests();
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  };
  const statusLabels: Record<string, string> = { pending: 'Menunggu', in_progress: 'Sedang Dijalankan', completed: 'Selesai' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Penyelenggaraan</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{requests.length} permintaan</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Permintaan Baru</Button>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<Wrench className="h-7 w-7" />} title="Tiada permintaan penyelenggaraan" description="Permintaan akan dipaparkan di sini." action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Buat Permintaan</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"><Wrench className="h-5 w-5 text-neutral-500" /></div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{req.machine_name}</p>
                      {req.machine_type && <p className="text-xs text-neutral-400">{req.machine_type}</p>}
                    </div>
                  </div>
                  <Badge className={cn(statusColors[req.status])}>{statusLabels[req.status]}</Badge>
                </div>
                {req.description && <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-3 line-clamp-2">{req.description}</p>}
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <Badge className={cn(PRIORITY_COLORS[req.priority])}>{PRIORITY_LABELS[req.priority]}</Badge>
                  <span>{timeAgo(req.created_at)}</span>
                </div>
                {req.status !== 'completed' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
                    {req.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus(req.id, 'in_progress')}>Mula</Button>}
                    <Button size="sm" onClick={() => updateStatus(req.id, 'completed')}><CheckCircle2 className="h-3.5 w-3.5" /> Selesai</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateMaintenanceModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchRequests(); }} branches={branches} />}
    </div>
  );
}

function CreateMaintenanceModal({ onClose, onSaved, branches }: { onClose: () => void; onSaved: () => void; branches: { id: string; name: string }[] }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    machine_name: '', machine_type: '', description: '', branch_id: '',
    photo_url: '', priority: 'medium' as TaskPriority,
  });

  const handleSubmit = async () => {
    if (!profile || !form.machine_name.trim()) { toast('Sila isi nama mesin', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('maintenance_requests').insert({
      machine_name: form.machine_name, machine_type: form.machine_type || null,
      description: form.description || null, requested_by: profile.id,
      branch_id: form.branch_id || null, photo_url: form.photo_url || null,
      priority: form.priority,
    });
    if (error) { toast('Gagal mencipta permintaan', 'error'); setSaving(false); return; }
    toast('Permintaan berjaya dicipta', 'success');
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Permintaan Penyelenggaraan">
      <div className="space-y-4">
        <Input label="Nama Mesin" placeholder="cth. Mesin Kopi Espresso" value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })} />
        <Select label="Jenis Mesin" value={form.machine_type} onChange={(e) => setForm({ ...form, machine_type: e.target.value })}>
          <option value="">Pilih jenis...</option>
          {MACHINE_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Textarea label="Penerangan Masalah" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Cawangan" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">-</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label="Prioriti" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <Input label="URL Foto (opsyenal)" placeholder="https://..." value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Hantar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
