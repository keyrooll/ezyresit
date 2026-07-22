import type { TaskPriority, TaskStatus, UserRole, TaskRepeat } from '@/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Pengurus',
  supervisor: 'Penyelia',
  staff: 'Kakitangan',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  supervisor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  staff: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Rendah',
  medium: 'Sederhana',
  high: 'Tinggi',
  critical: 'Kritikal',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  upcoming: 'Akan Datang',
  pending: 'Menunggu',
  in_progress: 'Sedang Berjalan',
  completed: 'Selesai',
  rejected: 'Ditolak',
  overdue: 'Tertunggak',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  upcoming: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const REPEAT_LABELS: Record<TaskRepeat, string> = {
  one_time: 'Sekali',
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  every_x_hours: 'Setiap X Jam',
  custom_days: 'Hari Custom',
};

export const DAY_LABELS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
export const DAY_LABELS_SHORT = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  broken_equipment: 'Peralatan Rosak',
  customer_complaint: 'Aduan Pelanggan',
  accident: 'Kemalangan',
  food_issue: 'Isu Makanan',
  maintenance: 'Penyelenggaraan',
};

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Tidak Aktif',
  suspended: 'Digantung',
  on_leave: 'Cuti',
  terminated: 'Diberhentikan',
};

export function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} minit yang lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari yang lalu`;
}
