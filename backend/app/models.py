"""PostgreSQL identity, address, deduplication, sevadar field visits, and payments models."""
from datetime import datetime, timezone
from uuid import uuid4
import secrets
from sqlalchemy import (Boolean, CheckConstraint, Date, DateTime, Float, ForeignKey,
                        Index, Integer, Numeric, String, Text, UniqueConstraint, JSON)
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

def uid(): return str(uuid4())
def utcnow(): return datetime.now(timezone.utc)
def generate_wad_id():
    # 10-character code: prefix WAD followed by 7 random digits (WADXXXXXXX)
    return f"WAD{secrets.randbelow(9000000) + 1000000}"

class User(Base):
    __tablename__ = 'app_users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # super_admin, admin, sevadar, devotee
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    full_name: Mapped[str | None] = mapped_column(String(200))
    devotee_id: Mapped[str | None] = mapped_column(ForeignKey('devotees.id'))
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Devotee(Base):
    __tablename__ = 'devotees'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    devotee_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, default=generate_wad_id)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), default='', nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(210), index=True, nullable=False)
    date_of_birth: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), index=True)
    email: Mapped[str | None] = mapped_column(String(254), index=True)
    # Government ID, if collected under separate policy, is HMACed before entering this field.
    govt_id_digest: Mapped[str | None] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='active')
    merged_into_id: Mapped[str | None] = mapped_column(ForeignKey('devotees.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Family(Base):
    __tablename__ = 'families'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    family_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, default=lambda: 'FAM-' + uuid4().hex.upper())
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    head_devotee_id: Mapped[str | None] = mapped_column(ForeignKey('devotees.id'))
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    visit_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    visit_consent_source: Mapped[str | None] = mapped_column(String(80))
    visit_consent_ref: Mapped[str | None] = mapped_column(String(200))
    consent_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default='active', nullable=False)

class FamilyConsentAudit(Base):
    __tablename__ = 'family_consent_audit'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    family_id: Mapped[str] = mapped_column(ForeignKey('families.id'), nullable=False)
    consent: Mapped[bool] = mapped_column(Boolean, nullable=False)
    source: Mapped[str] = mapped_column(String(80), nullable=False)
    evidence_ref: Mapped[str] = mapped_column(String(200), nullable=False)
    staff_user_id: Mapped[str] = mapped_column(ForeignKey('app_users.id'), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class FamilyMember(Base):
    __tablename__ = 'family_members'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    family_id: Mapped[str] = mapped_column(ForeignKey('families.id'), nullable=False)
    devotee_id: Mapped[str] = mapped_column(ForeignKey('devotees.id'), nullable=False)
    relationship: Mapped[str] = mapped_column(String(40), default='member', nullable=False)
    is_primary_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (Index('ix_family_member_current', 'family_id', 'devotee_id', 'end_at'),)

class Address(Base):
    __tablename__ = 'address_master'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    canonical_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    unit: Mapped[str] = mapped_column(String(150), default='', nullable=False)
    building: Mapped[str] = mapped_column(String(150), default='', nullable=False)
    street: Mapped[str] = mapped_column(String(200), default='', nullable=False)
    locality: Mapped[str] = mapped_column(String(150), default='', nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    geo_accuracy_m: Mapped[float | None] = mapped_column(Float)
    geo_source: Mapped[str | None] = mapped_column(String(80))
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_by_id: Mapped[str | None] = mapped_column(ForeignKey('app_users.id'))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (Index('ix_address_geo', 'latitude', 'longitude'),)

class DevoteeAddress(Base):
    __tablename__ = 'devotee_addresses'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    devotee_id: Mapped[str] = mapped_column(ForeignKey('devotees.id'), nullable=False)
    address_id: Mapped[str] = mapped_column(ForeignKey('address_master.id'), nullable=False)
    address_type: Mapped[str] = mapped_column(String(25), default='home')
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint('devotee_id', 'address_id', 'address_type', name='uq_devotee_address'),)

class FamilyAddress(Base):
    __tablename__ = 'family_addresses'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    family_id: Mapped[str] = mapped_column(ForeignKey('families.id'), nullable=False)
    address_id: Mapped[str] = mapped_column(ForeignKey('address_master.id'), nullable=False)
    primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint('family_id', 'address_id', name='uq_family_address'),)

class DedupRule(Base):
    __tablename__ = 'dedup_rules'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    threshold_score: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

class DuplicateCandidate(Base):
    __tablename__ = 'duplicate_candidates'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    devotee_a_id: Mapped[str] = mapped_column(ForeignKey('devotees.id'), nullable=False)
    devotee_b_id: Mapped[str] = mapped_column(ForeignKey('devotees.id'), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    reasons: Mapped[list] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default='pending', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    reviewed_by_id: Mapped[str | None] = mapped_column(ForeignKey('app_users.id'))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint('devotee_a_id', 'devotee_b_id', name='uq_duplicate_pair'),)

class DuplicateDecision(Base):
    __tablename__ = 'duplicate_decisions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    candidate_id: Mapped[str] = mapped_column(ForeignKey('duplicate_candidates.id'), nullable=False)
    actor_id: Mapped[str] = mapped_column(ForeignKey('app_users.id'), nullable=False)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    survivor_id: Mapped[str | None] = mapped_column(ForeignKey('devotees.id'))
    happened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class MergeAudit(Base):
    __tablename__ = 'merge_audit'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    candidate_id: Mapped[str] = mapped_column(ForeignKey('duplicate_candidates.id'), nullable=False)
    survivor_id: Mapped[str] = mapped_column(ForeignKey('devotees.id'), nullable=False)
    absorbed_id: Mapped[str] = mapped_column(ForeignKey('devotees.id'), nullable=False)
    actor_id: Mapped[str] = mapped_column(ForeignKey('app_users.id'), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    old_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    happened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Sevadar(Base):
    __tablename__ = 'sevadars'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('app_users.id'), unique=True, nullable=False)
    devotee_id: Mapped[str | None] = mapped_column(ForeignKey('devotees.id'))
    zone: Mapped[str | None] = mapped_column(String(100))
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    location_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

class SevadarLocation(Base):
    __tablename__ = 'sevadar_locations'
    sevadar_id: Mapped[str] = mapped_column(ForeignKey('sevadars.id'), primary_key=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy_m: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class VisitAssignment(Base):
    __tablename__ = 'visit_assignments'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    sevadar_id: Mapped[str] = mapped_column(ForeignKey('sevadars.id'), nullable=False)
    family_id: Mapped[str] = mapped_column(ForeignKey('families.id'), nullable=False)
    address_id: Mapped[str] = mapped_column(ForeignKey('address_master.id'), nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    purpose: Mapped[str] = mapped_column(String(120), default='community visit')
    status: Mapped[str] = mapped_column(String(20), default='assigned', nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (Index('ix_assignment_sevadar', 'sevadar_id', 'status'),)

class VisitLog(Base):
    __tablename__ = 'visit_logs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    assignment_id: Mapped[str] = mapped_column(ForeignKey('visit_assignments.id'), nullable=False)
    outcome: Mapped[str] = mapped_column(String(30), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default='', nullable=False)
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class PaymentOrder(Base):
    __tablename__ = 'payment_orders'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    purpose: Mapped[str] = mapped_column(String(12), nullable=False)
    user_id: Mapped[str | None] = mapped_column(ForeignKey('app_users.id'))
    devotee_id: Mapped[str | None] = mapped_column(ForeignKey('devotees.id'))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254))
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    seva_ids: Mapped[list] = mapped_column(JSON, default=list)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default='pending', nullable=False)
    # Recorded when the order is placed; never infer live/test solely from current env.
    gateway_mode: Mapped[str] = mapped_column(String(12), default='unknown', nullable=False)
    gateway_order_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    gateway_payment_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class Receipt(Base):
    __tablename__ = 'receipts'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_id: Mapped[str] = mapped_column(ForeignKey('payment_orders.id'), unique=True, nullable=False)
    receipt_no: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, default=generate_wad_id)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class SevaMaster(Base):
    __tablename__ = 'seva_master'
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    timing: Mapped[str | None] = mapped_column(String(120))
    note: Mapped[str | None] = mapped_column(String(500))
    except_ekadashi: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey('app_users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    __table_args__ = (CheckConstraint('price > 0', name='ck_seva_price_positive'),)

class SevaBooking(Base):
    __tablename__ = 'seva_bookings'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_id: Mapped[str] = mapped_column(ForeignKey('payment_orders.id'), unique=True, nullable=False)
    user_id: Mapped[str | None] = mapped_column(ForeignKey('app_users.id'))
    devotee_id: Mapped[str | None] = mapped_column(ForeignKey('devotees.id'))
    items_snapshot: Mapped[list] = mapped_column(JSON, nullable=False)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    preferred_date: Mapped[str | None] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default='awaiting_payment', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class WebsiteSetting(Base):
    __tablename__ = 'website_settings'
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_by_id: Mapped[str | None] = mapped_column(ForeignKey('app_users.id'))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class AdminAudit(Base):
    __tablename__ = 'admin_audit'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(ForeignKey('app_users.id'), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(60), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(100), nullable=False)
    before: Mapped[dict | None] = mapped_column(JSON)
    after: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
