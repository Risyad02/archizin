-- src/database/migrations/0003_custom_field_options_soft_delete.sql
ALTER TABLE custom_field_options ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;