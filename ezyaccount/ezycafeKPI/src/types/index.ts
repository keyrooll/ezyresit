export type UserRole = 'admin' | 'manager' | 'supervisor' | 'staff';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'upcoming' | 'pending' | 'in_progress' | 'completed' | 'rejected' | 'overdue';
export type TaskRepeat = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'every_x_hours' | 'custom_days';
export type EmploymentStatus = 'active' | 'inactive' | 'suspended' | 'on_leave' | 'terminated';
export type AnnouncementAudience = 'everyone' | 'branch' | 'department';
export type IncidentType = 'broken_equipment' | 'customer_complaint' | 'accident' | 'food_issue' | 'maintenance';
export type NotificationType = 'task_assigned' | 'task_due' | 'task_overdue' | 'task_rejected' | 'task_approved' | 'kpi_updated' | 'announcement';

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
}

export interface Position {
  id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  is_active: boolean;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_flexible: boolean;
  description: string | null;
  is_active: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  employee_id: string | null;
  role: UserRole;
  branch_id: string | null;
  department_id: string | null;
  position_id: string | null;
  shift_id: string | null;
  supervisor_id: string | null;
  join_date: string | null;
  employment_status: EmploymentStatus;
  awards: number;
  warnings: number;
  created_at: string;
  updated_at: string;
  branch?: Branch;
  department?: Department;
  position?: Position;
  shift?: Shift;
  supervisor?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface Attendance {
  id: string;
  user_id: string;
  branch_id: string | null;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_gps: { lat?: number; lng?: number } | null;
  clock_out_gps: { lat?: number; lng?: number } | null;
  selfie_url: string | null;
  working_hours: number;
  late_minutes: number;
  early_leave_minutes: number;
  ot_minutes: number;
  status: string;
  notes: string | null;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  branch_id: string | null;
  created_by: string | null;
  is_active: boolean;
  items?: TaskTemplateItem[];
}

export interface TaskTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  photo_required: boolean;
  video_required: boolean;
  remark_required: boolean;
  estimated_duration_minutes: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  branch_id: string | null;
  assigned_by: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date: string;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  completion_time: string | null;
  photo_required: boolean;
  video_required: boolean;
  remark_required: boolean;
  gps_required: boolean;
  max_completion_hours: number | null;
  estimated_duration_minutes: number;
  repeat_type: TaskRepeat;
  repeat_days: number[];
  repeat_interval_hours: number | null;
  template_id: string | null;
  is_auto_start: boolean;
  is_active: boolean;
  created_at: string;
  branch?: Branch;
  department?: Department;
  assignments?: TaskAssignment[];
  evidence?: TaskEvidence[];
  assigned_by_profile?: Profile;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  user?: Profile;
}

export interface TaskEvidence {
  id: string;
  task_id: string;
  user_id: string;
  photo_url: string | null;
  video_url: string | null;
  remark: string | null;
  gps_location: { lat?: number; lng?: number } | null;
  submitted_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: Profile;
}

export interface KpiTemplate {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  weight: number;
  is_active: boolean;
}

export interface KpiScore {
  id: string;
  user_id: string;
  kpi_template_id: string;
  scored_by: string;
  score: number;
  remarks: string | null;
  score_month: string;
  created_at: string;
  kpi_template?: KpiTemplate;
  user?: Profile;
}

export interface Performance {
  id: string;
  user_id: string;
  branch_id: string | null;
  department_id: string | null;
  score_month: string;
  task_completion_pct: number;
  attendance_pct: number;
  avg_kpi: number;
  late_pct: number;
  overdue_pct: number;
  customer_rating: number;
  awards: number;
  warnings: number;
  overall_score: number;
  ranking: number | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  audience: AnnouncementAudience;
  branch_id: string | null;
  department_id: string | null;
  image_url: string | null;
  pdf_url: string | null;
  posted_by: string;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  posted_by_profile?: Profile;
  branch?: Branch;
  department?: Department;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  title: string;
  description: string | null;
  type: IncidentType;
  reported_by: string;
  branch_id: string | null;
  department_id: string | null;
  photo_urls: string[];
  priority: TaskPriority;
  status: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  machine_name: string;
  machine_type: string | null;
  description: string | null;
  branch_id: string | null;
  requested_by: string;
  photo_url: string | null;
  priority: TaskPriority;
  assigned_technician: string | null;
  status: string;
  completion_date: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  working_hours_start: string;
  working_hours_end: string;
  late_grace_minutes: number;
  late_threshold_minutes: number;
  theme: string;
  notification_settings: Record<string, boolean>;
  google_login_enabled: boolean;
}
