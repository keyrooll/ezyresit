import { useEffect, useState, useMemo } from 'react';
import { Users, Search, Plus, Award, AlertTriangle, Phone, Mail, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROLE_LABELS, ROLE_COLORS, EMPLOYMENT_STATUS_LABELS, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Profile, UserRole, EmploymentStatus } from '@/types';

export function StaffPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { branches, departments, positions, shifts } = useReferenceData();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const canEdit = profile?.role === 'admin';

  useEffect(() => { fetchStaff(); }, [profile]);

  const fetchStaff = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, branch:branches(*), department:departments(*), position:positions(*), shift:shifts(*), supervisor:profiles!supervisor_id(full_name, avatar_url)')
      .order('full_name')
      .limit(200);
    setStaff((data as unknown as Profile[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        if (!s.full_name?.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !s.employee_id?.toLowerCase().includes(q)) return false;
      }
      if (filterBranch && s.branch_id !== filterBranch) return false;
      if (filterDept && s.department_id !== filterDept) return false;
      return true;
    });
  }, [staff, search, filterBranch, filterDept]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Kakitangan</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{filtered.length} kakitangan</p>
        </div>
        {canEdit && <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Tambah Kakitangan</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, email, ID..." className="w-full h-10 pl-10 pr-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
        </div>
        <Select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-auto">
          <option value="">Semua Cawangan</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-auto">
          <option value="">Semua Jabatan</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7" />} title="Tiada kakitangan" description="Kakitangan akan dipaparkan di sini." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} onClick={() => setSelected(s)} className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <Avatar name={s.full_name} src={s.avatar_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{s.full_name || s.email}</p>
                  <p className="text-xs text-neutral-500 truncate">{s.position?.title || s.department?.name || 'Tanpa jabatan'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={cn(ROLE_COLORS[s.role])}>{ROLE_LABELS[s.role]}</Badge>
                    {s.awards > 0 && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><Award className="h-3 w-3" /> {s.awards}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/50 text-xs text-neutral-400">
                <span>{s.branch?.name || 'Tanpa cawangan'}</span>
                {s.employment_status !== 'active' && <Badge className="bg-neutral-100 text-neutral-500">{EMPLOYMENT_STATUS_LABELS[s.employment_status]}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Detail */}
      {selected && (
        <Modal open={true} onClose={() => setSelected(null)} title="Profil Kakitangan" size="lg">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={selected.full_name} src={selected.avatar_url} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{selected.full_name || selected.email}</h3>
                <p className="text-sm text-neutral-500">{selected.position?.title || '-'}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={cn(ROLE_COLORS[selected.role])}>{ROLE_LABELS[selected.role]}</Badge>
                  <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{EMPLOYMENT_STATUS_LABELS[selected.employment_status]}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="ID Pekerja" value={selected.employee_id || '-'} />
              <DetailItem label="Email" value={selected.email} />
              <DetailItem label="Telefon" value={selected.phone || '-'} />
              <DetailItem label="Cawangan" value={selected.branch?.name || '-'} />
              <DetailItem label="Jabatan" value={selected.department?.name || '-'} />
              <DetailItem label="Shift" value={selected.shift?.name || '-'} />
              <DetailItem label="Penyelia" value={selected.supervisor?.full_name || '-'} />
              <DetailItem label="Tarikh Sertai" value={formatDate(selected.join_date)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 flex items-center gap-3">
                <Award className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{selected.awards}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Anugerah</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{selected.warnings}</p>
                  <p className="text-xs text-red-600 dark:text-red-500">Amaran</p>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button variant="outline" onClick={() => { setShowEdit(true); }}><Users className="h-4 w-4" /> Edit Profil</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <EditProfileModal profile={selected} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); setSelected(null); fetchStaff(); }} branches={branches} departments={departments} positions={positions} shifts={shifts} staff={staff} />
      )}

      {/* Add Modal */}
      {showAdd && (
        <EditProfileModal profile={null} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchStaff(); }} branches={branches} departments={departments} positions={positions} shifts={shifts} staff={staff} />
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{value}</p>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved, branches, departments, positions, shifts, staff }: {
  profile: Profile | null;
  onClose: () => void; onSaved: () => void;
  branches: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  positions: { id: string; title: string; department_id: string | null }[];
  shifts: { id: string; name: string }[];
  staff: Profile[];
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    employee_id: profile?.employee_id || '',
    role: profile?.role || 'staff' as UserRole,
    branch_id: profile?.branch_id || '',
    department_id: profile?.department_id || '',
    position_id: profile?.position_id || '',
    shift_id: profile?.shift_id || '',
    supervisor_id: profile?.supervisor_id || '',
    join_date: profile?.join_date || '',
    employment_status: profile?.employment_status || 'active' as EmploymentStatus,
    awards: profile?.awards || 0,
    warnings: profile?.warnings || 0,
  });

  const filteredPositions = positions.filter((p) => !form.department_id || p.department_id === form.department_id);

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { toast('Sila isi nama dan email', 'error'); return; }
    setSaving(true);
    if (profile) {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name, phone: form.phone || null, employee_id: form.employee_id || null,
        role: form.role, branch_id: form.branch_id || null, department_id: form.department_id || null,
        position_id: form.position_id || null, shift_id: form.shift_id || null,
        supervisor_id: form.supervisor_id || null, join_date: form.join_date || null,
        employment_status: form.employment_status, awards: form.awards, warnings: form.warnings,
      }).eq('id', profile.id);
      if (error) { toast('Gala mengemaskini profil', 'error'); setSaving(false); return; }
      toast('Profil berjaya dikemaskini', 'success');
    } else {
      // Create new - requires auth user to exist first; in this flow admin assigns existing users
      toast('Untuk menambah kakitangan, pengguna perlu log masuk dengan Google terlebih dahulu', 'info');
      setSaving(false);
      onClose();
      return;
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title={profile ? 'Edit Profil' : 'Tambah Kakitangan'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nama Penuh" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!profile} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="ID Pekerja" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Peranan" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Status" value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value as EmploymentStatus })}>
            {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Cawangan" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">-</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label="Jabatan" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value, position_id: '' })}>
            <option value="">-</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Jawatan" value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
            <option value="">-</option>
            {filteredPositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select label="Shift" value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })}>
            <option value="">-</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Penyelia" value={form.supervisor_id} onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}>
            <option value="">-</option>
            {staff.filter((s) => s.role === 'supervisor' || s.role === 'manager').map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </Select>
          <Input label="Tarikh Sertai" type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Anugerah" type="number" value={form.awards} onChange={(e) => setForm({ ...form, awards: Number(e.target.value) })} />
          <Input label="Amaran" type="number" value={form.warnings} onChange={(e) => setForm({ ...form, warnings: Number(e.target.value) })} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </div>
    </Modal>
  );
}
