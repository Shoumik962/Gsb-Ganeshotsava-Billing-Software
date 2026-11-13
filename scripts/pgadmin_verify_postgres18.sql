-- READ ONLY: Use the Query Tool connected specifically to ganeshotsav_dev.
-- Shows all 18 tables required by the application. No table creation or deletion.
SELECT current_database() AS current_database, version() AS postgres_version;

WITH expected(table_name) AS (
    VALUES ('app_users'),('devotees'),('families'),('family_members'),
           ('address_master'),('devotee_addresses'),('family_addresses'),
           ('dedup_rules'),('duplicate_candidates'),('duplicate_decisions'),('merge_audit'),
           ('family_consent_audit'),('sevadars'),('sevadar_locations'),
           ('visit_assignments'),('visit_logs'),('payment_orders'),('receipts')
)
SELECT e.table_name,
       CASE WHEN t.table_name IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END AS status
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_schema='public' AND t.table_name=e.table_name
ORDER BY e.table_name;

-- Run after migrations. Expected single row: 0002_payment_mode
SELECT version_num FROM public.alembic_version;

-- Payment test/live safeguard column must exist (migration 0002).
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='payment_orders' AND column_name='gateway_mode';

-- QA row counts (only run after migrations created the tables).
SELECT 'devotees' AS entity, COUNT(*) AS rows FROM devotees
UNION ALL SELECT 'families', COUNT(*) FROM families
UNION ALL SELECT 'address_master', COUNT(*) FROM address_master
UNION ALL SELECT 'duplicate_candidates', COUNT(*) FROM duplicate_candidates
UNION ALL SELECT 'merge_audit', COUNT(*) FROM merge_audit
UNION ALL SELECT 'sevadars', COUNT(*) FROM sevadars
UNION ALL SELECT 'visit_assignments', COUNT(*) FROM visit_assignments
UNION ALL SELECT 'visit_logs', COUNT(*) FROM visit_logs
UNION ALL SELECT 'payment_orders', COUNT(*) FROM payment_orders
UNION ALL SELECT 'receipts', COUNT(*) FROM receipts;

-- View test-only sample records after running the synthetic E2E QA smoke command:
SELECT devotee_code, first_name, last_name, status, merged_into_id
FROM devotees WHERE first_name LIKE 'QA%' ORDER BY created_at DESC LIMIT 30;
SELECT family_code, name, visit_consent
FROM families WHERE name LIKE 'SYNTHETIC QA FAMILY%' ORDER BY family_code DESC LIMIT 20;
SELECT id, unit, building, verified, latitude, longitude
FROM address_master WHERE building LIKE 'SYNTHETIC TEST ADDRESS%' LIMIT 20;
