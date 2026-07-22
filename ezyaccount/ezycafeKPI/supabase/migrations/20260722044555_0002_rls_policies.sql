/*
# EzyStaff Schema — Part 2: RLS Policies

Adds row-level security policies to all 23 tables. Now that all tables exist,
policies can safely reference profiles and user_branches.
*/

-- BRANCHES
DROP POLICY IF EXISTS "read_branches" ON branches;
CREATE POLICY "read_branches" ON branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_branches" ON branches;
CREATE POLICY "admin_insert_branches" ON branches FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "admin_update_branches" ON branches;
CREATE POLICY "admin_update_branches" ON branches FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- DEPARTMENTS
DROP POLICY IF EXISTS "read_departments" ON departments;
CREATE POLICY "read_departments" ON departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_departments" ON departments;
CREATE POLICY "admin_insert_departments" ON departments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "admin_update_departments" ON departments;
CREATE POLICY "admin_update_departments" ON departments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- POSITIONS
DROP POLICY IF EXISTS "read_positions" ON positions;
CREATE POLICY "read_positions" ON positions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_positions" ON positions;
CREATE POLICY "admin_insert_positions" ON positions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "admin_update_positions" ON positions;
CREATE POLICY "admin_update_positions" ON positions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- SHIFTS
DROP POLICY IF EXISTS "read_shifts" ON shifts;
CREATE POLICY "read_shifts" ON shifts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_shifts" ON shifts;
CREATE POLICY "admin_insert_shifts" ON shifts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "admin_update_shifts" ON shifts;
CREATE POLICY "admin_update_shifts" ON shifts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- PROFILES
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "admin_read_profiles" ON profiles;
CREATE POLICY "admin_read_profiles" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "manager_read_branch_profiles" ON profiles;
CREATE POLICY "manager_read_branch_profiles" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'manager') AND EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = profiles.branch_id));
DROP POLICY IF EXISTS "supervisor_read_dept_profiles" ON profiles;
CREATE POLICY "supervisor_read_dept_profiles" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles sp WHERE sp.id = auth.uid() AND sp.role = 'supervisor' AND sp.department_id = profiles.department_id AND sp.branch_id = profiles.branch_id));
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "admin_insert_profiles" ON profiles;
CREATE POLICY "admin_insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- USER_BRANCHES
DROP POLICY IF EXISTS "read_own_branches" ON user_branches;
CREATE POLICY "read_own_branches" ON user_branches FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "admin_insert_user_branches" ON user_branches;
CREATE POLICY "admin_insert_user_branches" ON user_branches FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "admin_delete_user_branches" ON user_branches;
CREATE POLICY "admin_delete_user_branches" ON user_branches FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ATTENDANCE
DROP POLICY IF EXISTS "read_own_attendance" ON attendance;
CREATE POLICY "read_own_attendance" ON attendance FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admin_read_attendance" ON attendance;
CREATE POLICY "admin_read_attendance" ON attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "manager_read_branch_attendance" ON attendance;
CREATE POLICY "manager_read_branch_attendance" ON attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = attendance.branch_id));
DROP POLICY IF EXISTS "supervisor_read_dept_attendance" ON attendance;
CREATE POLICY "supervisor_read_dept_attendance" ON attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles sp WHERE sp.id = auth.uid() AND sp.role = 'supervisor' AND sp.department_id = (SELECT p.department_id FROM profiles p WHERE p.id = attendance.user_id) AND sp.branch_id = attendance.branch_id));
DROP POLICY IF EXISTS "insert_own_attendance" ON attendance;
CREATE POLICY "insert_own_attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_attendance" ON attendance;
CREATE POLICY "update_own_attendance" ON attendance FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- TASK_TEMPLATES
DROP POLICY IF EXISTS "read_task_templates" ON task_templates;
CREATE POLICY "read_task_templates" ON task_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_task_templates" ON task_templates;
CREATE POLICY "manage_task_templates" ON task_templates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "update_task_templates" ON task_templates;
CREATE POLICY "update_task_templates" ON task_templates FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "delete_task_templates" ON task_templates;
CREATE POLICY "delete_task_templates" ON task_templates FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));

-- TASK_TEMPLATE_ITEMS
DROP POLICY IF EXISTS "read_template_items" ON task_template_items;
CREATE POLICY "read_template_items" ON task_template_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_template_items" ON task_template_items;
CREATE POLICY "manage_template_items" ON task_template_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "update_template_items" ON task_template_items;
CREATE POLICY "update_template_items" ON task_template_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "delete_template_items" ON task_template_items;
CREATE POLICY "delete_template_items" ON task_template_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));

-- TASKS
DROP POLICY IF EXISTS "read_tasks" ON tasks;
CREATE POLICY "read_tasks" ON tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "create_tasks" ON tasks;
CREATE POLICY "create_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager','supervisor')));
DROP POLICY IF EXISTS "update_tasks" ON tasks;
CREATE POLICY "update_tasks" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_tasks" ON tasks;
CREATE POLICY "delete_tasks" ON tasks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));

-- TASK_ASSIGNMENTS
DROP POLICY IF EXISTS "read_task_assignments" ON task_assignments;
CREATE POLICY "read_task_assignments" ON task_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "create_task_assignments" ON task_assignments;
CREATE POLICY "create_task_assignments" ON task_assignments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager','supervisor')));
DROP POLICY IF EXISTS "delete_task_assignments" ON task_assignments;
CREATE POLICY "delete_task_assignments" ON task_assignments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager','supervisor')));

-- TASK_EVIDENCE
DROP POLICY IF EXISTS "read_task_evidence" ON task_evidence;
CREATE POLICY "read_task_evidence" ON task_evidence FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_task_evidence" ON task_evidence;
CREATE POLICY "insert_task_evidence" ON task_evidence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_task_evidence" ON task_evidence;
CREATE POLICY "delete_task_evidence" ON task_evidence FOR DELETE TO authenticated USING (user_id = auth.uid());

-- TASK_COMMENTS
DROP POLICY IF EXISTS "read_task_comments" ON task_comments;
CREATE POLICY "read_task_comments" ON task_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_task_comments" ON task_comments;
CREATE POLICY "insert_task_comments" ON task_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_task_comments" ON task_comments;
CREATE POLICY "delete_own_task_comments" ON task_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- KPI_TEMPLATES
DROP POLICY IF EXISTS "read_kpi_templates" ON kpi_templates;
CREATE POLICY "read_kpi_templates" ON kpi_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_kpi_templates" ON kpi_templates;
CREATE POLICY "manage_kpi_templates" ON kpi_templates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "update_kpi_templates" ON kpi_templates;
CREATE POLICY "update_kpi_templates" ON kpi_templates FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "delete_kpi_templates" ON kpi_templates;
CREATE POLICY "delete_kpi_templates" ON kpi_templates FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));

-- KPI_SCORES
DROP POLICY IF EXISTS "read_kpi_scores" ON kpi_scores;
CREATE POLICY "read_kpi_scores" ON kpi_scores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_kpi_scores" ON kpi_scores;
CREATE POLICY "insert_kpi_scores" ON kpi_scores FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager','supervisor')));
DROP POLICY IF EXISTS "update_kpi_scores" ON kpi_scores;
CREATE POLICY "update_kpi_scores" ON kpi_scores FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager','supervisor')));
DROP POLICY IF EXISTS "delete_kpi_scores" ON kpi_scores;
CREATE POLICY "delete_kpi_scores" ON kpi_scores FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));

-- PERFORMANCE
DROP POLICY IF EXISTS "read_performance" ON performance;
CREATE POLICY "read_performance" ON performance FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_performance" ON performance;
CREATE POLICY "manage_performance" ON performance FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager','supervisor')));
DROP POLICY IF EXISTS "update_performance" ON performance;
CREATE POLICY "update_performance" ON performance FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager','supervisor')));

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "read_announcements" ON announcements;
CREATE POLICY "read_announcements" ON announcements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_announcements" ON announcements;
CREATE POLICY "manage_announcements" ON announcements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "update_announcements" ON announcements;
CREATE POLICY "update_announcements" ON announcements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "delete_announcements" ON announcements;
CREATE POLICY "delete_announcements" ON announcements FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "read_own_notifications" ON notifications;
CREATE POLICY "read_own_notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- INCIDENT_REPORTS
DROP POLICY IF EXISTS "read_incident_reports" ON incident_reports;
CREATE POLICY "read_incident_reports" ON incident_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_incident_reports" ON incident_reports;
CREATE POLICY "insert_incident_reports" ON incident_reports FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());
DROP POLICY IF EXISTS "update_incident_reports" ON incident_reports;
CREATE POLICY "update_incident_reports" ON incident_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- MAINTENANCE_REQUESTS
DROP POLICY IF EXISTS "read_maintenance_requests" ON maintenance_requests;
CREATE POLICY "read_maintenance_requests" ON maintenance_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_maintenance_requests" ON maintenance_requests;
CREATE POLICY "insert_maintenance_requests" ON maintenance_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
DROP POLICY IF EXISTS "update_maintenance_requests" ON maintenance_requests;
CREATE POLICY "update_maintenance_requests" ON maintenance_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- REPORTS
DROP POLICY IF EXISTS "read_reports" ON reports;
CREATE POLICY "read_reports" ON reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "create_reports" ON reports;
CREATE POLICY "create_reports" ON reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));
DROP POLICY IF EXISTS "delete_reports" ON reports;
CREATE POLICY "delete_reports" ON reports FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','manager')));

-- AUDIT_LOGS
DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_read_audit_logs" ON audit_logs;
CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- SETTINGS
DROP POLICY IF EXISTS "read_settings" ON settings;
CREATE POLICY "read_settings" ON settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_update_settings" ON settings;
CREATE POLICY "admin_update_settings" ON settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
