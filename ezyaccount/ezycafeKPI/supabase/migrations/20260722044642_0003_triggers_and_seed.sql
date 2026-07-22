/*
# EzyStaff Schema — Part 3: Triggers + Seed Data

1. Auto-create profile on auth signup
2. updated_at triggers
3. Seed: 6 branches, 11 departments, 3 shifts, 6 positions, 10 KPI templates, 3 task templates with items, default settings
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN CREATE TRIGGER set_updated_at_branches BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_departments BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_attendance BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_kpi_templates BEFORE UPDATE ON kpi_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_kpi_scores BEFORE UPDATE ON kpi_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_performance BEFORE UPDATE ON performance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_announcements BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_incidents BEFORE UPDATE ON incident_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_maintenance BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER set_updated_at_settings BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SEED
INSERT INTO settings (company_name) VALUES ('EzyStaff') ON CONFLICT DO NOTHING;

INSERT INTO branches (name, code, address) VALUES
  ('Batu Caves', 'BC', 'Jalan Batu Caves, Selangor'),
  ('Bangi', 'BGI', 'Bangi, Selangor'),
  ('Putrajaya', 'PJY', 'Presint 3, Putrajaya'),
  ('Shah Alam', 'SA', 'Seksyen 7, Shah Alam'),
  ('Damansara', 'DM', 'Damansara Utama, Selangor'),
  ('Cyberjaya', 'CJ', 'Cyberjaya, Selangor')
ON CONFLICT (code) DO NOTHING;

INSERT INTO departments (name, code, description) VALUES
  ('Floor', 'FLR', 'Front of house operations'),
  ('Kitchen', 'KIT', 'Food preparation and cooking'),
  ('Cashier', 'CSH', 'Payment and POS operations'),
  ('Steward', 'STW', 'Cleaning and dishwashing'),
  ('Marketing', 'MKT', 'Promotions and marketing'),
  ('HR', 'HRR', 'Human resources'),
  ('Maintenance', 'MNT', 'Equipment and facility maintenance'),
  ('Warehouse', 'WRH', 'Storage and logistics'),
  ('Inventory', 'INV', 'Stock management'),
  ('Accounts', 'ACC', 'Finance and accounting'),
  ('Purchasing', 'PRC', 'Procurement')
ON CONFLICT (code) DO NOTHING;

INSERT INTO shifts (name, start_time, end_time, description) VALUES
  ('Morning', '08:00', '16:00', 'Morning shift 8AM-4PM'),
  ('Evening', '16:00', '23:59', 'Evening shift 4PM-12AM'),
  ('Night', '00:00', '08:00', 'Night shift 12AM-8AM')
ON CONFLICT DO NOTHING;

INSERT INTO positions (department_id, title) VALUES
  ((SELECT id FROM departments WHERE code='FLR'), 'Waiter'),
  ((SELECT id FROM departments WHERE code='FLR'), 'Host'),
  ((SELECT id FROM departments WHERE code='KIT'), 'Chef'),
  ((SELECT id FROM departments WHERE code='KIT'), 'Cook'),
  ((SELECT id FROM departments WHERE code='CSH'), 'Cashier'),
  ((SELECT id FROM departments WHERE code='STW'), 'Steward')
ON CONFLICT DO NOTHING;

INSERT INTO kpi_templates (name, description, weight) VALUES
  ('Uniform', 'Proper uniform and grooming', 10),
  ('Customer Service', 'Quality of customer interaction', 15),
  ('Cleanliness', 'Workspace cleanliness standards', 10),
  ('Speed', 'Task completion speed', 10),
  ('Attendance', 'Punctuality and attendance', 10),
  ('Initiative', 'Proactive problem solving', 10),
  ('Teamwork', 'Collaboration with colleagues', 10),
  ('Discipline', 'Adherence to rules and procedures', 10),
  ('Knowledge', 'Product and process knowledge', 10),
  ('Communication', 'Clear and effective communication', 5)
ON CONFLICT DO NOTHING;

INSERT INTO task_templates (name, description) VALUES
  ('Opening Floor', 'Morning floor opening checklist'),
  ('Opening Kitchen', 'Morning kitchen opening checklist'),
  ('Opening Cashier', 'Morning cashier opening checklist')
ON CONFLICT DO NOTHING;

INSERT INTO task_template_items (template_id, title, sort_order, estimated_duration_minutes) VALUES
  ((SELECT id FROM task_templates WHERE name='Opening Floor'), 'Switch Lights', 1, 5),
  ((SELECT id FROM task_templates WHERE name='Opening Floor'), 'Arrange Chairs', 2, 10),
  ((SELECT id FROM task_templates WHERE name='Opening Floor'), 'Clean Tables', 3, 15),
  ((SELECT id FROM task_templates WHERE name='Opening Floor'), 'Prepare Tissue', 4, 5),
  ((SELECT id FROM task_templates WHERE name='Opening Floor'), 'Open Music', 5, 2),
  ((SELECT id FROM task_templates WHERE name='Opening Floor'), 'Check Toilet', 6, 10),
  ((SELECT id FROM task_templates WHERE name='Opening Kitchen'), 'Check Ingredients', 1, 15),
  ((SELECT id FROM task_templates WHERE name='Opening Kitchen'), 'Prepare Sauce', 2, 20),
  ((SELECT id FROM task_templates WHERE name='Opening Kitchen'), 'Prepare Rice', 3, 30),
  ((SELECT id FROM task_templates WHERE name='Opening Kitchen'), 'Check Freezer', 4, 10),
  ((SELECT id FROM task_templates WHERE name='Opening Cashier'), 'Count Float Money', 1, 10),
  ((SELECT id FROM task_templates WHERE name='Opening Cashier'), 'POS Check', 2, 15),
  ((SELECT id FROM task_templates WHERE name='Opening Cashier'), 'Receipt Roll', 3, 5)
ON CONFLICT DO NOTHING;
