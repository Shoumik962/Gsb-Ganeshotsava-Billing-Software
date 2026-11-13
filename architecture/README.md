# ER diagram vs implemented models

`Devotee_Family_Address_Sevadar_ER_Blueprint.png` is the original conceptual ER figure from the planning discussion. It shows core identity, shared household addresses, duplicate review, and GPS-based sevadar visits.

The code implements the core idea with named SQLAlchemy tables in `backend/app/models.py`. Some diagram names are intentionally adapted:
- `DEVOTEE` -> `devotees`; `FAMILY` -> `families`; `FAMILY_MEMBER` -> `family_members`
- `ADDRESS_MASTER` -> `address_master`; `DEVOTEE_ADDRESS` -> `devotee_addresses`; `FAMILY_ADDRESS` -> `family_addresses`
- `DEDUP_RULE` -> `dedup_rules`; `DUPLICATE_CANDIDATE` -> `duplicate_candidates`; `MERGE_REVIEW` -> `duplicate_decisions`; `MERGE_AUDIT` -> `merge_audit`
- `SEVADAR` -> `sevadars`; `SEVADAR_LIVE_LOCATION` -> `sevadar_locations`; `NEARBY_DEVOTEE_ASSIGNMENT` -> `visit_assignments`; `VISIT_LOG` -> `visit_logs`
- `DONATION`/`SEVA_BOOKING`/`RECEIPT` -> `payment_orders` (purpose + seva IDs) and `receipts`; these support public payment proof, not full finance/pooja workflows yet

Unlike the conceptual image, the working visit discovery is **one result per consented family + verified address**, so a sevadar is not assigned a separate visit for every member of the same house. See full implementation/limitations in `../docs/API_AND_HANDOVER.md`.
