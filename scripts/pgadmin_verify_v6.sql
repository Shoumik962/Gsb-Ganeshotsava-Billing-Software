-- v6 read-only pgAdmin checks. Select ganeshotsav_dev before running.
SELECT current_database() AS connected_database, version() AS postgres_version;
SELECT version_num AS alembic_revision FROM alembic_version;
SELECT COUNT(*) AS application_table_count
  FROM information_schema.tables
 WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'alembic_version';
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;
SELECT 'devotees' AS entity,COUNT(*) AS records FROM devotees
 UNION ALL SELECT 'users',COUNT(*) FROM app_users
 UNION ALL SELECT 'addresses',COUNT(*) FROM address_master
 UNION ALL SELECT 'families',COUNT(*) FROM families
 UNION ALL SELECT 'family links pending',COUNT(*) FROM family_link_requests WHERE status='pending'
 UNION ALL SELECT 'household benefits',COUNT(*) FROM household_benefits
 UNION ALL SELECT 'verification challenges',COUNT(*) FROM verification_challenges
 UNION ALL SELECT 'receipt SMS deliveries',COUNT(*) FROM receipt_deliveries
 UNION ALL SELECT 'sevas',COUNT(*) FROM seva_master
 UNION ALL SELECT 'bookings',COUNT(*) FROM seva_bookings
 UNION ALL SELECT 'receipts',COUNT(*) FROM receipts;
SELECT d.status AS delivery_status,COUNT(*) FROM receipt_deliveries d GROUP BY d.status ORDER BY d.status;
-- No passwords, OTP digests, addresses or phone numbers are printed by this report.
