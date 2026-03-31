-- 002_add_2fa_to_users.sql

ALTER TABLE users 
ADD COLUMN is_2fa_enabled BOOLEAN DEFAULT FALSE;
