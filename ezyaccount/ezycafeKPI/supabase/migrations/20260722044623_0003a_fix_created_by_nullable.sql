/*
# Fix: Make created_by columns nullable for seed data
When seeding before any users exist, created_by must be nullable.
*/
ALTER TABLE kpi_templates ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE task_templates ALTER COLUMN created_by DROP NOT NULL;
