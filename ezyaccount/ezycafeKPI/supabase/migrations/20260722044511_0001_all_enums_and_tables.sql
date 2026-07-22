/*
# EzyStaff Schema — Part 1: All Enums + All Tables (no policies)

Creates all 9 enum types and all 23 tables with RLS enabled but NO policies yet.
Policies are added in Part 2 once all tables exist (some policies reference profiles
which must be created first).
*/

-- ENUMS
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'manager', 'supervisor', 'staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('upcoming', 'pending', 'in_progress', 'completed', 'rejected', 'overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_repeat AS ENUM ('one_time', 'daily', 'weekly', 'monthly', 'every_x_hours', 'custom_days'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employment_status AS ENUM ('active', 'inactive', 'suspended', 'on_leave', 'terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE announcement_audience AS ENUM ('everyone', 'branch', 'department'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE incident_type AS ENUM ('broken_equipment', 'customer_complaint', 'accident', 'food_issue', 'maintenance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_period AS ENUM ('daily', 'weekly', 'monthly', 'yearly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_due', 'task_overdue', 'task_rejected', 'task_approved', 'kpi_updated', 'announcement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TABLES (all created first, no policies yet)
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, code text UNIQUE, address text, phone text, email text, logo_url text, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, code text UNIQUE, description text, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid REFERENCES departments(id) ON DELETE SET NULL, title text NOT NULL, description text, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, start_time time NOT NULL, end_time time NOT NULL, is_flexible boolean DEFAULT false, description text, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email text NOT NULL, full_name text, avatar_url text, phone text, employee_id text UNIQUE,
  role user_role NOT NULL DEFAULT 'staff', branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, department_id uuid REFERENCES departments(id) ON DELETE SET NULL, position_id uuid REFERENCES positions(id) ON DELETE SET NULL, shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL, supervisor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  join_date date, employment_status employment_status NOT NULL DEFAULT 'active', awards integer DEFAULT 0, warnings integer DEFAULT 0, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE, created_at timestamptz DEFAULT now(), UNIQUE(user_id, branch_id)
);
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE, branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, date date NOT NULL,
  clock_in timestamptz, clock_out timestamptz, clock_in_gps jsonb, clock_out_gps jsonb, selfie_url text, working_hours numeric DEFAULT 0, late_minutes integer DEFAULT 0, early_leave_minutes integer DEFAULT 0, ot_minutes integer DEFAULT 0, status text DEFAULT 'present', notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON attendance(branch_id, date);
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, department_id uuid REFERENCES departments(id) ON DELETE SET NULL, branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS task_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE, title text NOT NULL, description text, sort_order integer DEFAULT 0, photo_required boolean DEFAULT false, video_required boolean DEFAULT false, remark_required boolean DEFAULT false, estimated_duration_minutes integer DEFAULT 15, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, department_id uuid REFERENCES departments(id) ON DELETE SET NULL, branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, assigned_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  priority task_priority NOT NULL DEFAULT 'medium', status task_status NOT NULL DEFAULT 'pending', start_date date NOT NULL DEFAULT CURRENT_DATE, due_date date, start_time time, end_time time, completion_time timestamptz,
  photo_required boolean DEFAULT false, video_required boolean DEFAULT false, remark_required boolean DEFAULT false, gps_required boolean DEFAULT false, max_completion_hours numeric, estimated_duration_minutes integer DEFAULT 30,
  repeat_type task_repeat NOT NULL DEFAULT 'one_time', repeat_days integer[] DEFAULT '{}', repeat_interval_hours integer, template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL, is_auto_start boolean DEFAULT false, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_branch_status ON tasks(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_dept_status ON tasks(department_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, assigned_at timestamptz DEFAULT now(), UNIQUE(task_id, user_id)
);
CREATE TABLE IF NOT EXISTS task_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE, photo_url text, video_url text, remark text, gps_location jsonb, submitted_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE, comment text NOT NULL, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kpi_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, department_id uuid REFERENCES departments(id) ON DELETE SET NULL, weight numeric NOT NULL DEFAULT 10 CHECK (weight >= 0 AND weight <= 100), is_active boolean DEFAULT true, created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kpi_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, kpi_template_id uuid NOT NULL REFERENCES kpi_templates(id) ON DELETE CASCADE, scored_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  score integer NOT NULL CHECK (score >= 1 AND score <= 5), remarks text, score_month date NOT NULL DEFAULT date_trunc('month', now())::date, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE(user_id, kpi_template_id, score_month)
);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_user_month ON kpi_scores(user_id, score_month);
CREATE TABLE IF NOT EXISTS performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, department_id uuid REFERENCES departments(id) ON DELETE SET NULL, score_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  task_completion_pct numeric DEFAULT 0, attendance_pct numeric DEFAULT 0, avg_kpi numeric DEFAULT 0, late_pct numeric DEFAULT 0, overdue_pct numeric DEFAULT 0, customer_rating numeric DEFAULT 0, awards integer DEFAULT 0, warnings integer DEFAULT 0, overall_score numeric DEFAULT 0, ranking integer,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE(user_id, score_month)
);
CREATE INDEX IF NOT EXISTS idx_perf_user_month ON performance(user_id, score_month);
CREATE INDEX IF NOT EXISTS idx_perf_branch_month ON performance(branch_id, score_month);
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, body text, audience announcement_audience NOT NULL DEFAULT 'everyone', branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  image_url text, pdf_url text, posted_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL, expiry_date date, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE, type notification_type NOT NULL, title text NOT NULL, body text, link text, is_read boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read);
CREATE TABLE IF NOT EXISTS incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, type incident_type NOT NULL DEFAULT 'maintenance', reported_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, department_id uuid REFERENCES departments(id) ON DELETE SET NULL, photo_urls text[] DEFAULT '{}', priority task_priority NOT NULL DEFAULT 'medium', status text NOT NULL DEFAULT 'pending', resolved_at timestamptz, resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL, resolution_notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), machine_name text NOT NULL, machine_type text, description text, branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url text, priority task_priority NOT NULL DEFAULT 'medium', assigned_technician uuid REFERENCES profiles(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'pending', completion_date date, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, report_type report_period NOT NULL DEFAULT 'daily', branch_id uuid REFERENCES branches(id) ON DELETE SET NULL, department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  data jsonb, file_url text, generated_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL, period_start date, period_end date, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL, action text NOT NULL, table_name text NOT NULL, record_id uuid, before_data jsonb, after_data jsonb, ip_address text, created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_name text NOT NULL DEFAULT 'EzyStaff', company_logo_url text, working_hours_start time DEFAULT '08:00', working_hours_end time DEFAULT '17:00',
  late_grace_minutes integer DEFAULT 10, late_threshold_minutes integer DEFAULT 15, theme text DEFAULT 'light', notification_settings jsonb DEFAULT '{}', google_login_enabled boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- Enable RLS on ALL tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
