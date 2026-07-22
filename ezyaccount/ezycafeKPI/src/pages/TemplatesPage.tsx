import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Trash2, CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TaskTemplate, TaskTemplateItem } from '@/types';

export function TemplatesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<TaskTemplate | null>(null);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('task_templates').select('*, items:task_template_items(*)').order('name');
    setTemplates((data as unknown as TaskTemplate[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('task_templates').delete().eq('id', id);
    if (error) { toast('Gagal memadam', 'error'); return; }
    toast('Templat dipadam', 'success');
    fetchTemplates();
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Templat Tugasan</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{templates.length} templat</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Templat Baru</Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="Tiada templat" description="Templat tugasan boleh digunakan semula untuk mencipta tugasan dengan cepat." action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Buat Templat</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelected(tpl)}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{tpl.name}</h3>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }} className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {tpl.description && <p className="text-xs text-neutral-500 mb-3">{tpl.description}</p>}
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"><CheckSquare className="h-3 w-3" /> {tpl.items?.length || 0} tugasan</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateTemplateModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchTemplates(); }} />}
      {selected && <TemplateDetailModal template={selected} onClose={() => setSelected(null)} onSaved={fetchTemplates} />}
    </div>
  );
}

function CreateTemplateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast('Sila isi nama', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('task_templates').insert({ name: form.name, description: form.description || null });
    if (error) { toast('Gagal mencipta templat', 'error'); setSaving(false); return; }
    toast('Templat berjaya dicipta', 'success');
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Templat Baru">
      <div className="space-y-4">
        <Input label="Nama Templat" placeholder="cth. Opening Floor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea label="Penerangan" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Cipta'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function TemplateDetailModal({ template, onClose, onSaved }: { template: TaskTemplate; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState<TaskTemplateItem[]>(template.items || []);
  const [newItem, setNewItem] = useState({ title: '', estimated_duration_minutes: 15 });

  const handleAddItem = async () => {
    if (!newItem.title.trim()) { toast('Sila isi tajuk', 'error'); return; }
    const { data, error } = await supabase.from('task_template_items').insert({
      template_id: template.id, title: newItem.title, sort_order: items.length + 1,
      estimated_duration_minutes: Number(newItem.estimated_duration_minutes),
    }).select('*').single();
    if (error) { toast('Gagal menambah item', 'error'); return; }
    setItems([...items, data as TaskTemplateItem]);
    setNewItem({ title: '', estimated_duration_minutes: 15 });
    toast('Item ditambah', 'success');
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from('task_template_items').delete().eq('id', id);
    if (error) { toast('Gagal memadam', 'error'); return; }
    setItems(items.filter((i) => i.id !== id));
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title={template.name} size="lg">
      <div className="space-y-4">
        {template.description && <p className="text-sm text-neutral-500">{template.description}</p>}

        {/* Items list */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">Tiada item dalam templat ini</p>
          ) : (
            items.sort((a, b) => a.sort_order - b.sort_order).map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                <span className="h-6 w-6 rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
                  <p className="text-xs text-neutral-400">~{item.estimated_duration_minutes} minit</p>
                </div>
                <button onClick={() => handleDeleteItem(item.id)} className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))
          )}
        </div>

        {/* Add item */}
        <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Input placeholder="Tajuk item..." value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} className="flex-1" />
          <Input type="number" placeholder="Minit" value={newItem.estimated_duration_minutes} onChange={(e) => setNewItem({ ...newItem, estimated_duration_minutes: Number(e.target.value) })} className="w-24" />
          <Button onClick={handleAddItem}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </Modal>
  );
}
