-- Read-only verification for PostgreSQL 18 / ganeshotsav_dev (apply migrations first).
SELECT current_database() AS database, current_user AS connected_as;
SELECT version_num AS alembic_version FROM alembic_version;
-- Expect 22 application tables + alembic_version = 23 user tables.
SELECT COUNT(*) FILTER(WHERE table_name <> 'alembic_version') AS application_table_count
FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY table_name;
-- Admin-managed catalogue
SELECT id,name,category,price,active FROM seva_master ORDER BY created_at DESC LIMIT 40;
-- User signup count / staff roles
SELECT role, COUNT(*) AS users FROM app_users GROUP BY role ORDER BY role;
-- Seva booking + generated receipts (no private contact details)
SELECT b.id AS booking_id,b.status,b.amount_paise / 100.0 AS amount_rupees,
       p.gateway_mode,p.status AS payment_status,r.receipt_no,b.created_at
FROM seva_bookings b
JOIN payment_orders p ON p.id=b.order_id
LEFT JOIN receipts r ON r.order_id=p.id
ORDER BY b.created_at DESC LIMIT 30;
-- Controlled duplicate-candidate reviews
SELECT status,COUNT(*) AS candidates FROM duplicate_candidates GROUP BY status;
-- Historical prices are frozen as booking snapshots
SELECT id,items_snapshot FROM seva_bookings ORDER BY created_at DESC LIMIT 10;
