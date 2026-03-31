-- 003_add_terms_accepted_to_members.sql

ALTER TABLE members
ADD COLUMN terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;
