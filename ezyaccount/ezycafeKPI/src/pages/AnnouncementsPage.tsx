import { useEffect, useState, useMemo } from 'react';
import { Megaphone, Plus, Calendar, Image, FileText, Trash2 } from 'lucide-react';
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
import { timeAgo } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Announcement, AnnouncementAudience, Profile } from '@/types';

export function AnnouncementsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { branches, departments } = useReferenceData();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => { fetchAnnouncements(); }, [profile]);

  const fetchAnnouncements = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('announcements')
      .select('*, posted_by_profile:profiles!posted_by(full_name, avatar_url, role), branch:branches(name), department:departments(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);
    setAnnouncements((data as unknown as Announcement[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').update({ is_active: false }).eq('id', id);
    if (error) { toast('Gagal memadam', 'error'); return; }
    toast('Pengumuman dipadam', 'success');
    fetchAnnouncements();
  };

  const audienceLabel = (aud: AnnouncementAudience, branchName?: string, deptName?: string) => {
    if (aud === 'everyone') return 'Semua';
    if (aud === 'branch') return `Cawangan: ${branchName || '-'}`;
    return `Jabatan: ${deptName || '-'}`;
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Pengumuman</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{announcements.length} pengumuman aktif</p>
        </div>
        {canCreate && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Pengumuman Baru</Button>}
      </div>

      {announcements.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-7 w-7" />} title="Tiada pengumuman" description="Pengumuman akan dipaparkan di sini." action={canCreate ? <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Buat Pengumuman</Button> : undefined} />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const author = ann.posted_by_profile as unknown as Profile | undefined;
            return (
              <Card key={ann.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={author?.full_name} src={author?.avatar_url} size="md" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{author?.full_name || 'Sistem'}</p>
                        <p className="text-xs text-neutral-400">{timeAgo(ann.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">{audienceLabel(ann.audience, ann.branch?.name || undefined, ann.department?.name || undefined)}</Badge>
                      {canCreate && ann.posted_by === profile?.id && (
                        <button onClick={() => handleDelete(ann.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">{ann.title}</h3>
                  {ann.body && <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{ann.body}</p>}
                  <div className="flex items-center gap-3 mt-4">
                    {ann.image_url && <a href={ann.image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"><Image className="h-3.5 w-3.5" /> Lampiran Gambar</a>}
                    {ann.pdf_url && <a href={ann.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"><FileText className="h-3.5 w-3.5" /> Lampiran PDF</a>}
                    {ann.expiry_date && <span className="flex items-center gap-1 text-xs text-neutral-400"><Calendar className="h-3.5 w-3.5" /> Tamat: {ann.expiry_date}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showCreate && <CreateAnnouncementModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchAnnouncements(); }} branches={branches} departments={departments} />}
    </div>
  );
}

function CreateAnnouncementModal({ onClose, onSaved, branches, departments }: { onClose: () => void; onSaved: () => void; branches: { id: string; name: string }[]; departments: { id: string; name: string }[] }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', audience: 'everyone' as AnnouncementAudience,
    branch_id: '', department_id: '', image_url: '', pdf_url: '', expiry_date: '',
  });

  const handleSubmit = async () => {
    if (!profile || !form.title.trim()) { toast('Sila isi tajuk', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('announcements').insert({
      title: form.title, body: form.body || null, audience: form.audience,
      branch_id: form.audience === 'branch' ? form.branch_id : null,
      department_id: form.audience === 'department' ? form.department_id : null,
      image_url: form.image_url || null, pdf_url: form.pdf_url || null,
      posted_by: profile.id, expiry_date: form.expiry_date || null,
    });
    if (error) { toast('Gagal mencipta pengumuman', 'error'); setSaving(false); return; }
    toast('Pengumuman berjaya dicipta', 'success');
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Pengumuman Baru" size="lg">
      <div className="space-y-4">
        <Input label="Tajuk" placeholder="cth. Meeting Bulanan" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea label="Mesej" placeholder="Tulis pengumuman..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
        <Select label="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as AnnouncementAudience })}>
          <option value="everyone">Semua Kakitangan</option>
          <option value="branch">Cawangan Tertentu</option>
          <option value="department">Jabatan Tertentu</option>
        </Select>
        {form.audience === 'branch' && (
          <Select label="Cawangan" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">Pilih cawangan...</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
        {form.audience === 'department' && (
          <Select label="Jabatan" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="">Pilih jabatan...</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="URL Gambar (opsyenal)" placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <Input label="URL PDF (opsyenal)" placeholder="https://..." value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} />
        </div>
        <Input label="Tarikh Tamat (opsyenal)" type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Hantar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
