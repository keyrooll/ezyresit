import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Plus, Search, Filter, Clock, Calendar, MapPin,
  CheckCircle2, XCircle, AlertCircle, Camera, Video, MessageSquare,
  ArrowLeft, Paperclip
} from 'lucide-react';
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
import {
  STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
  REPEAT_LABELS, formatDate, formatDateTime, formatTime
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority, TaskRepeat, Profile, TaskEvidence } from '@/types';

type FilterStatus = 'all' | TaskStatus;
type FilterPriority = 'all' | TaskPriority;

export function TasksPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { branches, departments } = useReferenceData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const canCreate = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';
  const canApprove = canCreate;

  useEffect(() => {
    fetchTasks();
  }, [profile]);

  const fetchTasks = async () => {
    if (!profile) return;
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*, branch:branches(*), department:departments(*), assignments:task_assignments(user_id), evidence:task_evidence(*), assigned_by_profile:profiles!assigned_by(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(200);

    // Staff sees only tasks assigned to them
    if (profile.role === 'staff') {
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', profile.id);
      const taskIds = assignments?.map((a) => a.task_id) || [];
      if (taskIds.length > 0) {
        query = query.in('id', taskIds);
      } else {
        setTasks([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await query;
    setTasks((data as unknown as Task[]) || []);
    setLoading(false);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority]);

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completion_time = new Date().toISOString();
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (error) {
      toast('Gagal mengemaskini status tugasan', 'error');
    } else {
      toast(`Tugasan ${STATUS_LABELS[status].toLowerCase()}`, 'success');
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, status } : null);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </div>
    );
  }

  if (selectedTask) {
    return <TaskDetail task={selectedTask} onBack={() => { setSelectedTask(null); fetchTasks(); }} onUpdateStatus={updateTaskStatus} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Tugasan</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {filteredTasks.length} tugasan ditemui
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Tugasan Baru
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tugasan..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)} className="w-auto">
          <option value="all">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as FilterPriority)} className="w-auto">
          <option value="all">Semua Prioriti</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-7 w-7" />}
          title="Tiada tugasan"
          description="Tugasan yang dibuat akan muncul di sini."
          action={canCreate ? <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Buat Tugasan</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchTasks(); }}
          branches={branches}
          departments={departments}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge className={cn(STATUS_COLORS[task.status])}>{STATUS_LABELS[task.status]}</Badge>
        <Badge className={cn(PRIORITY_COLORS[task.priority])}>{PRIORITY_LABELS[task.priority]}</Badge>
      </div>
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1 line-clamp-2">{task.title}</h3>
      {task.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3">{task.description}</p>}
      <div className="flex items-center gap-3 text-xs text-neutral-400">
        {task.department && <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {task.department.name}</span>}
        {task.branch && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {task.branch.name}</span>}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <Calendar className="h-3 w-3" />
          {formatDate(task.due_date || task.start_date)}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          {task.repeat_type !== 'one_time' && <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{REPEAT_LABELS[task.repeat_type]}</Badge>}
          {task.evidence && task.evidence.length > 0 && (
            <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> {task.evidence.length}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskDetail({ task, onBack, onUpdateStatus }: { task: Task; onBack: () => void; onUpdateStatus: (id: string, status: TaskStatus) => void }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [evidence, setEvidence] = useState<TaskEvidence[]>(task.evidence || []);
  const [showSubmit, setShowSubmit] = useState(false);
  const canApprove = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';

  const submitEvidence = async (photoUrl: string, remark: string) => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('task_evidence')
      .insert({ task_id: task.id, user_id: profile.id, photo_url: photoUrl, remark })
      .select('*');
    if (error) {
      toast('Gagal menghantar bukti', 'error');
    } else {
      setEvidence((prev) => [...prev, ...(data as TaskEvidence[])]);
      toast('Bukti dihantar', 'success');
      setShowSubmit(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge className={cn(STATUS_COLORS[task.status])}>{STATUS_LABELS[task.status]}</Badge>
                  <Badge className={cn(PRIORITY_COLORS[task.priority])}>{PRIORITY_LABELS[task.priority]}</Badge>
                  {task.repeat_type !== 'one_time' && <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{REPEAT_LABELS[task.repeat_type]}</Badge>}
                </div>
              </div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{task.title}</h1>
              {task.description && <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{task.description}</p>}

              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Tarikh Mula" value={formatDate(task.start_date)} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Tarikh Tamat" value={formatDate(task.due_date)} />
                {task.start_time && <InfoRow icon={<Clock className="h-4 w-4" />} label="Masa Mula" value={task.start_time} />}
                {task.end_time && <InfoRow icon={<Clock className="h-4 w-4" />} label="Masa Tamat" value={task.end_time} />}
                {task.department && <InfoRow icon={<CheckSquare className="h-4 w-4" />} label="Jabatan" value={task.department.name} />}
                {task.branch && <InfoRow icon={<MapPin className="h-4 w-4" />} label="Cawangan" value={task.branch.name} />}
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Anggaran" value={`${task.estimated_duration_minutes} min`} />
              </div>

              {/* Requirements */}
              <div className="flex flex-wrap gap-2 mt-4">
                {task.photo_required && <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"><Camera className="h-3 w-3" /> Foto Diperlukan</Badge>}
                {task.video_required && <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"><Video className="h-3 w-3" /> Video Diperlukan</Badge>}
                {task.remark_required && <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"><MessageSquare className="h-3 w-3" /> Catatan Diperlukan</Badge>}
                {task.gps_required && <Badge className="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"><MapPin className="h-3 w-3" /> GPS Diperlukan</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Bukti & Catatan</h3>
              {profile?.role === 'staff' && (
                <Button size="sm" variant="outline" onClick={() => setShowSubmit(true)}>
                  <Plus className="h-3.5 w-3.5" /> Hantar Bukti
                </Button>
              )}
            </div>
            <CardContent>
              {evidence.length === 0 ? (
                <p className="text-sm text-neutral-400 py-6 text-center">Tiada bukti dihantar lagi</p>
              ) : (
                <div className="space-y-3">
                  {evidence.map((ev) => (
                    <div key={ev.id} className="flex gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                      {ev.photo_url && <img src={ev.photo_url} alt="Bukti" className="h-16 w-16 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0">
                        {ev.remark && <p className="text-sm text-neutral-700 dark:text-neutral-300">{ev.remark}</p>}
                        <p className="text-xs text-neutral-400 mt-1">{formatDateTime(ev.submitted_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Tindakan</h3>
              <div className="space-y-2">
                {profile?.role === 'staff' && task.status !== 'completed' && (
                  <Button className="w-full" onClick={() => onUpdateStatus(task.id, 'completed')}>
                    <CheckCircle2 className="h-4 w-4" /> Tandakan Selesai
                  </Button>
                )}
                {canApprove && task.status === 'pending' && (
                  <>
                    <Button className="w-full" onClick={() => onUpdateStatus(task.id, 'completed')}>
                      <CheckCircle2 className="h-4 w-4" /> Luluskan
                    </Button>
                    <Button variant="danger" className="w-full" onClick={() => onUpdateStatus(task.id, 'rejected')}>
                      <XCircle className="h-4 w-4" /> Tolak
                    </Button>
                  </>
                )}
                {canApprove && task.status === 'in_progress' && (
                  <Button className="w-full" onClick={() => onUpdateStatus(task.id, 'pending')}>
                    <AlertCircle className="h-4 w-4" /> Tunggu Kelulusan
                  </Button>
                )}
                {task.status === 'completed' && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Tugasan Selesai
                  </div>
                )}
                {task.status === 'rejected' && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium">
                    <XCircle className="h-4 w-4" /> Tugasan Ditolak
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {task.assigned_by_profile && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Ditugaskan Oleh</h3>
                <div className="flex items-center gap-3">
                  <Avatar name={task.assigned_by_profile.full_name} src={task.assigned_by_profile.avatar_url} size="md" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{task.assigned_by_profile.full_name}</p>
                    <p className="text-xs text-neutral-400">{formatDateTime(task.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showSubmit && <SubmitEvidenceModal onClose={() => setShowSubmit(false)} onSubmit={submitEvidence} photoRequired={task.photo_required} remarkRequired={task.remark_required} />}
    </div>
  );
}

function SubmitEvidenceModal({ onClose, onSubmit, photoRequired, remarkRequired }: { onClose: () => void; onSubmit: (photo: string, remark: string) => void; photoRequired: boolean; remarkRequired: boolean }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [remark, setRemark] = useState('');

  return (
    <Modal open={true} onClose={onClose} title="Hantar Bukti">
      <div className="space-y-4">
        {photoRequired && (
          <Input
            label="URL Foto"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
        )}
        <Textarea
          label="Catatan"
          placeholder={remarkRequired ? 'Catatan diperlukan...' : 'Catatan tambahan...'}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={3}
        />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            onClick={() => onSubmit(photoUrl, remark)}
            disabled={photoRequired && !photoUrl}
          >
            Hantar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CreateTaskModal({ onClose, onCreated, branches, departments }: { onClose: () => void; onCreated: () => void; branches: { id: string; name: string }[]; departments: { id: string; name: string }[] }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', department_id: '', branch_id: '',
    priority: 'medium' as TaskPriority, start_date: new Date().toISOString().split('T')[0],
    due_date: '', start_time: '', end_time: '', estimated_duration_minutes: 30,
    repeat_type: 'one_time' as TaskRepeat, photo_required: false, video_required: false,
    remark_required: false, gps_required: false, is_auto_start: false,
  });

  const handleSubmit = async () => {
    if (!profile || !form.title.trim()) { toast('Sila isi tajuk tugasan', 'error'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      department_id: form.department_id || null,
      branch_id: form.branch_id || null,
      assigned_by: profile.id,
      priority: form.priority,
      status: 'pending',
      start_date: form.start_date,
      due_date: form.due_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      estimated_duration_minutes: Number(form.estimated_duration_minutes),
      repeat_type: form.repeat_type,
      photo_required: form.photo_required,
      video_required: form.video_required,
      remark_required: form.remark_required,
      gps_required: form.gps_required,
      is_auto_start: form.is_auto_start,
    }).select('*').single();

    if (error) {
      toast('Gagal mencipta tugasan', 'error');
      setSaving(false);
      return;
    }

    toast('Tugasan berjaya dicipta', 'success');
    setSaving(false);
    onCreated();
  };

  return (
    <Modal open={true} onClose={onClose} title="Tugasan Baru" size="lg">
      <div className="space-y-4">
        <Input label="Tajuk" placeholder="cth. Bersihkan Meja" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea label="Penerangan" placeholder="Penerangan tugasan..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Cawangan" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">Semua Cawangan</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label="Jabatan" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="">Semua Jabatan</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Prioriti" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Ulangan" value={form.repeat_type} onChange={(e) => setForm({ ...form, repeat_type: e.target.value as TaskRepeat })}>
            {Object.entries(REPEAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Tarikh Mula" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <Input label="Tarikh Tamat" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Masa Mula" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <Input label="Masa Tamat" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          <Input label="Anggaran (min)" type="number" value={form.estimated_duration_minutes} onChange={(e) => setForm({ ...form, estimated_duration_minutes: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Keperluan</p>
          <div className="grid grid-cols-2 gap-2">
            <Checkbox label="Foto Diperlukan" checked={form.photo_required} onChange={(v) => setForm({ ...form, photo_required: v })} />
            <Checkbox label="Video Diperlukan" checked={form.video_required} onChange={(v) => setForm({ ...form, video_required: v })} />
            <Checkbox label="Catatan Diperlukan" checked={form.remark_required} onChange={(v) => setForm({ ...form, remark_required: v })} />
            <Checkbox label="GPS Diperlukan" checked={form.gps_required} onChange={(v) => setForm({ ...form, gps_required: v })} />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Cipta Tugasan'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-primary-600" />
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
    </label>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-400">{icon}</span>
      <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{value}</p>
      </div>
    </div>
  );
}
